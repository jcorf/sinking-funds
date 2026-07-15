# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A personal finance web app for tracking "sinking funds" (savings goals), credit card balances, and an Ally Bank balance. Flask + SQLite backend, React frontend. See [README.md](README.md) for feature/user-facing docs and the full API endpoint list.

## Running the app

```bash
./start_app.sh          # starts both backend and frontend, backs up the db first
```

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

- Entry point [App.js](web-app/app/src/App.js) sets up routes (`/dashboard`, `/sinking-funds`, `/credit-cards`, `/recalculate`, `/users/:id/:categoryName`) and holds the shared `startDate` state used across Recalculate/InfoPage.
- [components/utils/api.js](web-app/app/src/components/utils/api.js) is the only place that talks to the Flask backend (all `fetch` calls). [components/utils/lib.js](web-app/app/src/components/utils/lib.js) builds query-string URLs (`url()`, `obj()`) and has date helpers (`getTodayDate`, `getOneYearDate`) and the emoji picker list.
- `components/whole-view/` holds one folder per page/feature (Grid, InfoCard, InfoPage, AddCard, Recalculate, Dashboard, CreditCards, EmojiPicker, TextField, Summary), each with its own `.js`/`.css` pair.
- Drag-and-drop reordering (sinking fund cards and credit cards) uses `@dnd-kit`; reorder is persisted via `updateCardOrder`/`updateCreditCardOrder` in api.js, which hit `/update_card_order`/`/update_credit_card_order`.

## Data sensitivity

This repo is pushed to a **public** GitHub remote (`origin` = jcorf/sinking-funds). The current branch, `local-db-dont-push-publicly`, exists specifically to hold real personal financial data in `src/paycheck/sinkingFunds.db` without pushing it to a public branch. Note `.gitignore` only ignores `src/paycheck/*.db` (the live db) — `src/paycheck/backups/*.db` is **not** gitignored, so backup snapshots are untracked-but-visible, not automatically excluded. Do not push this branch, and do not merge db files into `main` without explicit confirmation.
