import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, GripVertical, Plus, RefreshCw, Undo2, X } from 'lucide-react';
import './Grid.css';
import {
    addCategory,
    deleteCategory,
    getAllData,
    getNextPayday,
    updateAllCategories,
    updateCardOrder,
    updateField,
} from '../../utils/api';
import { getTodayDate } from '../../utils/lib';
import {
    formatDate,
    formatMoney,
    formatPercent,
    goalStatus,
    plural,
    recalcStartFor,
    shiftDate,
    toCents,
} from '../SinkingFunds/goalMath';
import { resolveIcon } from '../SinkingFunds/goalIcons';
import { GoalIcon, IconPicker, MoneyInput } from '../SinkingFunds/GoalParts';
import { JarMark } from '../Login/Login';

// Applies saved-amount changes one at a time (SQLite + recalculation per
// write) and returns the changes that succeeded, for undo. Each change
// carries the plan start to recalculate from (startTo).
async function applySavedChanges(changes) {
    const applied = [];
    for (const change of changes) {
        const ok = await updateField('saved', change.to.toFixed(2), change.id, 'id', change.startTo);
        if (ok) applied.push(change);
    }
    return applied;
}

function GoalRow({ goal, status, view, showStart, onOpen, onLog, onDelete, busy }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: goal.id });
    const icon = resolveIcon(goal.emoji);
    // Past-due goals have no per-paycheck amount left; offer the remainder.
    const logAmount = status.funded ? 0 : status.pastDue ? status.remaining : status.perPaycheck;
    // "After next paycheck" view: saved + this paycheck's planned amount.
    const adding = view === 'after' && !status.funded && !status.pastDue ? status.perPaycheck : 0;
    const after = toCents(status.saved + adding);
    const stop = (fn) => (e) => {
        e.stopPropagation();
        fn();
    };

    return (
        <li
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={`sf-row ${isDragging ? 'is-dragging' : ''} ${status.funded ? 'is-funded' : ''}`}
            onClick={onOpen}
        >
            <button
                type="button"
                className="sf-drag"
                aria-label={`Reorder ${goal.category}`}
                onClick={(e) => e.stopPropagation()}
                {...attributes}
                {...listeners}
            >
                <GripVertical size={16} aria-hidden="true" />
            </button>

            <GoalIcon icon={icon} />

            <div className="sf-row-main">
                <a
                    className="sf-row-name"
                    href={`/users/${goal.id}/${encodeURIComponent(goal.category)}`}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onOpen();
                    }}
                >
                    {goal.category}
                </a>
                <div
                    className="sf-progress"
                    role="progressbar"
                    aria-label={`${goal.category} progress`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(Math.min(1, after / (status.target || 1)) * 100)}
                >
                    <div className="sf-progress-fill" style={{ width: `${status.fraction * 100}%` }} />
                    {adding > 0 && (
                        <div
                            className="sf-progress-next"
                            style={{ width: `${Math.max(0, Math.min(1, after / status.target) - status.fraction) * 100}%` }}
                        />
                    )}
                </div>
                <div className="sf-row-sub">
                    {adding > 0 ? (
                        <>
                            <span className="sf-num">{formatMoney(status.saved)}</span> +{' '}
                            <span className="sf-num sf-next-amount">{formatMoney(adding)}</span> ={' '}
                            <span className="sf-num sf-strong">{formatMoney(after)}</span>
                        </>
                    ) : (
                        <>
                            <span className="sf-num">{formatMoney(status.saved)}</span> of{' '}
                            <span className="sf-num">{formatMoney(status.target)}</span>
                        </>
                    )}
                    <span className="sf-dot" aria-hidden="true">·</span>
                    {formatPercent(Math.min(1, after / (status.target || 1)))}
                </div>
            </div>

            <div className="sf-row-col sf-row-per">
                {status.funded ? (
                    <span className="sf-funded">
                        <Check size={14} aria-hidden="true" /> Funded
                    </span>
                ) : status.pastDue ? (
                    <>
                        <span className="sf-num sf-strong">{formatMoney(status.remaining)}</span>
                        <span className="sf-muted">still needed</span>
                    </>
                ) : (
                    <>
                        <span className="sf-num sf-strong">{formatMoney(status.perPaycheck)}</span>
                        <span className="sf-muted">per paycheck</span>
                        {showStart && status.freshness === 'current' && goal.plan_start && (
                            <span className="sf-muted sf-starts">starts {formatDate(goal.plan_start, { year: false })}</span>
                        )}
                        {status.freshness === 'stale' && (
                            <span className="sf-stale">as of {formatDate(goal.calculated_from, { year: false })}</span>
                        )}
                        {status.freshness === 'unknown' && <span className="sf-stale">not yet dated</span>}
                    </>
                )}
            </div>

            <div className="sf-row-col sf-row-due">
                <span>{formatDate(goal.goal_date)}</span>
                <span className={status.pastDue ? 'sf-past-due' : 'sf-muted'}>
                    {status.funded
                        ? 'Goal reached'
                        : status.pastDue
                            ? 'Past due'
                            : `${plural(status.paychecksLeft, 'paycheck')} left`}
                </span>
            </div>

            {logAmount > 0 && (
                <div className="sf-row-actions">
                    <button
                        type="button"
                        className="sf-log-one"
                        disabled={busy}
                        onClick={stop(() => onLog(logAmount))}
                        title={
                            status.pastDue || !goal.plan_start
                                ? `Add ${formatMoney(logAmount)} to ${goal.category}`
                                : `Log the ${formatDate(goal.plan_start, { year: false })} paycheck (${formatMoney(logAmount)}) for ${goal.category}`
                        }
                    >
                        <Plus size={14} aria-hidden="true" />
                        <span className="sf-num">{formatMoney(logAmount)}</span>
                    </button>
                </div>
            )}
            <button
                type="button"
                className="sf-delete"
                onClick={stop(onDelete)}
                aria-label={`Delete ${goal.category}`}
                title={`Delete ${goal.category}`}
            >
                <X size={14} aria-hidden="true" />
            </button>
        </li>
    );
}

function LogPanel({ goals, statuses, planStart, onCancel, onConfirm, busy }) {
    const loggable = goals.filter((g) => !statuses[g.id].funded && statuses[g.id].perPaycheck > 0);
    const [draft, setDraft] = useState(() =>
        Object.fromEntries(loggable.map((g) => [g.id, { checked: true, amount: statuses[g.id].perPaycheck }]))
    );
    const chosen = loggable.filter((g) => draft[g.id] && draft[g.id].checked && draft[g.id].amount > 0);
    const total = chosen.reduce((sum, g) => sum + toCents(draft[g.id].amount), 0);
    const title = planStart
        ? `Log the ${formatDate(planStart, { weekday: true, year: false })} paycheck`
        : "Log each goal's next paycheck";

    return (
        <section className="sf-log-panel" aria-label={title}>
            <h2 className="sf-log-title">{title}</h2>
            <p className="sf-muted sf-log-hint">Untick a goal to skip it, or change an amount before logging.</p>
            <ul className="sf-log-list">
                {loggable.map((g) => {
                    const row = draft[g.id];
                    const icon = resolveIcon(g.emoji);
                    return (
                        <li key={g.id} className={`sf-log-row ${row.checked ? '' : 'is-off'}`}>
                            <label className="sf-log-check">
                                <input
                                    type="checkbox"
                                    checked={row.checked}
                                    onChange={(e) =>
                                        setDraft((d) => ({ ...d, [g.id]: { ...d[g.id], checked: e.target.checked } }))
                                    }
                                />
                                <GoalIcon icon={icon} small />
                                <span>{g.category}</span>
                            </label>
                            <MoneyInput
                                value={row.amount}
                                label={`Amount for ${g.category}`}
                                disabled={!row.checked}
                                onPreview={(amount) =>
                                    setDraft((d) => ({ ...d, [g.id]: { ...d[g.id], amount } }))
                                }
                                onCommit={(amount) =>
                                    setDraft((d) => ({ ...d, [g.id]: { ...d[g.id], amount } }))
                                }
                            />
                        </li>
                    );
                })}
            </ul>
            <div className="sf-log-footer">
                <span className="sf-muted">
                    {plural(chosen.length, 'goal')} · <span className="sf-num sf-strong">{formatMoney(total)}</span>
                </span>
                <div className="sf-log-buttons">
                    <button type="button" className="sf-btn-quiet" onClick={onCancel}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="sf-btn-primary"
                        disabled={busy || chosen.length === 0}
                        onClick={() => onConfirm(chosen.map((g) => ({ goal: g, amount: toCents(draft[g.id].amount) })))}
                    >
                        {busy ? 'Logging…' : `Log ${formatMoney(total)}`}
                    </button>
                </div>
            </div>
        </section>
    );
}

function AddGoalForm({ existingNames, onCancel, onAdded }) {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState(0);
    const [date, setDate] = useState('');
    const [iconKey, setIconKey] = useState('savings');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const today = getTodayDate();

    const submit = async (e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return setError('Give the goal a name.');
        if (existingNames.has(trimmed.toLowerCase())) return setError('You already have a goal with that name.');
        if (!(amount > 0)) return setError('Enter how much you want to save.');
        if (!date || date <= today) return setError('Pick a due date after today.');
        setError('');
        setSaving(true);
        const ok = await addCategory(trimmed, 0, amount, date, today, iconKey);
        setSaving(false);
        if (!ok) return setError("Couldn't add the goal. Check that the app's backend is running.");
        onAdded();
    };

    return (
        <form className="sf-add-form" onSubmit={submit}>
            <IconPicker value={iconKey} onChange={setIconKey} />
            <label className="sf-field sf-field-name">
                <span>Name</span>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Car insurance"
                    autoFocus
                />
            </label>
            <label className="sf-field">
                <span>Goal</span>
                <MoneyInput value={amount} label="Goal amount" onPreview={setAmount} onCommit={setAmount} />
            </label>
            <label className="sf-field">
                <span>Due</span>
                <input type="date" className="sf-date" value={date} min={today} onChange={(e) => setDate(e.target.value)} />
            </label>
            <div className="sf-add-buttons">
                <button type="button" className="sf-btn-quiet" onClick={onCancel}>
                    Cancel
                </button>
                <button type="submit" className="sf-btn-primary" disabled={saving}>
                    {saving ? 'Adding…' : 'Add goal'}
                </button>
            </div>
            {error && (
                <p className="sf-form-error" role="alert">
                    {error}
                </p>
            )}
        </form>
    );
}

const Grid = () => {
    const navigate = useNavigate();
    const [goals, setGoals] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [payday, setPayday] = useState(null);
    const [logOpen, setLogOpen] = useState(false);
    const [adding, setAdding] = useState(false);
    const [busy, setBusy] = useState(false);
    const [recalculating, setRecalculating] = useState(false);
    // { message, changes: [{ id, from, to }] } -- undo lives until you leave the page
    const [toast, setToast] = useState(null);
    // 'after' ("More", the default) = saved + the plan's first
    // paycheck, with each goal's start date; 'now' = saved so far only.
    const VIEW_KEY = 'sinking-funds:view-mode';
    const [view, setView] = useState(() => {
        try {
            return window.localStorage.getItem(VIEW_KEY) === 'now' ? 'now' : 'after';
        } catch {
            return 'after';
        }
    });
    const chooseView = (next) => {
        setView(next);
        try {
            window.localStorage.setItem(VIEW_KEY, next);
        } catch {
            // ignore
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const refresh = useCallback(async () => {
        const data = await getAllData();
        setGoals((data && data.data) || []);
        setLoaded(true);
    }, []);

    useEffect(() => {
        window.scrollTo(0, 0);
        refresh();
        getNextPayday().then(setPayday);
    }, [refresh]);

    const statuses = useMemo(
        () => Object.fromEntries(goals.map((g) => [g.id, goalStatus(g, payday)])),
        [goals, payday]
    );
    const active = goals.filter((g) => !statuses[g.id].funded);
    const contributing = active.filter((g) => statuses[g.id].perPaycheck > 0);
    const perPaycheckTotal = contributing.reduce((sum, g) => sum + statuses[g.id].perPaycheck, 0);
    const outOfDate = active.filter((g) => statuses[g.id].freshness !== 'current');
    // What the pill says about which paycheck the amounts start from.
    const fmtShort = (d) => formatDate(d, { year: false });
    const planStarts = [
        ...new Set(contributing.filter((g) => statuses[g.id].freshness === 'current').map((g) => g.plan_start)),
    ].filter(Boolean).sort();
    const fmtPayday = (d) => formatDate(d, { weekday: true, year: false });
    let basisText;
    if (outOfDate.length) {
        basisText =
            `${plural(outOfDate.length, 'goal')} ` +
            (payday && payday.previous
                ? `${outOfDate.length === 1 ? 'was' : 'were'} planned before the ${fmtShort(payday.previous)} paycheck`
                : `${outOfDate.length === 1 ? 'needs' : 'need'} recalculating`);
    } else if (planStarts.length) {
        // Only the earliest start; each row shows its own in the detailed view.
        basisText = `Earliest plan starts with the ${fmtPayday(planStarts[0])} paycheck`;
    } else {
        basisText = 'amounts up to date';
    }

    const existingNames = useMemo(() => new Set(goals.map((g) => g.category.toLowerCase())), [goals]);

    const logChanges = async (entries) => {
        setBusy(true);
        // Logging fills the plan's first paycheck, so the plan then starts the
        // day after it (the following payday becomes the first row).
        const changes = entries.map(({ goal, amount }) => ({
            id: goal.id,
            from: Number(goal.saved) || 0,
            to: toCents((Number(goal.saved) || 0) + amount),
            startFrom: goal.calculated_from || getTodayDate(),
            startTo: goal.plan_start ? shiftDate(goal.plan_start, 1) : getTodayDate(),
        }));
        const applied = await applySavedChanges(changes);
        await refresh();
        setBusy(false);
        setLogOpen(false);
        const total = applied.reduce((sum, c) => sum + (c.to - c.from), 0);
        const failed = changes.length - applied.length;
        setToast({
            message:
                `Logged ${formatMoney(total)} to ${plural(applied.length, 'goal')}` +
                (failed ? `. ${plural(failed, 'goal')} couldn't be saved.` : ''),
            changes: applied,
        });
    };

    const undo = async () => {
        if (!toast) return;
        setBusy(true);
        const reverts = toast.changes.map((c) => ({ id: c.id, from: c.to, to: c.from, startTo: c.startFrom }));
        const applied = await applySavedChanges(reverts);
        await refresh();
        setBusy(false);
        setToast({
            message:
                applied.length === reverts.length
                    ? 'Undone.'
                    : `Undid ${applied.length} of ${reverts.length}. Check the rest on their pages.`,
            changes: [],
        });
    };

    const recalculate = async (startDate) => {
        setRecalculating(true);
        await updateAllCategories(startDate);
        await refresh();
        setRecalculating(false);
    };

    const remove = async (goal) => {
        if (!window.confirm(`Delete "${goal.category}"? This can't be undone.`)) return;
        setGoals((prev) => prev.filter((g) => g.id !== goal.id));
        await deleteCategory(goal.id, 'id');
        refresh();
    };

    const handleDragEnd = ({ active: a, over }) => {
        if (!over || a.id === over.id) return;
        setGoals((items) => {
            const reordered = arrayMove(
                items,
                items.findIndex((g) => g.id === a.id),
                items.findIndex((g) => g.id === over.id)
            );
            updateCardOrder(reordered.map((g) => g.id));
            return reordered;
        });
    };

    const openGoal = (goal) => navigate(`/users/${goal.id}/${encodeURIComponent(goal.category)}`);

    return (
        <div className="sf-page">
            <header className="sf-header">
                <div>
                    <h1 className="sf-title">Sinking Funds</h1>
                    {contributing.length > 0 && (
                        <p className="sf-summary">
                            <span className="sf-figure sf-num">{formatMoney(perPaycheckTotal)}</span>
                            <span className="sf-muted">per paycheck across {plural(contributing.length, 'goal')}</span>
                        </p>
                    )}
                </div>
                {contributing.length > 0 && !logOpen && (
                    <button type="button" className="sf-btn-primary" onClick={() => setLogOpen(true)}>
                        Log this paycheck
                    </button>
                )}
            </header>

            <div className={`sf-status ${outOfDate.length ? 'is-stale' : ''}`} aria-live="polite">
                <span className={outOfDate.length ? '' : 'sf-status-ok'}>
                    {!outOfDate.length && <Check size={14} aria-hidden="true" />} {basisText}
                </span>
                {payday && payday.previous && payday.next && (
                    <span
                        className={`sf-recalc ${recalculating ? 'is-busy' : ''}`}
                        role="group"
                        aria-label="Recalculate amounts"
                    >
                        <span className="sf-recalc-label">
                            <RefreshCw size={13} aria-hidden="true" className={recalculating ? 'sf-spin' : ''} />
                            {recalculating ? 'Recalculating…' : 'Recalculate'}
                        </span>
                        <button
                            type="button"
                            className="sf-btn-small"
                            onClick={() => recalculate(recalcStartFor(payday.previous))}
                            disabled={!!recalculating}
                            title={`Plan from the day before the ${fmtShort(payday.previous)} paycheck, so it's counted (if you haven't logged it yet)`}
                        >
                            {fmtShort(recalcStartFor(payday.previous))} · last
                        </button>
                        <button
                            type="button"
                            className="sf-btn-small"
                            onClick={() => recalculate(recalcStartFor(payday.next))}
                            disabled={!!recalculating}
                            title={`Plan from the day before the ${fmtShort(payday.next)} paycheck`}
                        >
                            {fmtShort(recalcStartFor(payday.next))} · next
                        </button>
                    </span>
                )}
            </div>

            {logOpen && (
                <LogPanel
                    goals={goals}
                    statuses={statuses}
                    planStart={planStarts.length === 1 ? planStarts[0] : null}
                    busy={busy}
                    onCancel={() => setLogOpen(false)}
                    onConfirm={logChanges}
                />
            )}

            {goals.length > 0 && (
                <div className="sf-viewbar">
                    <div className="sf-segmented" role="group" aria-label="Show amounts">
                        <button type="button" aria-pressed={view === 'now'} onClick={() => chooseView('now')}>
                            Saved now
                        </button>
                        <button type="button" aria-pressed={view === 'after'} onClick={() => chooseView('after')}>
                            More
                        </button>
                    </div>
                </div>
            )}


            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={goals.map((g) => g.id)} strategy={verticalListSortingStrategy}>
                    <ul className="sf-list">
                        {loaded && goals.length === 0 && (
                            <li className="sf-empty">
                                <span className="sf-empty-mark"><JarMark size={36} /></span>
                                <span>
                                    <strong className="sf-empty-title">No goals yet</strong>
                                    <span className="sf-muted">Add something you're saving toward below, and it'll show how much to set aside each paycheck.</span>
                                </span>
                            </li>
                        )}
                        {goals.map((goal) => (
                            <GoalRow
                                key={goal.id}
                                goal={goal}
                                status={statuses[goal.id]}
                                view={view}
                                showStart={view === 'after' || planStarts.length > 1}
                                busy={busy}
                                onOpen={() => openGoal(goal)}
                                onLog={(amount) => logChanges([{ goal, amount }])}
                                onDelete={() => remove(goal)}
                            />
                        ))}
                        <li className="sf-add">
                            {adding ? (
                                <AddGoalForm
                                    existingNames={existingNames}
                                    onCancel={() => setAdding(false)}
                                    onAdded={() => {
                                        setAdding(false);
                                        refresh();
                                    }}
                                />
                            ) : (
                                <button type="button" className="sf-add-button" onClick={() => setAdding(true)}>
                                    <span className="sf-icon sf-icon-add" aria-hidden="true">
                                        <Plus size={18} />
                                    </span>
                                    Add a goal
                                </button>
                            )}
                        </li>
                    </ul>
                </SortableContext>
            </DndContext>

            {toast && (
                <div className="sf-toast" role="status">
                    <span>{toast.message}</span>
                    {toast.changes.length > 0 && (
                        <button type="button" className="sf-toast-undo" onClick={undo} disabled={busy}>
                            <Undo2 size={14} aria-hidden="true" /> Undo
                        </button>
                    )}
                    <button type="button" className="sf-toast-close" onClick={() => setToast(null)} aria-label="Dismiss">
                        <X size={14} aria-hidden="true" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default Grid;
