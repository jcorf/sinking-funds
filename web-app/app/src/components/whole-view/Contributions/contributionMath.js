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
