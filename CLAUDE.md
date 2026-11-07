# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A personal finance web app for tracking "sinking funds" (savings goals), credit card balances, and an Ally Bank balance. Flask + SQLite backend, React frontend. See [README.md](README.md) for feature/user-facing docs and the full API endpoint list.

## Running the app

```bash
./start_app.sh          # starts both backend and frontend, backs up the db first
```

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

Frontend tests: `cd web-app/app && npm test` (CRA default scaffold — there is no meaningful test coverage beyond `App.test.js`). There is no backend test suite, no requirements.txt/Pipfile, and no linter config beyond CRA's built-in `eslintConfig` in `web-app/app/package.json`.

Database setup/reset is done via POST endpoints rather than a migration tool: `/setup_database`, `/delete_database`, `/add_mock_data` (see [database.py](src/paycheck/database.py)). Tables also self-create lazily — e.g. `get_all_data()`, `get_all_credit_cards()`, `get_ally_bank_balance()` check `table_exists()` and call the relevant `setup_*_database()` if missing.

## Repo layout gotcha

`web-app/package.json` at the repo root (with `emoji-picker-react`, `react-beautiful-dnd`) is a leftover — it is **not** the real app. The actual frontend lives entirely under `web-app/app/`.

## Backend architecture

- [flask-connector.py](src/paycheck/flask-connector.py) — all HTTP routes. Thin wrappers that parse query args/JSON body and call into `database.py`/`paycheck.py`. Three route groups: sinking funds (`/get_data`, `/add_category`, `/update_field`, `/recalculate_all`, ...), credit cards (`/get_credit_cards`, `/update_credit_card_balance`, ...), and Ally Bank (`/get_ally_bank_balance`, `/update_ally_bank_balance`).
- [database.py](src/paycheck/database.py) — all SQL logic for three tables: `savings`, `credit_cards`, `ally_bank`. Uses raw `sqlite3` via `utils/database_utils.py` (`execute_query`/`select_query`), opening/closing a new connection per call — no ORM, no connection pooling. **Many queries build SQL with f-strings instead of parameterized queries** (e.g. `update_field`, `delete_row_based_on_category`, `get_category_info`) — be careful not to introduce new injection points when touching these, and prefer the parameterized style already used elsewhere (e.g. `add_savings_category`) for new code.
- `validate_primary_key()` in database.py is the gatekeeper used before mutating a row by category name or numeric id — most write paths call it first.
- [paycheck.py](src/paycheck/paycheck.py) + [schedules/bimonthly.py](src/paycheck/schedules/bimonthly.py) — the actual savings-per-paycheck math, dispatched by a `frequency` string. Only `"bimonthly"` is implemented (paydays = 15th and last day of month, shifted back to Friday if it falls on a weekend). Adding a new pay schedule means adding a new module under `schedules/` and a new branch in `paycheck.py`'s dispatch functions (`saved_by_paycheck`, `save_per_paycheck`, `remaining_paychecks`).
- [utils/reference/database_constants.py](src/paycheck/utils/reference/database_constants.py) — single `DATABASE_NAME` constant (`sinkingFunds.db`) used everywhere via import.
- Credit card balance model: `total_balance = posted_transactions + pending_transactions - covered_transactions`. `covered_sub_balances`/`pending_sub_balances` store itemized breakdowns as JSON strings; updating them (`update_covered_sub_balances`/`update_pending_sub_balances`) recalculates the aggregate field and `total_balance` together — keep both in sync if editing this logic.
- `notebooks/` contains the original Jupyter-prototype versions of the calculation logic (`sinkingFunds.py`, `calculateFunctions.py`). It's not imported by the running app — treat it as historical reference only, not a dependency.

## Frontend architecture

- Entry point [App.js](web-app/app/src/App.js) sets up routes (`/dashboard`, `/sinking-funds`, `/credit-cards`, `/budget-categories`, `/users/:id/:categoryName`) and mounts the bottom-left tools dock (calculator + notes). Recalculating lives in the Sinking Funds status pill; each goal's plan start (`calculated_from` / `plan_start`) drives its schedule.
- [components/utils/api.js](web-app/app/src/components/utils/api.js) is the only place that talks to the Flask backend (all `fetch` calls). [components/utils/lib.js](web-app/app/src/components/utils/lib.js) builds query-string URLs (`url()`, `obj()`) and has date helpers (`getTodayDate`, `getOneYearDate`) and the emoji picker list.
- `components/whole-view/` holds one folder per page/feature (Grid = Sinking Funds overview, InfoPage = goal detail, SinkingFunds = their shared parts, BudgetCategories, CreditCards, Dashboard, Login, Tools = calculator/notes dock, Summary), each with its own `.js`/`.css` pair. CRA loads every stylesheet on every page, so page CSS uses a class prefix (`sf-`, `gd-`, `bc-`, `lg-`, `td-`).
- Drag-and-drop reordering (sinking fund cards and credit cards) uses `@dnd-kit`; reorder is persisted via `updateCardOrder`/`updateCreditCardOrder` in api.js, which hit `/update_card_order`/`/update_credit_card_order`.

## Commit conventions

Prefix every commit subject with its type: `(fix)`, `(feature)`, or `(other)` — e.g. `(fix) Stop zoomed-in pages from cutting off the top`. Use `(other)` for docs, tooling, and refactors that are neither a fix nor a feature.

## Data sensitivity

This repo is pushed to a **public** GitHub remote (`origin` = jcorf/sinking-funds). The current branch, `local-db-dont-push-publicly`, exists specifically to hold real personal financial data in `src/paycheck/sinkingFunds.db` without pushing it to a public branch. Backups: the real app keeps **one** rolling backup, `src/paycheck/backups/sinkingFunds_latest.db` (gitignored), overwritten on start, stop, and logout via `backup_db.sh` / the backend's logout route. The test instance uses fake sample data (`seed_demo_data.py`) and never backs up. Do not push this branch, and do not merge db files into `main` without explicit confirmation.
