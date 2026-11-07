# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A personal finance web app for tracking "sinking funds" (savings goals), credit card balances, and an Ally Bank balance. Flask + SQLite backend, React frontend. See [README.md](README.md) for feature/user-facing docs and the full API endpoint list.

## Running the app

```bash
./start_app.sh          # starts both backend and frontend, backs up the db first
```

Or without a terminal: `./make_desktop_app.sh` builds **Sinking Funds.app** on the Desktop, a native dialog that shows what's running and starts/stops/opens the real app or the test instance and restores the backup. It also writes the Desktop `Sinking Funds.command`, which runs `./menu.sh`, the same menu in Terminal. It drives `./app_control.sh status | start real|test | stop real|test | open real|test`, which runs the start scripts in the background (logs in `.run/`).

To experiment without touching real data, run a second, isolated instance alongside it:

```bash
./start_test.sh          # fresh fake sample data -> localhost:3001 / :5002
./start_test.sh --keep   # reuse the test db from last run
./start_test.sh --empty  # start from an empty db
```

The test instance uses `src/paycheck/sinkingFunds_test.db` (gitignored), its own session cookie names, and shows an orange navbar + "TEST DATA" badge. Wiring: backend reads `SINKING_FUNDS_DB` (db path, defaults to the absolute path of `src/paycheck/sinkingFunds.db`) and `PORT` (default 5001); frontend reads `REACT_APP_API_PORT` (default 5001) and `REACT_APP_ENV_LABEL`.

Or manually:

```bash
# Backend (http://127.0.0.1:5001, debug=True)
cd src/paycheck
pip install flask flask-cors
python flask-connector.py

# Frontend (http://localhost:3000, proxies API calls to :5001)
cd web-app/app
npm install
npm start
```

There are no automated tests (frontend or backend). Python dependencies are in `src/paycheck/requirements.txt`; the only linting is CRA's built-in `eslintConfig` in `web-app/app/package.json`.

There is no migration tool: tables self-create lazily — e.g. `get_all_data()`, `get_all_credit_cards()`, `get_ally_bank_balance()` check `table_exists()` and call the relevant `setup_*_database()` if missing, and `ensure_*_columns()` helpers add columns to older databases (see [database.py](src/paycheck/database.py)). For a clean slate, use the test instance (`./start_test.sh --empty`).

## Repo layout gotcha

The frontend lives entirely under `web-app/app/` (there is nothing else in `web-app/`).

## Backend architecture

- [flask-connector.py](src/paycheck/flask-connector.py) — all HTTP routes. Thin wrappers that parse query args/JSON body and call into `database.py`/`paycheck.py`. Three route groups: sinking funds (`/get_data`, `/add_category`, `/update_field`, `/recalculate_all`, ...), credit cards (`/get_credit_cards`, `/update_credit_card_balance`, ...), and Ally Bank (`/get_ally_bank_balance`, `/update_ally_bank_balance`).
- [database.py](src/paycheck/database.py) — all SQL logic for three tables: `savings`, `credit_cards`, `ally_bank`. Uses raw `sqlite3` via `utils/database_utils.py` (`execute_query`/`select_query`), opening/closing a new connection per call — no ORM, no connection pooling. **Many queries build SQL with f-strings instead of parameterized queries** (e.g. `update_field`, `delete_row_based_on_category`, `get_category_info`) — be careful not to introduce new injection points when touching these, and prefer the parameterized style already used elsewhere (e.g. `add_savings_category`) for new code.
- `validate_primary_key()` in database.py is the gatekeeper used before mutating a row by category name or numeric id — most write paths call it first.
- [paycheck.py](src/paycheck/paycheck.py) + [schedules/bimonthly.py](src/paycheck/schedules/bimonthly.py) — the actual savings-per-paycheck math, dispatched by a `frequency` string. Only `"bimonthly"` is implemented (paydays = 15th and last day of month, shifted back to Friday if it falls on a weekend). Adding a new pay schedule means adding a new module under `schedules/` and a new branch in `paycheck.py`'s dispatch functions (`saved_by_paycheck`, `save_per_paycheck`).
- [utils/reference/database_constants.py](src/paycheck/utils/reference/database_constants.py) — single `DATABASE_NAME` constant (`sinkingFunds.db`) used everywhere via import.
- Credit card balance model: `total_balance = posted_transactions + pending_transactions - covered_transactions`. `covered_sub_balances`/`pending_sub_balances` store itemized breakdowns as JSON strings; updating them (`update_covered_sub_balances`/`update_pending_sub_balances`) recalculates the aggregate field and `total_balance` together — keep both in sync if editing this logic.

## Frontend architecture

- Entry point [App.js](web-app/app/src/App.js) sets up routes (`/dashboard`, `/sinking-funds`, `/credit-cards`, `/budget-categories`, `/contributions`, `/settings`, `/users/:id/:categoryName`) and mounts the bottom-left tools dock (calculator + notes). Recalculating lives in the Sinking Funds status pill; each goal's plan start (`calculated_from` / `plan_start`) drives its schedule.
- [components/utils/api.js](web-app/app/src/components/utils/api.js) is the only place that talks to the Flask backend (all `fetch` calls). [components/utils/lib.js](web-app/app/src/components/utils/lib.js) builds query-string URLs (`url()`, `obj()`), has `getTodayDate()`, and `isTestEnv`.
- `components/whole-view/` holds one folder per page/feature (Grid = Sinking Funds overview, InfoPage = goal detail, SinkingFunds = their shared parts, BudgetCategories, CreditCards, Contributions = yearly-maximum planner for 401k/Roth IRA style accounts (math in `Contributions/contributionMath.js`), Dashboard, Login, Settings = read-only list of the math rules, Tools = calculator/notes dock, Nav), each with its own `.js`/`.css` pair. CRA loads every stylesheet on every page, so page CSS uses a class prefix (`sf-`, `gd-`, `bc-`, `ct-`, `lg-`, `td-`, `st-`).
- Drag-and-drop reordering (sinking fund cards and credit cards) uses `@dnd-kit`; reorder is persisted via `updateCardOrder`/`updateCreditCardOrder` in api.js, which hit `/update_card_order`/`/update_credit_card_order`.

## Commit conventions

Prefix every commit subject with its type: `(fix)`, `(feature)`, or `(other)` — e.g. `(fix) Stop zoomed-in pages from cutting off the top`. Use `(other)` for docs, tooling, and refactors that are neither a fix nor a feature.

## Data sensitivity

This repo is pushed to a **public** GitHub remote (`origin` = jcorf/sinking-funds). Real personal financial data lives only in `src/paycheck/sinkingFunds.db`, which is gitignored along with `src/paycheck/backups/`, `.env` and `test.env`. Never commit or force-add db or env files. The real app keeps **one** rolling backup, `src/paycheck/backups/sinkingFunds_latest.db`, overwritten on start, stop, and logout via `backup_db.sh` / the backend's logout route. `./restore_db.sh` (also `app_control.sh restore` and the desktop app's Restore backup…) restores it, saving the current db as `backups/sinkingFunds_before_restore.db` first. The test instance uses fake sample data (`seed_demo_data.py`) and never backs up.
