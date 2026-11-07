import './InfoPage.css';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, Undo2 } from 'lucide-react';
import { deleteCategory, getCategoryData, getNextPayday, getPaycheckSchedule, updateField } from '../../utils/api';
import { formatDate, formatMoney, formatPercent, goalStatus, plural, shiftDate, toCents } from '../SinkingFunds/goalMath';
import { getTodayDate } from '../../utils/lib';
import { IconPicker, MoneyInput } from '../SinkingFunds/GoalParts';

export function InfoPage() {
    const { id, categoryName } = useParams();
    const navigate = useNavigate();

    const [goal, setGoal] = useState(null);
    const [schedule, setSchedule] = useState({});
    const [payday, setPayday] = useState(null);
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    // Previous saved amounts from logs made on this visit, newest last.
    const [undoStack, setUndoStack] = useState([]);

    const load = useCallback(async (category) => {
        const data = await getCategoryData(category);
        if (!data || data.error) {
            setError("Couldn't load this goal.");
            return;
        }
        setGoal(data);
        setName(data.category);
        // The schedule follows the goal's own plan start, so its first row is
        // the paycheck the per-paycheck amount (and "Log") applies to.
        const sched = await getPaycheckSchedule(data.category, data.calculated_from || getTodayDate());
        setSchedule(sched && !sched.error ? sched : {});
    }, []);

    useEffect(() => {
        window.scrollTo(0, 0);
        load(categoryName);
        getNextPayday().then(setPayday);
    }, [categoryName, load]);

    // Hand edits keep the goal's plan start; logging passes the next one.
    const save = async (field, value, planFrom = goal.calculated_from || getTodayDate()) => {
        setError('');
        const ok = await updateField(field, value, id, 'id', planFrom);
        if (!ok) {
            setError("That change didn't save. Check that the app's backend is running, then try again.");
            return false;
        }
        return true;
    };

    const saveAndReload = async (field, value) => {
        if (await save(field, value)) await load(goal.category);
    };

    const rename = async () => {
        const trimmed = name.trim();
        if (!trimmed || trimmed === goal.category) {
            setName(goal.category);
            return;
        }
        if (await save('category', trimmed)) {
            navigate(`/users/${id}/${encodeURIComponent(trimmed)}`, { replace: true });
        } else {
            setName(goal.category);
        }
    };

    const logOne = async (amount) => {
        const status = goalStatus(goal, payday);
        setBusy(true);
        const from = status.saved;
        const startFrom = goal.calculated_from || getTodayDate();
        // Logging fills the plan's first paycheck; the plan then starts the
        // day after it. Past-due goals have no plan, so they use today.
        const startTo = goal.plan_start && status.perPaycheck > 0 ? shiftDate(goal.plan_start, 1) : getTodayDate();
        if (await save('saved', toCents(from + amount).toFixed(2), startTo)) {
            setUndoStack((s) => [...s, { saved: from, start: startFrom }]);
            await load(goal.category);
        }
        setBusy(false);
    };

    const undo = async () => {
        const previous = undoStack[undoStack.length - 1];
        setBusy(true);
        if (await save('saved', previous.saved.toFixed(2), previous.start)) {
            setUndoStack((s) => s.slice(0, -1));
            await load(goal.category);
        }
        setBusy(false);
    };

    const remove = async () => {
        if (!window.confirm(`Delete "${goal.category}"? This can't be undone.`)) return;
        await deleteCategory(id, 'id');
        navigate('/sinking-funds');
    };

    if (!goal) {
        return (
            <div className="gd-page">
                <Link className="gd-back" to="/sinking-funds">
                    <ChevronLeft size={16} aria-hidden="true" /> Sinking Funds
                </Link>
                {error && <p className="gd-error" role="alert">{error}</p>}
            </div>
        );
    }

    const status = goalStatus(goal, payday);
    const logAmount = status.funded ? 0 : status.perPaycheck > 0 ? status.perPaycheck : status.remaining;

    // The backend schedule is cumulative floats. Show whole cents: each row
    // gets the rounded per-paycheck contribution and the last row absorbs the
    // rounding remainder, so the rows add up exactly to the final total.
    const dates = Object.keys(schedule).sort();
    const rawFinal = dates.length ? Number(schedule[dates[dates.length - 1]]) : status.saved;
    let running = status.saved;
    let reachedMarked = false;
    const rows = dates.map((date, i) => {
        const isLastRow = i === dates.length - 1;
        const prevRaw = i === 0 ? status.saved : Number(schedule[dates[i - 1]]);
        const contribution = isLastRow
            ? toCents(rawFinal - running)
            : toCents(Number(schedule[date]) - prevRaw);
        running = toCents(running + contribution);
        const reached = !reachedMarked && status.target > 0 && running >= status.target - 0.005;
        if (reached) reachedMarked = true;
        return { date, contribution, cumulative: running, reached };
    });

    return (
        <div className="gd-page">
            <Link className="gd-back" to="/sinking-funds">
                <ChevronLeft size={16} aria-hidden="true" /> Sinking Funds
            </Link>

            <header className="gd-header">
                <IconPicker large value={goal.emoji} onChange={(key) => saveAndReload('emoji', key)} />
                <input
                    className="gd-name"
                    aria-label="Goal name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={rename}
                    onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                />
            </header>

            <div className="gd-progress-block">
                <div
                    className="sf-progress gd-progress"
                    role="progressbar"
                    aria-label="Progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(status.fraction * 100)}
                >
                    <div className="sf-progress-fill" style={{ width: `${status.fraction * 100}%` }} />
                </div>
                <p className="sf-row-sub gd-progress-text">
                    <span className="sf-num">{formatMoney(status.saved)}</span> of{' '}
                    <span className="sf-num">{formatMoney(status.target)}</span>
                    <span className="sf-dot" aria-hidden="true">·</span>
                    {formatPercent(status.fraction)}
                    {status.funded && <span className="sf-funded gd-funded">Funded</span>}
                </p>
            </div>

            <section className="gd-panel">
                <div className="gd-fields">
                    <label className="gd-field">
                        <span>Saved</span>
                        <MoneyInput value={goal.saved} label="Saved so far" onCommit={(v) => saveAndReload('saved', v.toFixed(2))} />
                    </label>
                    <label className="gd-field">
                        <span>Goal</span>
                        <MoneyInput value={goal.goal} label="Goal amount" onCommit={(v) => saveAndReload('goal', v.toFixed(2))} />
                    </label>
                    <label className="gd-field">
                        <span>Due</span>
                        <input
                            type="date"
                            className="sf-date"
                            defaultValue={goal.goal_date}
                            key={goal.goal_date}
                            onBlur={(e) => e.target.value && e.target.value !== goal.goal_date && saveAndReload('goal_date', e.target.value)}
                        />
                    </label>
                    <div className="gd-field gd-field-readout">
                        <span>Per paycheck</span>
                        <strong className="sf-num">{status.funded ? '—' : formatMoney(status.perPaycheck)}</strong>
                        <small className={status.freshness === 'current' ? 'sf-muted' : 'sf-stale'}>
                            {status.freshness === 'unknown'
                                ? 'not yet dated, recalculate to update'
                                : goal.plan_start
                                ? `starting ${formatDate(goal.plan_start, { weekday: true })}`
                                : `as of ${formatDate(goal.calculated_from)}`}
                        </small>
                    </div>
                </div>

                <div className="gd-actions">
                    {logAmount > 0 && (
                        <button type="button" className="sf-btn-primary" onClick={() => logOne(logAmount)} disabled={busy}>
                            <Plus size={16} aria-hidden="true" />
                            {status.perPaycheck > 0
                                ? goal.plan_start
                                    ? `Log the ${formatDate(goal.plan_start, { year: false })} paycheck (${formatMoney(logAmount)})`
                                    : `Log one paycheck (${formatMoney(logAmount)})`
                                : `Log the remaining ${formatMoney(logAmount)}`}
                        </button>
                    )}
                    {undoStack.length > 0 && (
                        <button type="button" className="sf-btn-quiet" onClick={undo} disabled={busy}>
                            <Undo2 size={15} aria-hidden="true" /> Undo
                        </button>
                    )}
                    {!status.funded && !status.pastDue && (
                        <span className="sf-muted gd-left">
                            {plural(status.paychecksLeft, 'paycheck')} left, due {formatDate(goal.goal_date)}
                        </span>
                    )}
                    {status.pastDue && <span className="sf-past-due gd-left">Past due since {formatDate(goal.goal_date)}</span>}
                </div>
                {error && <p className="gd-error" role="alert">{error}</p>}
            </section>

            <section className="gd-schedule">
                <h2 className="gd-section-title">Plan by paycheck</h2>
                {rows.length === 0 ? (
                    <p className="sf-muted">
                        {status.funded ? 'This goal is fully funded.' : 'No paydays left before the due date.'}
                    </p>
                ) : (
                    <table className="gd-table">
                        <thead>
                            <tr>
                                <th scope="col">Payday</th>
                                <th scope="col" className="gd-right">Contribution</th>
                                <th scope="col" className="gd-right">Saved by then</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(({ date, contribution, cumulative, reached }, i) => {
                                // First row = the paycheck "Log" fills next.
                                const isFirst = i === 0;
                                return (
                                    <tr key={date} className={isFirst ? 'is-next' : ''}>
                                        <td>
                                            {formatDate(date, { weekday: true })}
                                            {isFirst && <span className="gd-tag">Log next</span>}
                                        </td>
                                        <td className="gd-right sf-num">{formatMoney(contribution)}</td>
                                        <td className="gd-right sf-num">
                                            {formatMoney(cumulative)}
                                            {reached && <span className="gd-tag gd-tag-done">Goal reached</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </section>

            <div className="gd-danger">
                <button type="button" className="gd-delete" onClick={remove}>
                    <Trash2 size={15} aria-hidden="true" /> Delete goal
                </button>
            </div>
        </div>
    );
}

export default InfoPage;
