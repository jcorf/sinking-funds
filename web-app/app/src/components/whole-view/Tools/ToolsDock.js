import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Calculator as CalculatorIcon, Check, Copy, Delete, NotebookPen, X } from 'lucide-react';
import { getNotes, updateNotes } from '../../utils/api';
import './ToolsDock.css';

/* ---------------------------------------------------------------------------
   Calculator: immediate-execution arithmetic (like a phone calculator) with a
   tape of recent results. Pure state machine; never eval(). Nothing is saved.
   --------------------------------------------------------------------------- */

const OPS = {
    '+': (a, b) => a + b,
    '−': (a, b) => a - b,
    '×': (a, b) => a * b,
    '÷': (a, b) => (b === 0 ? NaN : a / b),
};

// Trim float noise (0.1 + 0.2 = 0.30000000000000004 -> 0.3).
const clean = (n) => (Number.isFinite(n) ? Number(n.toPrecision(12)) : NaN);

const fmt = (n) =>
    Number.isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: 10 }) : 'Error';

const fmtMoney = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Shows an in-progress entry with thousands separators, keeping what was typed
// after the decimal point (so "12." and "12.50" display as typed).
function fmtEntry(entry) {
    if (entry === 'Error') return entry;
    const negative = entry.startsWith('-');
    const [int, dec] = entry.replace('-', '').split('.');
    const grouped = Number(int || 0).toLocaleString('en-US');
    return `${negative ? '-' : ''}${grouped}${dec !== undefined ? `.${dec}` : ''}`;
}

// accText: the first operand as displayed (keeps "279.10" rather than "279.1")
export const initialCalc = { entry: '0', acc: null, accText: null, op: null, fresh: true, tape: [] };

export function calcReducer(state, action) {
    const errored = state.entry === 'Error';
    const s = errored && action.type !== 'clear' ? { ...initialCalc, tape: state.tape } : state;

    switch (action.type) {
        case 'digit': {
            const d = action.value;
            if (s.fresh) return { ...s, entry: d === '.' ? '0.' : d, fresh: false };
            if (d === '.' && s.entry.includes('.')) return s;
            if (s.entry.replace(/[-.]/g, '').length >= 15) return s;
            const entry = s.entry === '0' && d !== '.' ? d : s.entry === '-0' && d !== '.' ? `-${d}` : s.entry + d;
            return { ...s, entry };
        }
        case 'op': {
            const b = Number(s.entry);
            if (s.op && s.acc !== null && !s.fresh) {
                const r = clean(OPS[s.op](s.acc, b));
                if (!Number.isFinite(r)) return { ...s, entry: 'Error', acc: null, op: null, fresh: true };
                return { ...s, acc: r, accText: fmt(r), entry: String(r), op: action.value, fresh: true };
            }
            if (s.acc !== null && s.fresh && s.op) return { ...s, op: action.value };
            return { ...s, acc: b, accText: fmtEntry(s.entry), op: action.value, fresh: true };
        }
        case 'equals': {
            if (!s.op || s.acc === null) return s;
            const b = Number(s.entry);
            const r = clean(OPS[s.op](s.acc, b));
            // Money-like: an operand had cents, and the result fits in cents.
            // Show it as money ("279.10"), not "279.1".
            const moneyLike =
                (s.entry.includes('.') || String(s.acc).includes('.')) && Number.isFinite(r) && clean(r * 100) % 1 === 0;
            const shown = moneyLike ? fmtMoney(r) : fmt(r);
            const line = `${s.accText || fmt(s.acc)} ${s.op} ${fmtEntry(s.entry)} = ${shown}`;
            const tape = [...s.tape, line].slice(-8);
            if (!Number.isFinite(r)) return { ...initialCalc, entry: 'Error', tape };
            return { ...initialCalc, entry: moneyLike ? r.toFixed(2) : String(r), tape };
        }
        case 'percent': {
            const b = Number(s.entry);
            // With + or −, "200 + 10 %" means 10% of 200 (like a desk calculator).
            const pct = s.op && s.acc !== null && (s.op === '+' || s.op === '−') ? (s.acc * b) / 100 : b / 100;
            return { ...s, entry: String(clean(pct)), fresh: false };
        }
        case 'negate':
            if (s.entry === '0') return s;
            return { ...s, entry: s.entry.startsWith('-') ? s.entry.slice(1) : `-${s.entry}`, fresh: false };
        case 'backspace': {
            if (s.fresh) return s;
            const entry = s.entry.slice(0, -1);
            return { ...s, entry: entry === '' || entry === '-' ? '0' : entry };
        }
        case 'clear':
            return { ...initialCalc, tape: state.tape };
        case 'clearTape':
            return { ...s, tape: [] };
        default:
            return s;
    }
}

const KEYS = [
    ['C', 'clear'], ['⌫', 'backspace'], ['%', 'percent'], ['÷', 'op'],
    ['7', 'digit'], ['8', 'digit'], ['9', 'digit'], ['×', 'op'],
    ['4', 'digit'], ['5', 'digit'], ['6', 'digit'], ['−', 'op'],
    ['1', 'digit'], ['2', 'digit'], ['3', 'digit'], ['+', 'op'],
    ['±', 'negate'], ['0', 'digit'], ['.', 'digit'], ['=', 'equals'],
];

const KEY_LABELS = { '⌫': 'Backspace', '±': 'Plus or minus', 'C': 'Clear', '÷': 'Divide', '×': 'Multiply', '−': 'Subtract', '+': 'Add', '=': 'Equals', '%': 'Percent' };

function CalculatorPanel({ onClose }) {
    const [state, dispatch] = useReducer(calcReducer, initialCalc);
    const [copied, setCopied] = useState(false);
    const panelRef = useRef(null);

    useEffect(() => {
        panelRef.current && panelRef.current.focus();
    }, []);

    const press = (label, type) => {
        setCopied(false);
        dispatch({ type, value: label });
    };

    const onKeyDown = (e) => {
        const k = e.key;
        let handled = true;
        if (/^[0-9]$/.test(k) || k === '.') press(k, 'digit');
        else if (k === '+') press('+', 'op');
        else if (k === '-') press('−', 'op');
        else if (k === '*' || k === 'x' || k === 'X') press('×', 'op');
        else if (k === '/') press('÷', 'op');
        else if (k === 'Enter' || k === '=') press('=', 'equals');
        else if (k === '%') press('%', 'percent');
        else if (k === 'Backspace') press('⌫', 'backspace');
        else if (k === 'c' || k === 'C' || k === 'Delete') press('C', 'clear');
        else if (k === 'Escape') onClose();
        else handled = false;
        if (handled) e.preventDefault();
    };

    const copy = async () => {
        const text = state.entry === 'Error' ? '' : state.entry;
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    };

    return (
        <div
            className="td-panel td-calc"
            role="dialog"
            aria-label="Calculator"
            tabIndex={-1}
            ref={panelRef}
            onKeyDown={onKeyDown}
        >
            <header className="td-panel-header">
                <h2>Calculator</h2>
                <button type="button" className="td-icon-button" onClick={onClose} aria-label="Close calculator">
                    <X size={16} aria-hidden="true" />
                </button>
            </header>

            {state.tape.length > 0 && (
                <ol className="td-tape" aria-label="Recent calculations">
                    {state.tape.map((line, i) => (
                        <li key={i}>{line}</li>
                    ))}
                </ol>
            )}

            <div className="td-display" aria-live="polite">
                <div className="td-display-pending">
                    {state.op && state.acc !== null ? `${state.accText || fmt(state.acc)} ${state.op}` : ' '}
                </div>
                <div className="td-display-entry">{fmtEntry(state.entry)}</div>
            </div>

            <div className="td-display-actions">
                <button type="button" className="td-text-button" onClick={copy} disabled={state.entry === 'Error'}>
                    {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                    {copied ? 'Copied' : 'Copy result'}
                </button>
                {state.tape.length > 0 && (
                    <button type="button" className="td-text-button" onClick={() => press('', 'clearTape')}>
                        Clear tape
                    </button>
                )}
            </div>

            <div className="td-keys">
                {KEYS.map(([label, type]) => (
                    <button
                        key={label}
                        type="button"
                        className={`td-key td-key-${type} ${state.op === label && state.fresh ? 'is-active' : ''}`}
                        onClick={() => press(label, type)}
                        aria-label={KEY_LABELS[label] || label}
                    >
                        {label === '⌫' ? <Delete size={16} aria-hidden="true" /> : label}
                    </button>
                ))}
            </div>
        </div>
    );
}

/* ---------------------------------------------------------------------------
   Notes: one scratch notepad stored in the app's database, autosaved.
   --------------------------------------------------------------------------- */

const SAVE_DELAY_MS = 700;

function NotesPanel({ onClose }) {
    const [body, setBody] = useState('');
    const [loaded, setLoaded] = useState(false);
    const [status, setStatus] = useState({ kind: 'idle' });
    const timer = useRef(null);
    const pending = useRef(null);
    const textRef = useRef(null);

    useEffect(() => {
        let alive = true;
        getNotes()
            .then((data) => {
                if (!alive) return;
                setBody(data.body || '');
                setLoaded(true);
                setStatus(data.last_updated ? { kind: 'saved', at: data.last_updated } : { kind: 'idle' });
                setTimeout(() => textRef.current && textRef.current.focus(), 0);
            })
            .catch(() => alive && setStatus({ kind: 'loadError' }));
        return () => {
            alive = false;
        };
    }, []);

    const save = useCallback(async (text, attempt = 1) => {
        setStatus({ kind: 'saving' });
        const ok = await updateNotes(text);
        if (ok) {
            pending.current = null;
            setStatus({ kind: 'saved', at: new Date().toISOString() });
        } else if (attempt < 3) {
            setStatus({ kind: 'retrying' });
            timer.current = setTimeout(() => save(text, attempt + 1), 3000);
        } else {
            setStatus({ kind: 'error' });
        }
    }, []);

    // Flush any unsaved text when the panel closes.
    useEffect(
        () => () => {
            clearTimeout(timer.current);
            if (pending.current !== null) updateNotes(pending.current);
        },
        []
    );

    const onChange = (e) => {
        const text = e.target.value;
        setBody(text);
        pending.current = text;
        clearTimeout(timer.current);
        timer.current = setTimeout(() => save(text), SAVE_DELAY_MS);
    };

    const statusText = {
        idle: '',
        saving: 'Saving…',
        retrying: "Couldn't save, retrying…",
        error: "Couldn't save. Check that the app's backend is running.",
        loadError: "Couldn't load your notes.",
        saved: status.at
            ? `Saved ${new Date(status.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
            : 'Saved',
    }[status.kind];

    return (
        <div
            className="td-panel td-notes"
            role="dialog"
            aria-label="Notes"
            onKeyDown={(e) => e.key === 'Escape' && onClose()}
        >
            <header className="td-panel-header">
                <h2>Notes</h2>
                <button type="button" className="td-icon-button" onClick={onClose} aria-label="Close notes">
                    <X size={16} aria-hidden="true" />
                </button>
            </header>
            <textarea
                ref={textRef}
                className="td-notes-text"
                aria-label="Notes"
                placeholder={loaded ? 'Jot something down…' : 'Loading…'}
                value={body}
                onChange={onChange}
                disabled={!loaded}
            />
            <p className={`td-notes-status ${status.kind === 'error' || status.kind === 'loadError' ? 'is-error' : ''}`} aria-live="polite">
                {statusText}
            </p>
        </div>
    );
}

/* ---------------------------------------------------------------------------
   The dock: two buttons pinned bottom-left, one panel open at a time.
   --------------------------------------------------------------------------- */

export default function ToolsDock() {
    // Each panel opens independently, so the calculator and notes can be
    // open side by side.
    const [open, setOpen] = useState({ calc: false, notes: false });
    const toggle = (which) => setOpen((cur) => ({ ...cur, [which]: !cur[which] }));
    const close = (which) => () => setOpen((cur) => ({ ...cur, [which]: false }));

    return (
        <div className="td-dock">
            {(open.calc || open.notes) && (
                <div className="td-panels">
                    {open.calc && <CalculatorPanel onClose={close('calc')} />}
                    {open.notes && <NotesPanel onClose={close('notes')} />}
                </div>
            )}
            <div className="td-buttons">
                <button
                    type="button"
                    className={`td-dock-button ${open.calc ? 'is-open' : ''}`}
                    onClick={() => toggle('calc')}
                    aria-expanded={open.calc}
                    aria-label="Calculator"
                    title="Calculator"
                >
                    <CalculatorIcon size={20} strokeWidth={1.75} aria-hidden="true" />
                </button>
                <button
                    type="button"
                    className={`td-dock-button ${open.notes ? 'is-open' : ''}`}
                    onClick={() => toggle('notes')}
                    aria-expanded={open.notes}
                    aria-label="Notes"
                    title="Notes"
                >
                    <NotebookPen size={20} strokeWidth={1.75} aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}
