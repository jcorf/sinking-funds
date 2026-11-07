import React, { useEffect, useRef, useState } from 'react';
import { GOAL_ICONS, resolveIcon } from './goalIcons';
import './GoalParts.css';

export const parseMoney = (value) => {
    const cleaned = String(value ?? '').replace(/[$,\s]/g, '');
    if (cleaned === '' || cleaned === '.') return 0;
    const parsed = parseFloat(cleaned.endsWith('.') ? cleaned.slice(0, -1) : cleaned);
    return isNaN(parsed) ? 0 : Math.max(0, Math.round(parsed * 100) / 100);
};

// The goal's icon in a soft sage tile. `.sf-icon` jiggles on row hover.
export function GoalIcon({ icon, small = false, large = false }) {
    const { Icon } = icon;
    return (
        <span className={`sf-icon ${small ? 'sf-icon-small' : ''} ${large ? 'sf-icon-large' : ''}`} aria-hidden="true">
            <Icon size={large ? 28 : small ? 15 : 20} strokeWidth={1.75} />
        </span>
    );
}

// "$ [ 0.00 ]": reports every keystroke (onPreview) and commits on blur/Enter.
export function MoneyInput({ id, value, label, onPreview, onCommit, onEnter, disabled = false }) {
    const [text, setText] = useState(Number(value || 0).toFixed(2));
    const focused = useRef(false);
    const startValue = useRef(0);

    useEffect(() => {
        if (!focused.current) setText(Number(value || 0).toFixed(2));
    }, [value]);

    return (
        <span className={`sf-money ${disabled ? 'is-disabled' : ''}`}>
            <span className="sf-money-sign" aria-hidden="true">$</span>
            <input
                id={id}
                type="text"
                inputMode="decimal"
                aria-label={label}
                value={text}
                disabled={disabled}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => {
                    focused.current = true;
                    startValue.current = Number(value || 0);
                    e.target.select();
                }}
                onChange={(e) => {
                    setText(e.target.value);
                    onPreview && onPreview(parseMoney(e.target.value));
                }}
                onBlur={() => {
                    focused.current = false;
                    const amount = parseMoney(text);
                    setText(amount.toFixed(2));
                    if (amount !== startValue.current) onCommit(amount);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        e.target.blur();
                        onEnter && onEnter();
                    }
                }}
            />
        </span>
    );
}

// A button showing the current icon; opens a small grid of the curated icons.
export function IconPicker({ value, onChange, large = false }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const current = resolveIcon(value);

    useEffect(() => {
        if (!open) return undefined;
        const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
        const onKey = (e) => e.key === 'Escape' && setOpen(false);
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    return (
        <div className="sf-picker" ref={ref}>
            <button
                type="button"
                className="sf-picker-button"
                aria-haspopup="true"
                aria-expanded={open}
                aria-label={`Icon: ${current.label}. Change icon`}
                onClick={() => setOpen((v) => !v)}
            >
                <GoalIcon icon={current} large={large} />
            </button>
            {open && (
                <div className="sf-picker-grid" role="group" aria-label="Choose an icon">
                    {GOAL_ICONS.map((icon) => (
                        <button
                            key={icon.key}
                            type="button"
                            className={`sf-picker-option ${icon.key === current.key ? 'is-selected' : ''}`}
                            aria-pressed={icon.key === current.key}
                            title={icon.label}
                            aria-label={icon.label}
                            onClick={() => {
                                onChange(icon.key);
                                setOpen(false);
                            }}
                        >
                            <icon.Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
