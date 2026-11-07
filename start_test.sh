#!/bin/bash

# Sinking Funds Calculator - Test Instance
#
# Runs a second, fully separate copy of the app against a scratch copy of
# your real database, so you can experiment without touching real data:
#
#   Real:  frontend http://localhost:3000  ->  backend :5001  ->  src/paycheck/sinkingFunds.db
#   Test:  frontend http://localhost:3001  ->  backend :5002  ->  src/paycheck/sinkingFunds_test.db
#
# Both can run at the same time. The real db is only ever read (to make the
# copy), never written.
#
# Usage:
#   ./start_test.sh          # fresh copy of the real db every run (resets test data)
#   ./start_test.sh --keep   # keep the existing test db from last time
#   ./start_test.sh --empty  # start from an empty db (tables self-create)

set -e

# Run from the repo root no matter where the script was invoked from, since
# every path below is relative to it.
cd "$(dirname "$0")"

REAL_DB="src/paycheck/sinkingFunds.db"
TEST_DB="src/paycheck/sinkingFunds_test.db"
TEST_API_PORT=5002
TEST_WEB_PORT=3001

MODE="fresh"
case "$1" in
    --keep)  MODE="keep" ;;
    --empty) MODE="empty" ;;
    "")      ;;
    *) echo "Unknown option: $1 (use --keep or --empty)"; exit 1 ;;
esac

echo "🧪 Starting Sinking Funds TEST instance..."

cleanup() {
    echo ""
    echo "🛑 Shutting down test servers..."
    [ -n "$FLASK_PID" ] && kill $FLASK_PID 2>/dev/null || true
    [ -n "$REACT_PID" ] && kill $REACT_PID 2>/dev/null || true
    echo "✅ Test servers stopped."
    exit 0
}
trap cleanup SIGINT SIGTERM

for port in $TEST_API_PORT $TEST_WEB_PORT; do
    if lsof -iTCP:$port -sTCP:LISTEN >/dev/null 2>&1; then
        echo "❌ Port $port is already in use (is a test instance already running?)"
        exit 1
    fi
done

case "$MODE" in
    fresh)
        if [ ! -f "$REAL_DB" ]; then
            echo "❌ No real database at $REAL_DB to copy. Use --empty instead."
            exit 1
        fi
        rm -f "$TEST_DB"
        # sqlite3's .backup takes a consistent snapshot even if the real app
        # is running and mid-write; plain cp is the fallback.
        if command -v sqlite3 >/dev/null 2>&1; then
            sqlite3 "$REAL_DB" ".backup '$TEST_DB'"
        else
            cp "$REAL_DB" "$TEST_DB"
        fi
        echo "📋 Copied real db -> $TEST_DB"
        ;;
    keep)
        if [ -f "$TEST_DB" ]; then
            echo "♻️  Keeping existing $TEST_DB"
        else
            echo "ℹ️  No existing test db; it will be created empty"
        fi
        ;;
    empty)
        rm -f "$TEST_DB"
        echo "🆕 Starting with an empty test db"
        ;;
esac

if [ ! -d "src/paycheck/venv" ]; then
    echo "❌ No virtual environment yet — run ./start_app.sh once first to set it up."
    exit 1
fi
source src/paycheck/venv/bin/activate

if [ ! -f ".env" ]; then
    echo "❌ No .env file yet — run ./start_app.sh once first to set up your login."
    exit 1
fi
set -a
source ".env"
set +a

echo "🐍 Starting test backend on http://127.0.0.1:$TEST_API_PORT..."
cd src/paycheck
SINKING_FUNDS_DB="$(pwd)/sinkingFunds_test.db" \
PORT=$TEST_API_PORT \
SESSION_COOKIE_NAME="session_test" \
REMEMBER_COOKIE_NAME="remember_token_test" \
    python flask-connector.py &
FLASK_PID=$!
cd ../..

sleep 3
if ! kill -0 $FLASK_PID 2>/dev/null; then
    echo "❌ Failed to start test backend"
    exit 1
fi

echo "⚛️  Starting test frontend on http://localhost:$TEST_WEB_PORT..."
cd web-app/app
if [ ! -d "node_modules" ]; then
    npm install
fi
PORT=$TEST_WEB_PORT REACT_APP_API_PORT=$TEST_API_PORT REACT_APP_ENV_LABEL=TEST npm start &
REACT_PID=$!
cd ../..

sleep 5
if ! kill -0 $REACT_PID 2>/dev/null; then
    echo "❌ Failed to start test frontend"
    cleanup
fi

echo ""
echo "🧪 TEST instance is running (real data is untouched)"
echo "📊 Backend:  http://127.0.0.1:$TEST_API_PORT  ($TEST_DB)"
echo "🌐 Frontend: http://localhost:$TEST_WEB_PORT"
echo ""
echo "Press Ctrl+C to stop the test servers"

wait
