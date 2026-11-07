import './InfoPage.css';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Plus, Receipt, Repeat, Trash2, Undo2, X } from 'lucide-react';
import {
    deleteCategory,
    getCategoryData,
    getGoalSpending,
    getNextPayday,
    getPaycheckSchedule,
    removeGoalSpending,
    spendFromGoal,
    updateField,
} from '../../utils/api';
import {
    REPEAT_OPTIONS,
    formatDate,
    formatMoney,
    formatPercent,
    goalStatus,
    nextCycleDate,
    plural,
    repeatLabel,
    shiftDate,
    toCents,
} from '../SinkingFunds/goalMath';
import { getTodayDate } from '../../utils/lib';
import { IconPicker, MoneyInput } from '../SinkingFunds/GoalParts';
import { celebrate, newlyFunded } from '../SinkingFunds/celebrate';

// Record money taken out of this fund (the trip happened, the bill got
// paid). For a recurring goal it can also start the next cycle.
function SpendForm({ goal, today, onCancel, onSaved }) {
    const repeats = Number(goal.repeat_months) > 0;
    const [amount, setAmount] = useState(0);
    const [note, setNote] = useState('');
    const [spentOn, setSpentOn] = useState(today);
    const [nextCycle, setNextCycle] = useState(repeats);
    const [lowerGoal, setLowerGoal] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const saved = Number(goal.saved) || 0;
    const fromSaved = Math.min(amount, saved);
    const leftover = toCents(saved - fromSaved);
    const nextDue = repeats ? nextCycleDate(goal.goal_date, goal.repeat_months, today) : null;
    // A new cycle keeps its goal; otherwise spent money can come off the goal.
    const startingCycle = repeats && nextCycle;
    const target = Number(goal.goal) || 0;
    const newGoal = toCents(Math.max(0, target - amount));

    const submit = async (e) => {
        e.preventDefault();
        if (amount <= 0) {
            setError('Enter how much you spent.');
            return;
        }
        setBusy(true);
        setError('');
        const result = await spendFromGoal(goal.id, {
            amount,
            note,
            spentOn: spentOn || today,
            nextCycle: startingCycle,
            lowerGoal: !startingCycle && lowerGoal,
            startDate: goal.calculated_from || today,
        });
        setBusy(false);
        if (result.error) setError(result.error);
        else onSaved(result.spending);
    };

    return (
        <form className="gd-spend" onSubmit={submit} aria-label={`Spend from ${goal.category}`}>
            <h3 className="gd-spend-title">Spend from this fund</h3>
            <div className="gd-spend-fields">
                <label className="gd-field">
                    <span>Amount</span>
                    <MoneyInput value={amount} label="Amount spent" onPreview={setAmount} onCommit={setAmount} />
                </label>
                <label className="gd-field gd-spend-note">
                    <span>What for (optional)</span>
                    <input
                        type="text"
                        className="sf-date"
                        maxLength={200}
                        value={note}
                        placeholder="e.g. Flights"
                        onChange={(e) => setNote(e.target.value)}
                    />
                </label>
                <label className="gd-field">
                    <span>Date</span>
                    <input type="date" className="sf-date" value={spentOn} onChange={(e) => setSpentOn(e.target.value)} />
                </label>
            </div>

            <p className="gd-spend-hint" aria-live="polite">
                {amount > saved + 0.004
                    ? `Only ${formatMoney(saved)} is saved here, so that empties the fund. The other ${formatMoney(
                          amount - saved
                      )} comes from somewhere else.`
                    : amount > 0
                    ? `Leaves ${formatMoney(leftover)} in this fund.`
                    : `${formatMoney(saved)} is saved here.`}
            </p>

            {repeats && (
                <label className="gd-check">
                    <input type="checkbox" checked={nextCycle} onChange={(e) => setNextCycle(e.target.checked)} />
                    <span>
                        <strong>Start the next cycle</strong>, due {formatDate(nextDue)}
                        {amount > 0 && leftover > 0 ? `, keeping the ${formatMoney(leftover)} left over toward it` : ''}
                    </span>
                </label>
            )}

            {!startingCycle && (
                <label className="gd-check">
                    <input type="checkbox" checked={lowerGoal} onChange={(e) => setLowerGoal(e.target.checked)} />
                    <span>
                        <strong>Lower the goal too</strong>
                        {amount > 0
                            ? `, from ${formatMoney(target)} to ${formatMoney(newGoal)}`
                            : ', by the amount spent'}
                    </span>
                </label>
            )}

            {error && <p className="gd-error" role="alert">{error}</p>}

            <div className="gd-spend-actions">
                <button type="submit" className="sf-btn-primary" disabled={busy}>
                    Record Spending
                </button>
                <button type="button" className="sf-btn-quiet" onClick={onCancel} disabled={busy}>
                    Cancel
                </button>
            </div>
        </form>
    );
}

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
    const [spending, setSpending] = useState(null);
    const [spendOpen, setSpendOpen] = useState(false);
    const [notice, setNotice] = useState('');

    const load = useCallback(async (category) => {
        const data = await getCategoryData(category);
        if (!data || data.error) {
            setError("Couldn't load this goal.");
            return;
        }
        setGoal(data);
        setName(data.category);
        getGoalSpending(data.id).then((rows) => rows && setSpending(rows));
        // The schedule follows the goal's own plan start, so its first row is
        // the paycheck the per-paycheck amount (and "Log") applies to.
        const sched = await getPaycheckSchedule(data.category, data.calculated_from || getTodayDate());
        setSchedule(sched && !sched.error ? sched : {});
        return data;
    }, []);

    // Confetti when a change pushes this goal over its goal (not top-ups).
    const celebrateIfFunded = (before, after) => {
        if (after && newlyFunded([before], [after]).length) celebrate();
    };

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
        const before = goal;
        if (await save(field, value)) celebrateIfFunded(before, await load(goal.category));
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
            celebrateIfFunded(goal, await load(goal.category));
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

    const today = (payday && payday.today) || getTodayDate();

    const spent = async (row) => {
        setSpendOpen(false);
        // Log undo restores old saved amounts, which a spend just changed.
        setUndoStack([]);
        setNotice(
            `Recorded ${formatMoney(row.amount)} spent.` +
                (row.new_goal_date ? ` The next cycle is due ${formatDate(row.new_goal_date)}.` : '')
        );
        await load(goal.category);
    };

    const unspend = async (row) => {
        const back = Number(row.from_saved) || 0;
        const msg =
            `Remove this entry? ${formatMoney(back)} goes back into ${goal.category}` +
            (Number(row.goal_reduced) > 0 ? `, the goal goes back up by ${formatMoney(row.goal_reduced)}` : '') +
            (row.new_goal_date && row.new_goal_date === goal.goal_date
                ? ` and the due date moves back to ${formatDate(row.previous_goal_date)}.`
                : '.');
        if (!window.confirm(msg)) return;
        setError('');
        if (await removeGoalSpending(row.id, goal.calculated_from || today)) {
            setUndoStack([]);
            setNotice('');
            await load(goal.category);
        } else {
            setError("That didn't save. Check that the app's backend is running, then try again.");
        }
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
                    {Number(goal.repeat_months) > 0 && (
                        <span className="gd-repeats">
                            <Repeat size={13} aria-hidden="true" /> {repeatLabel(goal.repeat_months)}
                        </span>
                    )}
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
                    <label className="gd-field">
                        <span>Repeats</span>
                        <select
                            className="sf-date gd-select"
                            value={Number(goal.repeat_months) || 0}
                            onChange={(e) => saveAndReload('repeat_months', Number(e.target.value))}
                        >
                            {REPEAT_OPTIONS.map((o) => (
                                <option key={o.months} value={o.months}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </label>
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
                    {!spendOpen && (
                        <button
                            type="button"
                            className="sf-btn-quiet"
                            onClick={() => {
                                setNotice('');
                                setSpendOpen(true);
                            }}
                            disabled={busy}
                        >
                            <Receipt size={15} aria-hidden="true" /> Spend from Fund
                        </button>
                    )}
                    {!status.funded && !status.pastDue && (
                        <span className="sf-muted gd-left">
                            {plural(status.paychecksLeft, 'paycheck')} left, due {formatDate(goal.goal_date)}
                        </span>
                    )}
                    {status.pastDue && <span className="sf-past-due gd-left">Past due since {formatDate(goal.goal_date)}</span>}
                </div>
                {spendOpen && (
                    <SpendForm goal={goal} today={today} onCancel={() => setSpendOpen(false)} onSaved={spent} />
                )}
                {notice && (
                    <p className="gd-notice" role="status">
                        {notice}
                    </p>
                )}
                {error && <p className="gd-error" role="alert">{error}</p>}
            </section>

            {spending && spending.length > 0 && (
                <section className="gd-schedule gd-spending">
                    <h2 className="gd-section-title">Spending</h2>
                    <table className="gd-table">
                        <thead>
                            <tr>
                                <th scope="col">Date</th>
                                <th scope="col">What for</th>
                                <th scope="col" className="gd-right">Amount</th>
                                <th scope="col" className="gd-icon-col">
                                    <span className="gd-sr">Remove</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {spending.map((row) => (
                                <tr key={row.id}>
                                    <td>{formatDate(row.spent_on)}</td>
                                    <td>
                                        {row.note || <span className="sf-muted">—</span>}
                                        {row.new_goal_date && (
                                            <span className="gd-tag gd-tag-done">
                                                Next cycle, due {formatDate(row.new_goal_date, { year: true })}
                                            </span>
                                        )}
                                    </td>
                                    <td className="gd-right sf-num">
                                        {formatMoney(row.amount)}
                                        {Number(row.from_saved) < Number(row.amount) - 0.004 && (
                                            <small className="gd-spend-from">{formatMoney(row.from_saved)} from this fund</small>
                                        )}
                                    </td>
                                    <td className="gd-icon-col">
                                        <button
                                            type="button"
                                            className="gd-row-remove"
                                            onClick={() => unspend(row)}
                                            aria-label={`Remove ${formatMoney(row.amount)} spent ${formatDate(row.spent_on)}`}
                                            title="Remove and put the money back"
                                        >
                                            <X size={14} aria-hidden="true" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            )}

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
