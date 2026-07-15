#!/bin/bash

# Sinking Funds Calculator - Start Script
# This script starts both the Flask backend and React frontend servers

set -e  # Exit on any error

echo "🚀 Starting Sinking Funds Calculator..."

# Function to handle cleanup on script exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    if [ ! -z "$FLASK_PID" ]; then
        kill $FLASK_PID 2>/dev/null || true
    fi
    if [ ! -z "$REACT_PID" ]; then
        kill $REACT_PID 2>/dev/null || true
    fi
    echo "✅ Servers stopped. Goodbye!"
    exit 0
}

# Set up signal handlers for graceful shutdown
trap cleanup SIGINT SIGTERM

# Create database backup with timestamp
echo "📦 Creating database backup..."
BACKUP_DIR="src/paycheck/backups"
mkdir -p "$BACKUP_DIR"

# Get the current database name from the constants file
DATABASE_NAME=$(grep "DATABASE_NAME" src/paycheck/utils/reference/database_constants.py | cut -d"'" -f2)
DATABASE_PATH="src/paycheck/$DATABASE_NAME"

if [ -f "$DATABASE_PATH" ]; then
    TIMESTAMP=$(date +"%Y_%m_%d_%H_%M")
    BACKUP_FILE="$BACKUP_DIR/sinkingFunds_$TIMESTAMP.db"
    cp "$DATABASE_PATH" "$BACKUP_FILE"
    echo "✅ Database backed up to: $BACKUP_FILE"
else
    echo "ℹ️  No existing database found at $DATABASE_PATH, skipping backup"
fi

# Set up the Python virtual environment and install dependencies
echo "🔍 Checking Python virtual environment..."
if [ ! -d "src/paycheck/venv" ]; then
    echo "📦 Creating virtual environment at src/paycheck/venv..."
    python3 -m venv src/paycheck/venv
fi
source src/paycheck/venv/bin/activate
pip install -q -r src/paycheck/requirements.txt

# Set up a login for the app on first run, stored in a gitignored .env file
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    echo ""
    echo "🔐 No .env file found — let's set up a login for this app."
    read -p "Choose a username: " NEW_APP_USERNAME
    read -s -p "Choose a password: " NEW_APP_PASSWORD
    echo ""
    NEW_APP_PASSWORD_HASH=$(python -c "from werkzeug.security import generate_password_hash; import sys; print(generate_password_hash(sys.argv[1]))" "$NEW_APP_PASSWORD")
    NEW_FLASK_SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")
    # Values are single-quoted because the password hash contains '$' characters
    # (e.g. scrypt:32768:8:1$salt$hash) which `source` would otherwise try to
    # expand as shell variables, silently corrupting the hash.
    cat > "$ENV_FILE" <<EOF
APP_USERNAME='$NEW_APP_USERNAME'
APP_PASSWORD_HASH='$NEW_APP_PASSWORD_HASH'
FLASK_SECRET_KEY='$NEW_FLASK_SECRET_KEY'
EOF
    echo "✅ Saved your login to $ENV_FILE (gitignored — never committed)"
fi

set -a
source "$ENV_FILE"
set +a

# Start Flask backend
echo "🐍 Starting Flask backend on http://127.0.0.1:5001..."
cd src/paycheck
python flask-connector.py &
FLASK_PID=$!
cd ../..

# Wait a moment for Flask to start
sleep 3

# Check if Flask started successfully
if ! kill -0 $FLASK_PID 2>/dev/null; then
    echo "❌ Failed to start Flask backend"
    exit 1
fi

echo "✅ Flask backend started (PID: $FLASK_PID)"

# Start React frontend
echo "⚛️  Starting React frontend on http://localhost:3000..."
cd web-app/app

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing React dependencies..."
    npm install
fi

npm start &
REACT_PID=$!

# Wait a moment for React to start
sleep 5

# Check if React started successfully
if ! kill -0 $REACT_PID 2>/dev/null; then
    echo "❌ Failed to start React frontend"
    cleanup
    exit 1
fi

echo "✅ React frontend started (PID: $REACT_PID)"

echo ""
echo "🎉 Sinking Funds Calculator is running!"
echo "📊 Backend:  http://127.0.0.1:5001"
echo "🌐 Frontend: http://localhost:3000"
echo "🔑 Log in with the username/password from .env"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user to stop the script
wait
