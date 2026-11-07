import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, Lock, LockOpen, Plus, Trash2 } from 'lucide-react';
import {
    addContributionPlan,
    addPostTaxBenefit,
    addPostTaxContribution,
    addPreTaxBenefit,
    getContributionPlans,
    getPaycheckSettings,
    getPaydays,
    getPostTaxBenefits,
    getPostTaxContributions,
    getPreTaxBenefits,
    removeContributionPlan,
    updateContributionPlan,
    updatePaycheckSettings,
    updatePostTaxBenefit,
    updatePostTaxContribution,
    updatePreTaxBenefit,
} from '../../utils/api';
import { getTodayDate } from '../../utils/lib';
import { MoneyInput, parseMoney } from '../SinkingFunds/GoalParts';
import { formatDate, formatMoney, plural, toCents } from '../SinkingFunds/goalMath';
import { buildPeriodPlan, buildPlan, countForAmount } from './contributionMath';
import './Contributions.css';

// Plan a yearly maximum (401k, Roth IRA, HSA...) across the paychecks left.
// The slider picks how many of the remaining paychecks to contribute from,
// starting with the next one; the per-paycheck amount follows.

const UNITS_KEY = 'contributions:units';
const COLLAPSED_KEY = 'contributions:collapsed';
const LOCK_KEY = 'contributions:locked';
const SAVE_DELAY = 400;

// Where "Apply to Paycheck" can put an amount, by tax type.
const TARGETS = {
    pre: [
        { key: 'pre_retirement', label: 'Pre-Tax: Retirement' },
        { key: 'pre_other', label: 'Pre-Tax: Other Contributions' },
    ],
    post: [
        { key: 'post_invest', label: 'Post-Tax: Retirement & Investments' },
        { key: 'post_other', label: 'Post-Tax: Other Contributions' },
    ],
};

// Lists that hold one named line per entry (everything except Retirement).
const LIST_TARGETS = {
    pre_other: { get: getPreTaxBenefits, add: addPreTaxBenefit, update: updatePreTaxBenefit },
    post_invest: { get: getPostTaxContributions, add: addPostTaxContribution, update: updatePostTaxContribution },
    post_other: { get: getPostTaxBenefits, add: addPostTaxBenefit, update: updatePostTaxBenefit },
};

const shortDate = (d) => formatDate(d, { weekday: true, year: false });
// Period ranges read better without weekdays: "Jan 15 – May 29".
const plainDate = (d) => formatDate(d, { year: false });
// "As of" before the year's first paycheck, so all 24 paychecks are still ahead.
const yearStart = (paydays) => `${paydays[0].slice(0, 4)}-01-01`;
// Each account remembers whether it shows dollars, a percent of gross pay, or
// (post-tax accounts only) a percent of net pay.
const readUnits = () => {
    try {
        return JSON.parse(localStorage.getItem(UNITS_KEY)) || {};
    } catch (e) {
        return {};
    }
};

// Locked by default, like the Paycheck and Credit Cards pages.
const readLocked = () => {
    try {
        return localStorage.getItem(LOCK_KEY) !== 'false';
    } catch (e) {
        return true;
    }
};

const readCollapsed = () => {
    try {
        return JSON.parse(localStorage.getItem(COLLAPSED_KEY)) || {};
    } catch (e) {
        return {};
    }
};

// Process-wide, so revisiting the page doesn't flash an empty list.
const cache = { plans: null, paydays: null, pay: undefined };

function PercentInput({ value, label, onCommit, disabled }) {
    const format = (v) => (Math.round(v * 10) / 10).toString();
    const [text, setText] = useState(format(value));
    const focused = useRef(false);

    useEffect(() => {
        if (!focused.current) setText(format(value));
    }, [value]);

    const commit = () => {
        focused.current = false;
        const pct = parseFloat(text);
        if (!(pct > 0)) {
            setText(format(value));
            return;
        }
        setText(format(pct));
        onCommit(pct);
    };

    return (
        <span className={`ct-pct ${disabled ? 'is-disabled' : ''}`}>
            <input
                type="text"
                inputMode="decimal"
                aria-label={label}
                value={text}
                disabled={disabled}
                onFocus={(e) => {
                    focused.current = true;
                    e.target.select();
                }}
                onChange={(e) => setText(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
            />
            <span className="ct-pct-sign" aria-hidden="true">%</span>
        </span>
    );
}

function ApplyPanel({ plan, perPaycheck, afterNote, onClose }) {
    const targets = TARGETS[plan.tax_type] || TARGETS.pre;
    const [target, setTarget] = useState(targets.some((t) => t.key === plan.apply_to) ? plan.apply_to : targets[0].key);
    const [current, setCurrent] = useState(undefined); // undefined = loading
    const [state, setState] = useState('idle'); // idle | saving | done | failed

    useEffect(() => {
        let alive = true;
        setCurrent(undefined);
        (async () => {
            if (target === 'pre_retirement') {
                const settings = await getPaycheckSettings();
                if (alive) setCurrent(Number(settings.pre_tax_retirement) || 0);
                return;
            }
            const list = (await LIST_TARGETS[target].get()).data || [];
            const row = list.find((r) => r.category === plan.name);
            if (alive) setCurrent(row ? Number(row.amount) || 0 : null); // null = no line yet
        })();
        return () => {
            alive = false;
        };
    }, [target, plan.name]);

    const apply = async () => {
        setState('saving');
        let ok;
        if (target === 'pre_retirement') {
            ok = await updatePaycheckSettings('pre_tax_retirement', perPaycheck);
        } else if (current === null) {
            ok = await LIST_TARGETS[target].add(plan.name, perPaycheck);
        } else {
            ok = await LIST_TARGETS[target].update(plan.name, 'amount', perPaycheck);
        }
        const saved = ok !== false && !(ok && ok.success === false);
        if (saved) {
            updateContributionPlan(plan.id, 'apply_to', target);
            setState('done');
        } else {
            setState('failed');
        }
    };

    const where = TARGETS[plan.tax_type].find((t) => t.key === target).label;
    return (
        <div className="ct-apply">
            <label className="ct-field">
                <span>Put it on the Paycheck page as</span>
                <select className="sf-date" value={target} onChange={(e) => setTarget(e.target.value)} disabled={state === 'saving' || state === 'done'}>
                    {targets.map((t) => (
                        <option key={t.key} value={t.key}>{t.label}</option>
                    ))}
                </select>
            </label>
            {current === undefined ? (
                <p className="ct-apply-note sf-muted">Checking your Paycheck page…</p>
            ) : state === 'done' ? (
                <p className="ct-apply-note ct-ok" role="status">
                    Done. {where} is now {formatMoney(perPaycheck)}. {afterNote}
                </p>
            ) : (
                <p className="ct-apply-note">
                    {current === null
                        ? <>This adds a line called <strong>{plan.name}</strong> at <strong>{formatMoney(perPaycheck)}</strong>.</>
                        : <><strong>{where}</strong> changes from {formatMoney(current)} to <strong>{formatMoney(perPaycheck)}</strong>.</>}
                </p>
            )}
            {state === 'failed' && <p className="ct-error" role="alert">That didn't save. Check that the app's backend is running, then try again.</p>}
            <div className="ct-apply-actions">
                {state !== 'done' && (
                    <button type="button" className="ct-pill is-primary" onClick={apply} disabled={state === 'saving' || current === undefined || !(perPaycheck > 0)}>
                        {state === 'saving' ? 'Applying…' : 'Apply'}
                    </button>
                )}
                <button type="button" className="ct-pill" onClick={onClose}>{state === 'done' ? 'Close' : 'Cancel'}</button>
            </div>
        </div>
    );
}


// `periods` is stored as JSON text (see the backend): null means "use the slider".
function parsePeriods(text) {
    if (!text) return null;
    try {
        const list = JSON.parse(text);
        return Array.isArray(list) && list.length ? list : null;
    } catch (e) {
        return null;
    }
}

// A money box where empty means "the rest".
function OptionalMoneyInput({ value, label, placeholder, disabled, onCommit }) {
    const format = (v) => (v === null || v === undefined ? '' : Number(v).toFixed(2));
    const [text, setText] = useState(format(value));
    const focused = useRef(false);

    useEffect(() => {
        if (!focused.current) setText(format(value));
    }, [value]);

    const commit = () => {
        focused.current = false;
        const trimmed = text.trim();
        if (trimmed === '') {
            setText('');
            if (value !== null && value !== undefined) onCommit(null);
            return;
        }
        const amount = parseMoney(trimmed);
        setText(amount.toFixed(2));
        if (amount !== value) onCommit(amount);
    };

    return (
        <span className={`sf-money ${disabled ? 'is-disabled' : ''}`}>
            <span className="sf-money-sign" aria-hidden="true">$</span>
            <input
                type="text"
                inputMode="decimal"
                aria-label={label}
                placeholder={placeholder}
                value={text}
                disabled={disabled}
                onFocus={(e) => {
                    focused.current = true;
                    e.target.select();
                }}
                onChange={(e) => setText(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
            />
        </span>
    );
}

// A small whole-number box (how many paychecks), or an optional percent.
function SmallInput({ value, label, suffix, disabled, optional = false, onCommit }) {
    const format = (v) => (v === null || v === undefined ? '' : String(Math.round(v * 10) / 10));
    const [text, setText] = useState(format(value));
    const focused = useRef(false);

    useEffect(() => {
        if (!focused.current) setText(format(value));
    }, [value]);

    const commit = () => {
        focused.current = false;
        const trimmed = text.trim();
        if (trimmed === '' && optional) {
            setText('');
            if (value !== null && value !== undefined) onCommit(null);
            return;
        }
        const n = parseFloat(trimmed);
        if (!(n >= 0) || (!optional && n < 1)) {
            setText(format(value));
            return;
        }
        setText(format(n));
        if (n !== value) onCommit(n);
    };

    return (
        <span className={`ct-small ${disabled ? 'is-disabled' : ''}`}>
            <input
                type="text"
                inputMode="decimal"
                aria-label={label}
                value={text}
                disabled={disabled}
                onFocus={(e) => {
                    focused.current = true;
                    e.target.select();
                }}
                onChange={(e) => setText(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
            />
            {suffix && <span className="ct-small-suffix" aria-hidden="true">{suffix}</span>}
        </span>
    );
}

function RowsTable({ rows }) {
    return (
        <details className="ct-details">
            <summary>Paycheck by paycheck</summary>
            <table className="ct-table">
                <thead>
                    <tr>
                        <th>Paycheck</th>
                        <th className="ct-right">Contribution</th>
                        <th className="ct-right">Total so far</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.date} className={row.amount === 0 ? 'ct-skipped' : ''}>
                            <td>{shortDate(row.date)}</td>
                            <td className="ct-right">{row.amount === 0 ? '—' : formatMoney(row.amount)}</td>
                            <td className="ct-right">{formatMoney(row.total)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </details>
    );
}

const MAX_PERIODS = 3;

// Different amounts over back-to-back paychecks, e.g. the last two at the
// employer match minimum and the rest spread over the first two.
function PeriodsEditor({ plan, periods, result, pay, locked, onPeriods, onMatch, onBack }) {
    const isPost = plan.tax_type === 'post';
    const round1 = (n) => Math.round(n * 10) / 10;
    const matchPer = plan.match_pct > 0 && pay.gross > 0 ? Math.ceil(pay.gross * plan.match_pct) / 100 : 0;
    const available = result.available;
    const used = periods.reduce((sum, p) => sum + p.count, 0);

    const change = (index, fields) => onPeriods(periods.map((p, i) => (i === index ? { ...p, ...fields } : p)));
    const setCount = (index, count) => {
        const others = periods.reduce((sum, p, i) => (i === index ? sum : sum + p.count), 0);
        change(index, { count: Math.max(1, Math.min(Math.round(count), Math.max(1, available - others))) });
    };
    const addPeriod = () => {
        if (periods.length >= MAX_PERIODS) return;
        if (used < available) {
            onPeriods([...periods, { count: available - used, amount: null }]);
        } else {
            const last = periods[periods.length - 1];
            if (last.count < 2) return;
            onPeriods([...periods.slice(0, -1), { ...last, count: last.count - 1 }, { count: 1, amount: null }]);
        }
    };
    const removePeriod = (index) => onPeriods(periods.filter((_, i) => i !== index));

    const percentText = (per) => {
        if (!(per > 0)) return '';
        const base = isPost ? pay.net : pay.gross;
        return base > 0 ? ` · ${round1((per / base) * 100)}% of ${isPost ? 'net pay' : 'gross'}` : '';
    };

    let status;
    if (result.diff > 0.004) {
        status = <p className="ct-status sf-muted">This adds up to {formatMoney(result.total)}, {formatMoney(result.diff)} short of the {formatMoney(result.remaining)} left.</p>;
    } else if (result.diff < -0.004) {
        status = <p className="ct-status ct-over">The fixed amounts add up to {formatMoney(-result.diff)} more than what's left.</p>;
    } else if (result.lastDate) {
        status = <p className="ct-status">Reaches your maximum on <strong>{shortDate(result.lastDate)}</strong>.{result.usedCount < available && <> Nothing for the last {plural(available - result.usedCount, 'paycheck')}.</>}</p>;
    }

    return (
        <div className="ct-periods">
            <div className="ct-periods-head">
                <h3>Periods</h3>
                {!locked && <button type="button" className="ct-link" onClick={onBack}>Back to the slider</button>}
            </div>
            <p className="ct-periods-hint sf-muted">
                Different amounts over back-to-back paychecks. Leave an amount empty for the rest.
            </p>

            <label className="ct-match">
                <span>Match minimum</span>
                <SmallInput value={plan.match_pct} label="Employer match, percent of gross pay" suffix="%" optional disabled={locked} onCommit={onMatch} />
                <span className="sf-muted">
                    {matchPer > 0 ? `of gross = ${formatMoney(matchPer)} a paycheck` : 'of gross pay, optional'}
                </span>
            </label>

            <ul className="ct-period-list">
                {periods.map((p, i) => {
                    const span = result.spans[i];
                    const under = matchPer > 0 && span && span.count > 0 && span.per > 0 && span.per < matchPer - 0.005;
                    return (
                        <li key={i} className="ct-period">
                            <div className="ct-period-when">
                                {span && span.count > 0
                                    ? <>{plainDate(span.startDate)}{span.count > 1 && <> – {plainDate(span.endDate)}</>}</>
                                    : <span className="sf-muted">No paychecks left for this one</span>}
                            </div>
                            <label className="ct-period-field">
                                <span>Paychecks</span>
                                <SmallInput value={p.count} label={`Paychecks in period ${i + 1}`} disabled={locked} onCommit={(n) => setCount(i, n)} />
                            </label>
                            <label className="ct-period-field">
                                <span>Amount each</span>
                                <OptionalMoneyInput value={p.amount} label={`Amount each paycheck in period ${i + 1}`} placeholder="The rest" disabled={locked} onCommit={(amount) => change(i, { amount })} />
                            </label>
                            <div className="ct-period-result">
                                {span && span.count > 0 ? (
                                    <>
                                        <strong>{formatMoney(span.per)}</strong> each{percentText(span.per)}
                                    </>
                                ) : null}
                            </div>
                            {!locked && periods.length > 1 && (
                                <button type="button" className="ct-icon-btn ct-period-remove" onClick={() => removePeriod(i)} aria-label={`Remove period ${i + 1}`} title="Remove this period">
                                    <Trash2 size={16} aria-hidden="true" />
                                </button>
                            )}
                            {under && (
                                <p className="ct-period-note sf-muted">
                                    Under your {plan.match_pct}% match minimum ({formatMoney(matchPer)}), so the match may be smaller.
                                    {!locked && <> <button type="button" className="ct-link" onClick={() => change(i, { amount: matchPer })}>Set to {formatMoney(matchPer)}</button></>}
                                </p>
                            )}
                        </li>
                    );
                })}
            </ul>

            {!locked && periods.length < MAX_PERIODS && (used < available || periods[periods.length - 1].count > 1) && (
                <button type="button" className="ct-link ct-add-period" onClick={addPeriod}>+ Add a period</button>
            )}
            {status}
        </div>
    );
}

function PlanCard({ plan, paydays, pay, unit, locked, collapsed, onToggle, onUnit, onChange, onRemove }) {
    const [error, setError] = useState('');
    const [name, setName] = useState(plan.name);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [applying, setApplying] = useState(false);

    const lastPayday = paydays[paydays.length - 1];
    const startOfYear = yearStart(paydays);
    const asOf = plan.ytd_as_of || paydays.filter((d) => d <= getTodayDate()).pop() || startOfYear;
    const endDate = plan.end_date || lastPayday;
    const upcoming = paydays.filter((d) => d > asOf && d <= endDate);

    const result = buildPlan({
        annualMax: plan.annual_max,
        ytd: plan.ytd_amount,
        paydays: upcoming,
        count: plan.num_paychecks,
    });

    // The slider moves instantly; saving waits until it settles.
    const [dragCount, setDragCount] = useState(null);
    const timer = useRef(null);
    const shownCount = dragCount ?? result.count;

    const save = useCallback(async (field, value) => {
        setError('');
        onChange(plan.id, { [field]: value });
        const ok = await updateContributionPlan(plan.id, field, value);
        if (!ok) setError("That didn't save. Check that the app's backend is running, then try again.");
    }, [plan.id, onChange]);

    const saveCount = (n) => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            save('num_paychecks', n >= result.available ? null : n);
            setDragCount(null);
        }, SAVE_DELAY);
    };
    useEffect(() => () => clearTimeout(timer.current), []);

    const view = dragCount === null ? result : buildPlan({
        annualMax: plan.annual_max,
        ytd: plan.ytd_amount,
        paydays: upcoming,
        count: dragCount,
    });

    const periods = parsePeriods(plan.periods);
    const periodView = periods
        ? buildPeriodPlan({ annualMax: plan.annual_max, ytd: plan.ytd_amount, paydays: upcoming, periods })
        : null;

    const splitIntoPeriods = () => {
        const n = Math.max(2, view.count || view.available);
        const first = Math.ceil(n / 2);
        const gross = pay.gross;
        const match = plan.match_pct > 0 && gross > 0 ? Math.ceil(gross * plan.match_pct) / 100 : null;
        save('periods', JSON.stringify([{ count: first, amount: null }, { count: n - first, amount: match }]));
    };
    const savePeriods = (list) => save('periods', JSON.stringify(list));

    // A post-tax account's percent is of net pay (it comes out of take-home pay); a
    // pre-tax account's is of gross pay. The note below shows both either way.
    const isPost = plan.tax_type === 'post';
    const basis = unit === 'dollars' ? 'dollars' : isPost ? 'net' : 'gross';
    const percentOf = (base) => (base > 0 ? (view.per / base) * 100 : null);
    const pctGross = percentOf(pay.gross);
    const pctNet = isPost ? percentOf(pay.net) : null;
    const shownPct = basis === 'net' ? pctNet : basis === 'gross' ? pctGross : null;
    const baseAmount = basis === 'net' ? pay.net : pay.gross;
    const showPercent = shownPct !== null;
    const round1 = (n) => Math.round(n * 10) / 10;
    const equalsParts = [];
    if (pctGross !== null) equalsParts.push(`${round1(pctGross)}% of gross`);
    if (pctNet !== null) equalsParts.push(`${round1(pctNet)}% of net pay`);
    const missingPay = basis === 'net'
        ? 'Set your pay on the Paycheck page to see a percent of net pay.'
        : 'Set your gross pay on the Paycheck page to see a percent.';

    const setPerPaycheck = (amount) => {
        if (!(amount > 0)) return;
        const n = countForAmount(result.remaining, result.available, amount);
        save('num_paychecks', n >= result.available ? null : n);
    };

    const miniText = view.reached
        ? 'Maximum reached'
        : periods
            ? plural(periods.length, 'period')
            : view.count > 0
            ? `${showPercent ? `${round1(shownPct)}%` : formatMoney(view.per)} × ${plural(view.count, 'paycheck')}`
            : '';

    const contributed = Math.min(plan.ytd_amount, plan.annual_max);
    const fraction = plan.annual_max > 0 ? Math.min(1, plan.ytd_amount / plan.annual_max) : 0;
    const over = plan.ytd_amount > plan.annual_max;

    return (
        <section className={`ct-card ${collapsed ? 'is-collapsed' : ''}`} aria-label={plan.name}>
            <header className="ct-card-head">
                <button
                    type="button"
                    className={`ct-collapse ${collapsed ? 'is-collapsed' : ''}`}
                    onClick={() => onToggle(plan.id)}
                    aria-expanded={!collapsed}
                    aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${plan.name}`}
                    title={collapsed ? 'Show details' : 'Minimize'}
                >
                    <ChevronDown size={20} aria-hidden="true" />
                </button>
                <input
                    className="ct-name"
                    value={name}
                    aria-label="Account name"
                    readOnly={locked}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => {
                        const next = name.trim();
                        if (!next) setName(plan.name);
                        else if (next !== plan.name) save('name', next);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                />
                {collapsed ? (
                    <span className="ct-mini">{miniText}</span>
                ) : (
                    <>
                        <select
                            className="sf-date ct-type"
                            aria-label="Tax type"
                            disabled={locked}
                            value={plan.tax_type}
                            onChange={(e) => {
                                save('tax_type', e.target.value);
                                save('apply_to', null);
                            }}
                            title={plan.tax_type === 'pre' ? 'Taken out of your pay before taxes' : 'Paid from your take-home pay, after taxes'}
                        >
                            <option value="pre">Pre-tax</option>
                            <option value="post">Post-tax</option>
                        </select>
                        {locked ? null : confirmDelete ? (
                            <span className="ct-confirm">
                                <button type="button" className="ct-pill is-danger" onClick={() => onRemove(plan.id)}>Delete {plan.name}</button>
                                <button type="button" className="ct-pill" onClick={() => setConfirmDelete(false)}>Keep</button>
                            </span>
                        ) : (
                            <button type="button" className="ct-icon-btn" onClick={() => setConfirmDelete(true)} aria-label={`Delete ${plan.name}`} title="Delete this account">
                                <Trash2 size={17} aria-hidden="true" />
                            </button>
                        )}
                    </>
                )}
            </header>

            <div className="ct-progress-block">
                <div className="sf-progress" role="img" aria-label={`${formatMoney(contributed)} of ${formatMoney(plan.annual_max)} contributed`}>
                    <div className="sf-progress-fill" style={{ width: `${fraction * 100}%` }} />
                </div>
                <p className="ct-progress-text">
                    <strong>{formatMoney(plan.ytd_amount)}</strong> of {formatMoney(plan.annual_max)} contributed
                    {result.remaining > 0 && <> · <strong>{formatMoney(result.remaining)}</strong> to go</>}
                </p>
            </div>

            {!collapsed && (
                <>
            <div className="ct-fields">
                <label className="ct-field">
                    <span>Contributed so far</span>
                    <MoneyInput value={plan.ytd_amount} label="Contributed so far" disabled={locked} onCommit={(v) => save('ytd_amount', toCents(v))} />
                </label>
                <label className="ct-field">
                    <span title="Your total on this paycheck, counting it. Pick Start of year if nothing has gone in yet.">As of paycheck</span>
                    <select className="sf-date" value={asOf} disabled={locked} onChange={(e) => save('ytd_as_of', e.target.value)}>
                        <option value={startOfYear}>Start of year</option>
                        {asOf !== startOfYear && !paydays.includes(asOf) && <option value={asOf}>{shortDate(asOf)}</option>}
                        {paydays.map((d) => (
                            <option key={d} value={d}>{shortDate(d)}</option>
                        ))}
                    </select>
                </label>
                <label className="ct-field">
                    <span>Yearly maximum</span>
                    <MoneyInput value={plan.annual_max} label="Yearly maximum" disabled={locked} onCommit={(v) => save('annual_max', toCents(v))} />
                </label>
                <label className="ct-field">
                    <span>Reach it by</span>
                    <select
                        className="sf-date"
                        disabled={locked}
                        value={endDate}
                        onChange={(e) => save('end_date', e.target.value === lastPayday ? null : e.target.value)}
                    >
                        {paydays.filter((d) => d >= asOf).map((d) => (
                            <option key={d} value={d}>
                                {shortDate(d)}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {view.reached ? (
                <p className="ct-message" role="status">
                    {over
                        ? `You're ${formatMoney(plan.ytd_amount - plan.annual_max)} over the maximum. Stop contributing now to avoid an excess.`
                        : "You've reached the maximum. Nothing more to contribute this year."}
                </p>
            ) : view.available === 0 ? (
                <p className="ct-message" role="status">
                    There are no paychecks between {shortDate(asOf)} and {shortDate(endDate)}. Pick a later "reach it by" paycheck.
                </p>
            ) : (
                <div className="ct-plan">
                    {periods ? (
                        <PeriodsEditor
                            plan={plan}
                            periods={periods}
                            result={periodView}
                            pay={pay}
                            locked={locked}
                            onPeriods={savePeriods}
                            onMatch={(pct) => save('match_pct', pct)}
                            onBack={() => save('periods', null)}
                        />
                    ) : (
                    <>
                    <div className="ct-slider">
                        <div className="ct-slider-head">
                            <label htmlFor={`ct-slider-${plan.id}`}>
                                Contribute from <strong>{plural(shownCount, 'paycheck')}</strong> of {view.available}
                            </label>
                            {!locked && view.available > 1 && (
                                <button type="button" className="ct-link" onClick={splitIntoPeriods}>Split into periods</button>
                            )}
                        </div>
                        {view.available > 1 ? (
                            <>
                                <input
                                    id={`ct-slider-${plan.id}`}
                                    className="ct-range"
                                    type="range"
                                    disabled={locked}
                                    min={1}
                                    max={view.available}
                                    step={1}
                                    value={Math.min(shownCount, view.available)}
                                    onChange={(e) => {
                                        const n = Number(e.target.value);
                                        setDragCount(n);
                                        saveCount(n);
                                    }}
                                />
                                <div className="ct-slider-ends" aria-hidden="true">
                                    <span>1 paycheck, biggest</span>
                                    <span>All {view.available}, smallest</span>
                                </div>
                            </>
                        ) : (
                            <p className="sf-muted">Only one paycheck is left in this window.</p>
                        )}
                    </div>

                    <div className="ct-result">
                        <div className="ct-result-top">
                        <div className="ct-per">
                            {showPercent ? (
                                <PercentInput value={shownPct} label={`Percent of ${basis === 'net' ? 'net' : 'gross'} pay per paycheck`} disabled={locked} onCommit={(pct) => setPerPaycheck(toCents((baseAmount * pct) / 100))} />
                            ) : (
                                <MoneyInput value={view.per} label="Amount per paycheck" disabled={locked} onCommit={setPerPaycheck} />
                            )}
                            <span className="ct-per-label">per paycheck</span>
                        </div>
                        <div className="ct-unit" role="group" aria-label={`Show ${plan.name} as`}>
                            <button type="button" className={basis === 'dollars' ? 'is-on' : ''} aria-pressed={basis === 'dollars'} onClick={() => onUnit(plan.id, 'dollars')} title="Dollars per paycheck">$</button>
                            <button
                                type="button"
                                className={basis !== 'dollars' ? 'is-on' : ''}
                                aria-pressed={basis !== 'dollars'}
                                onClick={() => onUnit(plan.id, isPost ? 'net' : 'percent')}
                                title={isPost ? 'Percent of your net pay (gross minus pre-tax and taxes)' : 'Percent of your gross pay'}
                            >
                                {isPost ? '% net' : '%'}
                            </button>
                        </div>
                        </div>
                        <p className="ct-equals sf-muted">
                            {basis === 'dollars'
                                ? (equalsParts.length ? `= ${equalsParts.join(' · ')}` : '')
                                : showPercent
                                    ? `= ${formatMoney(view.per)} each paycheck${isPost && pctGross !== null ? ` · ${round1(pctGross)}% of gross` : ''}`
                                    : missingPay}
                        </p>
                        <p className="ct-summary">
                            {plural(view.count, 'paycheck')}, {shortDate(view.rows[0].date)}
                            {view.count > 1 && <> to {shortDate(view.lastDate)}</>}.
                            {' '}Reaches your maximum on <strong>{shortDate(view.lastDate)}</strong>.
                            {view.count < view.available && <> Then nothing for the last {plural(view.available - view.count, 'paycheck')}.</>}
                        </p>
                        {view.count > 1 && view.rows[view.count - 1].amount !== view.per && (
                            <p className="ct-fine sf-muted">The last one is {formatMoney(view.rows[view.count - 1].amount)} so the total is exact.</p>
                        )}
                    </div>

                    </>
                    )}

                    <RowsTable rows={periods ? periodView.rows : view.rows} />

                    {locked ? null : applying ? (
                        <ApplyPanel
                            plan={plan}
                            perPaycheck={periods ? periodView.spans[0].per : view.per}
                            afterNote={periods
                                ? (periods.length > 1 && periodView.spans[0].endDate
                                    ? `Change it after ${shortDate(periodView.spans[0].endDate)}, when the next period starts.`
                                    : '')
                                : (view.count < view.available
                                    ? `Set it back after ${shortDate(view.lastDate)}, when you reach the maximum.`
                                    : '')}
                            onClose={() => setApplying(false)}
                        />
                    ) : (
                        <button type="button" className="ct-pill ct-apply-btn" onClick={() => setApplying(true)}>
                            <ArrowRight size={15} aria-hidden="true" />
                            Apply to Paycheck…
                        </button>
                    )}
                </div>
            )}
                </>
            )}
            {error && <p className="ct-error" role="alert">{error}</p>}
        </section>
    );
}

function AddPlan({ defaultAsOf, onAdded, startOpen }) {
    const [open, setOpen] = useState(startOpen);
    const [name, setName] = useState('');
    const [taxType, setTaxType] = useState('pre');
    const [max, setMax] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (startOpen) setOpen(true);
    }, [startOpen]);

    const submit = async (e) => {
        e.preventDefault();
        const annualMax = parseFloat(String(max).replace(/[$,\s]/g, ''));
        if (!name.trim() || !(annualMax > 0)) {
            setError('Give the account a name and a yearly maximum.');
            return;
        }
        setBusy(true);
        const result = await addContributionPlan({ name: name.trim(), taxType, annualMax, ytdAsOf: defaultAsOf });
        setBusy(false);
        if (result.error) {
            setError(result.error);
            return;
        }
        setName('');
        setMax('');
        setError('');
        setOpen(false);
        onAdded();
    };

    if (!open) {
        return (
            <button type="button" className="ct-add-btn" onClick={() => setOpen(true)}>
                <span className="ct-add-icon" aria-hidden="true"><Plus size={18} /></span>
                Add an account
            </button>
        );
    }
    return (
        <form className="ct-add" onSubmit={submit}>
            <h2 className="ct-add-title">Add an account</h2>
            <div className="ct-fields">
                <label className="ct-field">
                    <span>Name</span>
                    <input className="sf-date" value={name} placeholder="401k, Roth IRA, HSA…" onChange={(e) => setName(e.target.value)} />
                </label>
                <label className="ct-field">
                    <span>Taken out</span>
                    <select className="sf-date" value={taxType} onChange={(e) => setTaxType(e.target.value)}>
                        <option value="pre">Before taxes (pre-tax)</option>
                        <option value="post">After taxes (post-tax)</option>
                    </select>
                </label>
                <label className="ct-field">
                    <span>Yearly maximum</span>
                    <input className="sf-date" inputMode="decimal" value={max} placeholder="e.g. 7000" onChange={(e) => setMax(e.target.value)} />
                </label>
            </div>
            {error && <p className="ct-error" role="alert">{error}</p>}
            <div className="ct-add-actions">
                <button type="submit" className="ct-pill is-primary" disabled={busy}>{busy ? 'Adding…' : 'Add account'}</button>
                <button type="button" className="ct-pill" onClick={() => setOpen(false)}>Cancel</button>
            </div>
        </form>
    );
}

export default function Contributions() {
    const [plans, setPlans] = useState(cache.plans);
    const [paydays, setPaydays] = useState(cache.paydays);
    const [pay, setPay] = useState(cache.pay);
    const [units, setUnits] = useState(readUnits);
    const [collapsed, setCollapsed] = useState(readCollapsed);
    const [locked, setLocked] = useState(readLocked);
    const [failed, setFailed] = useState(false);

    const load = useCallback(async () => {
        const year = new Date().getFullYear();
        const [p, days, settings, preTax] = await Promise.all([
            getContributionPlans(),
            paydays ? Promise.resolve(paydays) : getPaydays(`${year}-12-31`),
            getPaycheckSettings(),
            getPreTaxBenefits(),
        ]);
        if (!p || !days) {
            setFailed(true);
            return;
        }
        setFailed(false);
        cache.plans = p;
        cache.paydays = days;
        // Net pay, as on the Paycheck page: gross − pre-tax (retirement + other) − taxes.
        const gross = Number(settings && settings.net_pay) || 0;
        const preTaxTotal = (Number(settings && settings.pre_tax_retirement) || 0)
            + ((preTax && preTax.data) || []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
        const net = gross - preTaxTotal - (Number(settings && settings.taxes) || 0);
        cache.pay = { gross, net: net > 0 ? toCents(net) : 0 };
        setPlans(p);
        setPaydays(days);
        setPay(cache.pay);
    }, [paydays]);

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const patch = useCallback((id, fields) => {
        setPlans((current) => {
            const next = current.map((p) => (p.id === id ? { ...p, ...fields } : p));
            cache.plans = next;
            return next;
        });
    }, []);

    const remove = async (id) => {
        if (await removeContributionPlan(id)) {
            setPlans((current) => {
                const next = current.filter((p) => p.id !== id);
                cache.plans = next;
                return next;
            });
        }
    };

    const toggleLocked = () => {
        setLocked((current) => {
            try {
                localStorage.setItem(LOCK_KEY, String(!current));
            } catch (e) {
                // The choice just won't be remembered.
            }
            return !current;
        });
    };

    const toggleCollapsed = (id) => {
        setCollapsed((current) => {
            const updated = { ...current, [id]: !current[id] };
            try {
                localStorage.setItem(COLLAPSED_KEY, JSON.stringify(updated));
            } catch (e) {
                // The choice just won't be remembered.
            }
            return updated;
        });
    };

    const chooseUnit = (id, next) => {
        setUnits((current) => {
            const updated = { ...current, [id]: next };
            try {
                localStorage.setItem(UNITS_KEY, JSON.stringify(updated));
            } catch (e) {
                // The choice just won't be remembered.
            }
            return updated;
        });
    };

    const ready = plans !== null && paydays !== null && pay !== undefined;
    const today = getTodayDate();
    const defaultAsOf = ready && paydays.length ? paydays.filter((d) => d <= today).pop() || yearStart(paydays) : null;

    return (
        <div className="ct-page">
            <header className="ct-header">
                <div>
                    <h1 className="ct-title">Contributions</h1>
                    <p className="ct-lede">
                        Work out how much to put in each paycheck to reach a yearly maximum, like a 401k or Roth IRA.
                        Enter what you've put in so far, then slide to choose how many paychecks to spread it over.
                    </p>
                </div>
                <button
                    type="button"
                    className={`ct-pill ct-lock ${locked ? '' : 'is-primary'}`}
                    onClick={toggleLocked}
                    aria-pressed={!locked}
                    aria-label={locked ? 'Unlock to edit' : 'Lock'}
                    title={locked ? 'Unlock to edit amounts, add or delete accounts' : 'Lock to show a clean read-only view'}
                >
                    {locked ? <Lock size={17} aria-hidden="true" /> : <LockOpen size={17} aria-hidden="true" />}
                </button>
            </header>

            {failed && <p className="ct-error" role="alert">Couldn't load your accounts. Check that the app's backend is running, then reload.</p>}

            {ready && paydays.length > 0 && (
                <>
                    {plans.map((plan) => (
                        <PlanCard key={plan.id} plan={plan} paydays={paydays} pay={pay} unit={units[plan.id] || 'dollars'} locked={locked} collapsed={!!collapsed[plan.id]} onToggle={toggleCollapsed} onUnit={chooseUnit} onChange={patch} onRemove={remove} />
                    ))}
                    {plans.length === 0 && (
                        <p className="ct-empty">
                            No accounts yet. Add your 401k, Roth IRA or anything else with a yearly maximum.
                        </p>
                    )}
                    {(!locked || plans.length === 0) && (
                        <AddPlan defaultAsOf={defaultAsOf} startOpen={plans.length === 0} onAdded={load} />
                    )}
                </>
            )}
        </div>
    );
}
