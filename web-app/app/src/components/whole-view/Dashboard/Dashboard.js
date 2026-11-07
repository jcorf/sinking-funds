import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarClock, Check, CreditCard, RefreshCw, Wallet } from 'lucide-react';
import './Dashboard.css';
import { getAllData, getAllyBankBalance, getNextPayday } from '../../utils/api';
import { url } from '../../utils/lib';
import { formatDate, formatMoney, formatPercent, goalStatus, plural, shiftDate, toCents } from '../SinkingFunds/goalMath';

// Categorical colors for "Where the next paycheck goes" — validated with the
// dataviz palette checks (lightness band, chroma, CVD + normal-vision
// separation, >= 3:1 on white). Fixed order; a 7th+ goal folds into "Other".
const SERIES = ['#2e7d4f', '#2d6cb5', '#cf6b25', '#7b59c9', '#b8407f', '#6f7f12'];
const OTHER_COLOR = '#8b9586';
const MAX_SLICES = 6;

const fmtShort = (d) => formatDate(d, { year: false });
const fmtPayday = (d) => formatDate(d, { weekday: true, year: false });

/* ------------------------------ To-do list ------------------------------ */

function TodoItem({ icon: Icon, children, action, onAction }) {
    return (
        <li className="db-todo">
            <span className="db-todo-icon" aria-hidden="true">
                <Icon size={18} strokeWidth={1.75} />
            </span>
            <span className="db-todo-text">{children}</span>
            <button type="button" className="db-todo-action" onClick={onAction}>
                {action}
                <ArrowRight size={15} aria-hidden="true" />
            </button>
        </li>
    );
}

/* ---------------------- Where the next paycheck goes --------------------- */

function PaycheckSplit({ slices, total }) {
    const [hovered, setHovered] = useState(null);
    if (!slices.length) {
        return <p className="db-muted db-split-empty">Every goal is funded. Nothing to split this paycheck.</p>;
    }
    return (
        <figure className="db-split">
            <figcaption className="db-split-title">Where the next paycheck goes</figcaption>
            <div className="db-split-bar" role="img" aria-label={`${formatMoney(total)} split across ${plural(slices.length, 'goal')}`}>
                {slices.map((s) => (
                    <span
                        key={s.key}
                        className={`db-split-seg ${hovered && hovered !== s.key ? 'is-dim' : ''}`}
                        style={{ flexGrow: s.amount, background: s.color }}
                        title={`${s.name}: ${formatMoney(s.amount)} (${formatPercent(s.amount / total)})`}
                        onMouseEnter={() => setHovered(s.key)}
                        onMouseLeave={() => setHovered(null)}
                    />
                ))}
            </div>
            <ul className="db-split-list">
                {slices.map((s) => (
                    <li
                        key={s.key}
                        className={hovered === s.key ? 'is-hovered' : ''}
                        onMouseEnter={() => setHovered(s.key)}
                        onMouseLeave={() => setHovered(null)}
                    >
                        <span className="db-swatch" style={{ background: s.color }} aria-hidden="true" />
                        <span className="db-split-name">{s.name}</span>
                        <span className="db-num db-split-amount">{formatMoney(s.amount)}</span>
                        <span className="db-num db-muted db-split-share">{formatPercent(s.amount / total)}</span>
                    </li>
                ))}
            </ul>
        </figure>
    );
}

/* --------------------------------- Page --------------------------------- */

export default function Dashboard() {
    const navigate = useNavigate();
    const [goals, setGoals] = useState(null);
    const [cards, setCards] = useState(null);
    const [bucket, setBucket] = useState(null);
    const [payday, setPayday] = useState(null);
    const [failed, setFailed] = useState({});

    useEffect(() => {
        window.scrollTo(0, 0);
        getAllData()
            .then((d) => (d && d.data ? setGoals(d.data) : setFailed((f) => ({ ...f, goals: true }))))
            .catch(() => setFailed((f) => ({ ...f, goals: true })));
        fetch(url('/get_credit_cards'), { credentials: 'include' })
            .then((r) => r.json())
            .then((d) => setCards(d.data || []))
            .catch(() => setFailed((f) => ({ ...f, cards: true })));
        getAllyBankBalance().then(setBucket);
        getNextPayday().then(setPayday);
    }, []);

    const g = useMemo(() => {
        if (!goals) return null;
        const statuses = goals.map((goal) => ({ goal, s: goalStatus(goal, payday) }));
        const contributing = statuses.filter(({ s }) => !s.funded && s.perPaycheck > 0);
        const today = payday ? payday.today : null;
        return {
            statuses,
            contributing,
            totalSaved: toCents(statuses.reduce((sum, { s }) => sum + s.saved, 0)),
            totalGoal: toCents(statuses.reduce((sum, { s }) => sum + s.target, 0)),
            perPaycheck: toCents(contributing.reduce((sum, { s }) => sum + s.perPaycheck, 0)),
            fundedCount: statuses.filter(({ s }) => s.funded).length,
            // Paychecks whose plan start has arrived but haven't been logged
            dueToLog: contributing.filter(({ goal, s }) => s.freshness === 'current' && today && goal.plan_start && goal.plan_start <= today),
            outOfDate: statuses.filter(({ s }) => !s.funded && s.freshness !== 'current'),
            dueSoon: statuses
                .filter(({ goal, s }) => !s.funded && today && goal.goal_date <= shiftDate(today, 30))
                .sort((a, b) => (a.goal.goal_date < b.goal.goal_date ? -1 : 1)),
        };
    }, [goals, payday]);

    const totalOwed = cards ? toCents(cards.reduce((sum, c) => sum + (Number(c.total_balance) || 0), 0)) : null;
    const net = totalOwed !== null && bucket !== null ? toCents(totalOwed - bucket) : null;

    // Slices: largest contributions first; beyond MAX_SLICES fold into Other.
    const slices = useMemo(() => {
        if (!g) return [];
        const sorted = [...g.contributing].sort((a, b) => b.s.perPaycheck - a.s.perPaycheck);
        const shown = sorted.length > MAX_SLICES ? sorted.slice(0, MAX_SLICES - 1) : sorted;
        const rest = sorted.slice(shown.length);
        // Color follows the goal: assign slots in the goals' own list order.
        const byListOrder = [...shown].sort((a, b) => g.statuses.indexOf(a) - g.statuses.indexOf(b));
        const color = new Map(byListOrder.map((x, i) => [x.goal.id, SERIES[i]]));
        const out = shown.map(({ goal, s }) => ({ key: goal.id, name: goal.category, amount: s.perPaycheck, color: color.get(goal.id) }));
        if (rest.length) {
            out.push({
                key: 'other',
                name: `Other (${plural(rest.length, 'goal')})`,
                amount: toCents(rest.reduce((sum, { s }) => sum + s.perPaycheck, 0)),
                color: OTHER_COLOR,
            });
        }
        return out;
    }, [g]);

    const todos = [];
    if (g && g.dueToLog.length) {
        const starts = g.dueToLog.map(({ goal }) => goal.plan_start).sort();
        const amount = toCents(g.dueToLog.reduce((sum, { s }) => sum + s.perPaycheck, 0));
        todos.push(
            <TodoItem key="log" icon={Wallet} action="Log it" onAction={() => navigate('/sinking-funds?log=1')}>
                <strong>Log the {fmtPayday(starts[0])} paycheck:</strong> {formatMoney(amount)} across{' '}
                {plural(g.dueToLog.length, 'goal')}
            </TodoItem>
        );
    }
    if (net !== null && net > 0.004) {
        todos.push(
            <TodoItem key="bucket" icon={CreditCard} action="Credit Cards" onAction={() => navigate('/credit-cards')}>
                <strong>Move {formatMoney(net)} into the bucket.</strong> Your cards owe more than it holds.
            </TodoItem>
        );
    }
    if (g && g.outOfDate.length) {
        todos.push(
            <TodoItem key="recalc" icon={RefreshCw} action="Recalculate" onAction={() => navigate('/sinking-funds')}>
                <strong>
                    {plural(g.outOfDate.length, 'goal')} {g.outOfDate.length === 1 ? 'needs' : 'need'} recalculating.
                </strong>{' '}
                {payday && payday.previous ? `Planned before the ${fmtShort(payday.previous)} paycheck.` : ''}
            </TodoItem>
        );
    }
    if (g) {
        g.dueSoon.slice(0, 3).forEach(({ goal, s }) =>
            todos.push(
                <TodoItem
                    key={`due-${goal.id}`}
                    icon={CalendarClock}
                    action="Open"
                    onAction={() => navigate(`/users/${goal.id}/${encodeURIComponent(goal.category)}`)}
                >
                    <strong>
                        {goal.category} {s.pastDue ? `was due ${fmtShort(goal.goal_date)}` : `is due ${fmtShort(goal.goal_date)}`}:
                    </strong>{' '}
                    {formatMoney(s.remaining)} still needed
                </TodoItem>
            )
        );
    }
    const moreDue = g ? Math.max(0, g.dueSoon.length - 3) : 0;
    const ready = g !== null || failed.goals;

    const netState = net === null ? null : net > 0.004 ? 'short' : net < -0.004 ? 'ahead' : 'even';

    return (
        <div className="db-page">
            <h1 className="db-title">Dashboard</h1>

            <section className="db-section" aria-labelledby="db-todo-title">
                <h2 id="db-todo-title">Needs doing</h2>
                {!ready ? (
                    <p className="db-muted">Loading…</p>
                ) : todos.length ? (
                    <ul className="db-todos">
                        {todos}
                        {moreDue > 0 && (
                            <li className="db-todo-more">
                                <Link to="/sinking-funds">and {plural(moreDue, 'more goal')} due soon</Link>
                            </li>
                        )}
                    </ul>
                ) : (
                    <div className="db-caught-up">
                        <Check size={18} aria-hidden="true" />
                        <span>
                            <strong>All caught up.</strong>
                            {payday && payday.next ? ` Next paycheck: ${fmtPayday(payday.next)}.` : ''}
                        </span>
                    </div>
                )}
            </section>

            <section className="db-section" aria-labelledby="db-glance-title">
                <h2 id="db-glance-title">At a glance</h2>
                <div className="db-panels">
                    <article className="db-panel">
                        <header className="db-panel-header">
                            <h3>Sinking funds</h3>
                            <Link to="/sinking-funds" className="db-panel-link">
                                Open <ArrowRight size={14} aria-hidden="true" />
                            </Link>
                        </header>
                        {failed.goals ? (
                            <p className="db-error">Couldn't load your goals.</p>
                        ) : !g ? (
                            <p className="db-muted">Loading…</p>
                        ) : g.statuses.length === 0 ? (
                            <p className="db-muted">
                                No goals yet. <Link to="/sinking-funds">Add your first one</Link>.
                            </p>
                        ) : (
                            <>
                                <div className="db-figure-row">
                                    <span className="db-figure db-num">{formatMoney(g.totalSaved)}</span>
                                    <span className="db-muted">
                                        saved of <span className="db-num">{formatMoney(g.totalGoal)}</span>
                                    </span>
                                </div>
                                <div
                                    className="sf-progress db-progress"
                                    role="progressbar"
                                    aria-label="Saved of all goals"
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={Math.round((g.totalGoal ? g.totalSaved / g.totalGoal : 0) * 100)}
                                >
                                    <div
                                        className="sf-progress-fill"
                                        style={{ width: `${Math.min(1, g.totalGoal ? g.totalSaved / g.totalGoal : 0) * 100}%` }}
                                    />
                                </div>
                                <dl className="db-stats">
                                    <div>
                                        <dt>Per paycheck</dt>
                                        <dd className="db-num">{formatMoney(g.perPaycheck)}</dd>
                                    </div>
                                    <div>
                                        <dt>Funded</dt>
                                        <dd className="db-num">
                                            {g.fundedCount} of {g.statuses.length}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt>Progress</dt>
                                        <dd className="db-num">{formatPercent(g.totalGoal ? g.totalSaved / g.totalGoal : 0)}</dd>
                                    </div>
                                </dl>
                                <PaycheckSplit slices={slices} total={g.perPaycheck} />
                            </>
                        )}
                    </article>

                    <article className={`db-panel db-net ${netState ? `is-${netState}` : ''}`}>
                        <header className="db-panel-header">
                            <h3>Cards vs bucket</h3>
                            <Link to="/credit-cards" className="db-panel-link">
                                Open <ArrowRight size={14} aria-hidden="true" />
                            </Link>
                        </header>
                        {failed.cards ? (
                            <p className="db-error">Couldn't load your cards.</p>
                        ) : cards === null ? (
                            <p className="db-muted">Loading…</p>
                        ) : cards.length === 0 ? (
                            <p className="db-muted">
                                No cards yet. <Link to="/credit-cards">Add one</Link>.
                            </p>
                        ) : (
                            <>
                                <dl className="db-lines">
                                    <div>
                                        <dt>Total owed</dt>
                                        <dd className="db-num">{formatMoney(totalOwed)}</dd>
                                    </div>
                                    <div>
                                        <dt>
                                            <span className="db-op">−</span>Saved in bucket
                                        </dt>
                                        <dd className="db-num">{bucket === null ? '—' : formatMoney(bucket)}</dd>
                                    </div>
                                </dl>
                                {net !== null && (
                                    <div className="db-net-result">
                                        <div className="db-net-label">
                                            {netState === 'short'
                                                ? 'Move into the bucket'
                                                : netState === 'ahead'
                                                  ? 'Bucket covers your cards'
                                                  : 'Bucket matches your cards'}
                                        </div>
                                        <div className="db-figure db-num db-net-value">{formatMoney(Math.abs(net))}</div>
                                        <p className="db-muted db-net-note">
                                            {netState === 'short'
                                                ? `Your cards owe ${formatMoney(net)} more than the bucket holds.`
                                                : netState === 'ahead'
                                                  ? `${formatMoney(-net)} to spare.`
                                                  : 'Nothing to move.'}
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </article>
                </div>
            </section>
        </div>
    );
}
