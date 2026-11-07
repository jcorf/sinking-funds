# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: the owner.** One person managing their own money, paid on a bimonthly schedule (15th and last day of the month). They use it on a laptop or desktop, often with browser zoom turned up.
- **Later: other people.** The owner may open the app to others eventually. Today it is single-user (one login). Who those others would be, and what they would need, is **undecided**.

## Product Purpose

A personal money planner built around the paycheck. For each payday it answers three questions:

1. **Sinking funds:** how much to set aside this paycheck so each savings goal is fully funded by its due date.
2. **Budget:** where this paycheck goes, from gross pay through pre-tax deductions, taxes, post-tax contributions and budget categories, down to what's left over.
3. **Credit cards:** whether the money saved in the savings "bucket" (an Ally Bank account) covers what is owed on the credit cards.

Success: on payday and between paydays, the owner knows exactly what to move where, and trusts the numbers enough not to double-check them in a spreadsheet.

## Positioning

Why this exists instead of a budgeting app or a spreadsheet:

- **Everything is worked out per paycheck.** Goals and budgets are expressed as amounts per paycheck on the owner's actual pay schedule, with paydays that land on a weekend moved back to the Friday before. General budgeting tools work by month or by transaction.
- **Card debt is set against savings.** Each card's posted, pending and covered amounts are weighed against the savings bucket to show the net change: how much money actually needs to move.
- **Self-hosted and private.** There's no subscription, the data stays on the owner's machine, and the app can be shaped to how they think.

## Operating Context

- **Every payday:** divide up the new paycheck, update the sinking funds, rebalance the categories.
- **Several times a week:** check card balances and pending charges, and mark charges as covered from the bucket.
- **Occasionally, when planning:** add a new goal, rethink the budget, recalculate from a new start date.
- **Running it:** locally via `./start_app.sh`, which backs up the database first. `./start_test.sh` starts an isolated copy of the app on separate ports with an orange navbar, for trying things out without touching real data.

## Capabilities and Constraints

- **Pages:** Dashboard, Sinking Funds (a grid of goal cards plus a detail page for each goal), Credit Cards (including the savings bucket), Budget Categories (categories, paycheck setup, and a pinned "This paycheck" calculation), and Recalculate (pick a start date).
- **Pay schedule:** only the bimonthly schedule is implemented; others would need a new schedule module.
- **Login:** single user. Supporting more than one user is not built yet.
- **Terminology:**
  - "sinking fund"
  - "bucket" / "Saved in Bucket" (the Ally savings account)
  - "posted" / "pending" / "covered" (credit card charges)
  - "gross pay" (stored in the database as `net_pay`)
  - "available to budget"
  - "leftover"
- **Data:** the real financial data lives in a local SQLite database, and the GitHub repo is **public**. Real numbers must never appear in commits, screenshots, fixtures or anything else made public.
- **Testing:** no backend test suite and almost no frontend tests. UI changes get checked by rendering them.

## Evidence on Hand

- There are no testimonials, users beyond the owner, or published metrics. Do not invent any.
- The real financial data is private. Demos and visual checks use mock data or the test instance.

## Product Principles

1. **The paycheck is the unit.** Every number should answer "what do I do with this paycheck?"
2. **Numbers you can trust.** Every total should visibly trace back to the inputs that produce it. Saves must never be lost, half-applied, or out of order.
3. **Private by default.** Real data never leaves the owner's machine or ends up in the public repo.
4. **Routine is fast.** The payday routine and the quick card check should take only a few steps and never involve hunting for the result.
5. **Built for one, don't block more.** Design for the owner first, but avoid assumptions that would block other users or other pay schedules later, while that decision is still open.

## Accessibility & Inclusion

- The owner regularly uses browser zoom. Every page must stay fully usable when zoomed in, with no content cut off or covered by the navbar.
