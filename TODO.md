# TODO

## Make Settings editable

The Settings page (`/settings`) currently lists the math rules read-only. Candidates
to make adjustable, roughly in order of usefulness:

### Paycheck schedule
- [ ] **Pay frequency**: semi-monthly today. Add biweekly, weekly and monthly
  (new modules under `src/paycheck/schedules/` and a branch in `paycheck.py`'s
  dispatch functions, per CLAUDE.md).
- [ ] **Paydays**: the 15th and the last day of the month today. Let either day
  be picked (e.g. 1st and 15th).
- [ ] **Weekend rule**: paid the Friday before today (Sunday moves back two
  days). Options: Friday before, the day before, or the following Monday.
- [ ] **Holidays**: not adjusted for today. Optionally move paydays off bank
  holidays.
- [ ] **Biweekly anchor date**: needed once biweekly exists (a known payday to
  count from).

### Sinking funds
- [ ] **Recalculate start**: plans from the day before the chosen payday today.
- [ ] **Rounding**: shown to the cent, last paycheck absorbs leftovers. Option to
  round per-paycheck amounts up to whole dollars.
- [ ] **Spend from fund default**: "Lower the goal too" is on by default.

### Paycheck page
- [ ] **Paychecks per year** used by What If's yearly figure (24 today; should
  follow the pay frequency automatically).

### Overview
- [ ] **"Due soon" window**: 30 days today.

### Notes
- Settings will need a small backend table (single row, like
  `paycheck_settings`) and every place that hard-codes these values to read
  from it: `schedules/bimonthly.py`, `goalMath.js` (`recalcStartFor`),
  `BudgetCategories.js` (`PAYCHECKS_PER_YEAR`), `Dashboard.js` (due-soon window).
- Changing the schedule changes every goal's per-paycheck amount, so editing it
  should offer to recalculate all goals.
