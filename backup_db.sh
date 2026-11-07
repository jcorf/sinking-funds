#!/bin/bash
# Keep ONE backup of the real database, overwritten each time:
#   src/paycheck/backups/sinkingFunds_latest.db
# Called when the real app starts and stops (start_app.sh, the desktop
# control). The backend makes the same backup on logout. The test instance
# never backs up.
cd "$(dirname "$0")"
DB="src/paycheck/sinkingFunds.db"
BACKUP_DIR="src/paycheck/backups"
BACKUP="$BACKUP_DIR/sinkingFunds_latest.db"

if [ ! -f "$DB" ]; then
    echo "ℹ️  No database at $DB yet; nothing to back up"
    exit 0
fi
mkdir -p "$BACKUP_DIR"
# sqlite3's .backup is a consistent snapshot even mid-write; cp is the fallback.
if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "$DB" ".backup '$BACKUP.tmp'" && mv "$BACKUP.tmp" "$BACKUP"
else
    cp "$DB" "$BACKUP"
fi
echo "📦 Backed up database -> $BACKUP"
