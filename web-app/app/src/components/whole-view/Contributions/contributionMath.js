import { toCents } from '../SinkingFunds/goalMath';

// Plan a yearly maximum across the paychecks that are left.
//
//   annualMax  the most you can put in this year
//   ytd        what's in already, counting the "as of" paycheck itself
//   paydays    the paydays still to come (after the "as of" paycheck, up to
//              and including the "reach it by" paycheck), oldest first
//   count      how many of those paychecks to contribute from, starting with
//              the next one (front-loaded). Defaults to all of them.
//
// Every contribution is the same, rounded up to the cent, and the last one
// takes up the slack so the total lands exactly on the maximum.
export function buildPlan({ annualMax, ytd, paydays, count }) {
    const remaining = Math.max(0, toCents(annualMax - ytd));
    const available = paydays.length;
    const empty = { remaining, available, count: 0, per: 0, rows: [], reached: remaining === 0 };
    if (remaining === 0 || available === 0) return empty;

    // More paychecks than cents would leave some paychecks with $0.
    const n = Math.min(Math.max(1, Math.round(count || available)), available, Math.round(remaining * 100));
    const per = Math.ceil((remaining / n) * 100 - 1e-9) / 100;
    let running = toCents(ytd);
    const rows = paydays.map((date, i) => {
        const amount = i >= n ? 0 : i === n - 1 ? toCents(remaining - per * (n - 1)) : per;
        running = toCents(running + amount);
        return { date, amount, total: running };
    });
    return { remaining, available, count: n, per, rows, reached: false, lastDate: rows[n - 1].date };
}

// How many paychecks it takes to reach the maximum at `amount` per paycheck.
export function countForAmount(remaining, available, amount) {
    if (!(amount > 0) || remaining <= 0) return available;
    return Math.min(Math.max(1, Math.ceil(remaining / amount - 1e-9)), available);
}

// Contribute different amounts over up to three back-to-back periods.
//
//   periods  [{ count, amount }], first period starting with the next paycheck.
//            `amount` is dollars per paycheck, or null for "the rest": whatever
//            the fixed periods leave, shared evenly by the open periods.
//
// Paychecks after the last period get nothing. `diff` says how far the plan is
// from the maximum: positive means short, negative means over.
export function buildPeriodPlan({ annualMax, ytd, paydays, periods }) {
    const remaining = Math.max(0, toCents(annualMax - ytd));
    const available = paydays.length;
    let used = 0;
    const spans = periods.map((p) => {
        const count = Math.max(0, Math.min(Math.round(Number(p.count)) || 0, available - used));
        const open = p.amount === null || p.amount === undefined || p.amount === '';
        const span = { start: used, count, open, fixed: open ? 0 : Math.max(0, Number(p.amount) || 0) };
        used += count;
        return span;
    });

    const fixedTotal = toCents(spans.reduce((sum, p) => sum + (p.open ? 0 : p.fixed * p.count), 0));
    const openCount = spans.reduce((sum, p) => sum + (p.open ? p.count : 0), 0);
    const pool = Math.max(0, toCents(remaining - fixedTotal));
    const openPer = openCount ? Math.ceil((pool / openCount) * 100 - 1e-9) / 100 : 0;

    const amounts = new Array(available).fill(0);
    let openSeen = 0;
    spans.forEach((p) => {
        for (let i = 0; i < p.count; i += 1) {
            if (!p.open) {
                amounts[p.start + i] = p.fixed;
            } else {
                openSeen += 1;
                // The last open paycheck takes up the cents.
                amounts[p.start + i] = openSeen === openCount ? Math.max(0, toCents(pool - openPer * (openCount - 1))) : openPer;
            }
        }
    });

    let running = toCents(ytd);
    const rows = paydays.map((date, i) => {
        running = toCents(running + amounts[i]);
        return { date, amount: amounts[i], total: running };
    });
    const total = toCents(amounts.reduce((sum, a) => sum + a, 0));
    const lastIndex = amounts.reduce((last, a, i) => (a > 0 ? i : last), -1);

    return {
        remaining,
        available,
        rows,
        total,
        diff: toCents(remaining - total),
        reached: remaining === 0,
        lastDate: lastIndex >= 0 ? paydays[lastIndex] : null,
        spans: spans.map((p) => ({
            count: p.count,
            open: p.open,
            per: p.count ? amounts[p.start] : 0,
            startDate: p.count ? paydays[p.start] : null,
            endDate: p.count ? paydays[p.start + p.count - 1] : null,
        })),
        usedCount: used,
    };
}
