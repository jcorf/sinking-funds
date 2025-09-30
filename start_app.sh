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

# Check if Python dependencies are installed
echo "🔍 Checking Python dependencies..."
cd src/paycheck
if ! python -c "import flask, flask_cors" 2>/dev/null; then
    echo "⚠️  Flask dependencies not found. Installing..."
    pip install flask flask-cors
fi

# Start Flask backend
echo "🐍 Starting Flask backend on http://127.0.0.1:5000..."
python flask-connector.py &
FLASK_PID=$!

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
cd ../../web-app/app

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
echo "📊 Backend:  http://127.0.0.1:5000"
echo "🌐 Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user to stop the script
wait
