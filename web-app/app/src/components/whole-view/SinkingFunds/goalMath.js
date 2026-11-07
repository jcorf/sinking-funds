// Formatting and status helpers shared by the Sinking Funds overview and
// detail pages. Dates arrive as "YYYY-MM-DD" strings and are compared as
// strings (which sort correctly) or parsed as local dates, never UTC.

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export const formatMoney = (amount) => money.format(Number(amount) || 0);

// Cents-accurate value the way it will be stored/added.
export const toCents = (amount) => Math.round((Number(amount) || 0) * 100) / 100;

export function parseDate(isoDate) {
    if (!isoDate) return null;
    const [y, m, d] = String(isoDate).slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
}

export function formatDate(isoDate, { weekday = false, year = true } = {}) {
    const date = parseDate(isoDate);
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
        ...(weekday ? { weekday: 'short' } : {}),
        month: 'short',
        day: 'numeric',
        ...(year ? { year: 'numeric' } : {}),
    });
}

export function formatPercent(fraction) {
    const pct = Math.max(0, fraction * 100);
    if (pct >= 100) return '100%';
    // One decimal below 10%, whole numbers above; never round up to 100%.
    const shown = pct < 10 ? Math.floor(pct * 10) / 10 : Math.floor(pct);
    return `${shown}%`;
}

// "2026-10-30" shifted by whole days, as "YYYY-MM-DD" (local, no UTC drift).
export function shiftDate(isoDate, days) {
    const d = parseDate(isoDate);
    if (!d) return null;
    d.setDate(d.getDate() + days);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Recalculating "from" a payday starts the day before it, so that payday is
// definitely counted in the plan.
export const recalcStartFor = (payday) => shiftDate(payday, -1);

export const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

export function goalStatus(goal, payday) {
    const saved = Number(goal.saved) || 0;
    const target = Number(goal.goal) || 0;
    const perPaycheck = toCents(goal.calculated_to_save);
    const funded = target > 0 && saved >= target;
    const today = payday && payday.today;
    const pastDue = !funded && today && goal.goal_date < today;
    const remaining = Math.max(0, target - saved);
    const paychecksLeft = funded || perPaycheck <= 0 ? 0 : Math.ceil(remaining / perPaycheck - 1e-9);

    // Amounts are planned from a start payday (calculated_from). Starting at
    // the most recent payday or later is current: "previous" means that
    // paycheck is still counted, "next" means planning starts with the
    // upcoming one. Anything older is out of date.
    let freshness = 'current';
    let basis = null;
    if (!goal.calculated_from) freshness = 'unknown';
    else if (payday && payday.previous && goal.calculated_from < recalcStartFor(payday.previous)) freshness = 'stale';
    else if (payday && payday.previous) basis = goal.calculated_from <= payday.previous ? 'previous' : 'next';

    return {
        saved,
        target,
        perPaycheck,
        funded,
        pastDue,
        remaining,
        paychecksLeft,
        fraction: target > 0 ? Math.min(1, saved / target) : 0,
        freshness,
        basis,
    };
}

// ---- Recurring goals ------------------------------------------------------

// How often a goal comes back (savings.repeat_months; 0 = one-off).
export const REPEAT_OPTIONS = [
    { months: 0, label: "Doesn't repeat" },
    { months: 1, label: 'Every month' },
    { months: 3, label: 'Every 3 months' },
    { months: 6, label: 'Every 6 months' },
    { months: 12, label: 'Every year' },
];

export function repeatLabel(months) {
    const n = Number(months) || 0;
    const match = REPEAT_OPTIONS.find((o) => o.months === n);
    return match ? match.label : `Every ${n} months`;
}

// "YYYY-MM-DD" plus whole months, clamping the day (Jan 31 + 1 -> Feb 28).
// Mirrors add_months in the backend.
export function addMonths(isoDate, months) {
    const d = parseDate(isoDate);
    if (!d) return null;
    const total = d.getFullYear() * 12 + d.getMonth() + months;
    const y = Math.floor(total / 12);
    const m = total % 12;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const pad = (n) => String(n).padStart(2, '0');
    return `${y}-${pad(m + 1)}-${pad(Math.min(d.getDate(), lastDay))}`;
}

// The due date of a recurring goal's next cycle: moved forward by its
// interval until it lands after today. Mirrors next_cycle_due_date.
export function nextCycleDate(goalDate, months, today) {
    const n = Number(months) || 0;
    if (!n || !goalDate) return null;
    let next = addMonths(goalDate, n);
    while (today && next <= today) next = addMonths(next, n);
    return next;
}
