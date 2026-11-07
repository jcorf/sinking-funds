#!/bin/bash
# Restore the real database from the rolling backup.
#
#   ./restore_db.sh          # asks first, then restores
#   ./restore_db.sh --yes    # no question (used by the desktop app)
#   ./restore_db.sh --info   # print when the backup was made, then exit
#
# What it does:
#   1. Checks the backup is a healthy SQLite file.
#   2. Stops the real app WITHOUT its usual backup-on-stop (that backup would
#      overwrite the very file you are restoring from).
#   3. Saves the current database as backups/sinkingFunds_before_restore.db
#      (one copy, overwritten by the next restore), so a restore can be undone.
#   4. Copies the backup over src/paycheck/sinkingFunds.db.
#
# The backup is whatever the app last saved on start, stop or logout. If you
# already stopped the app after the mistake, the backup holds the mistake too.
# Never touches the test instance.
cd "$(dirname "$0")"
DB="${SINKING_FUNDS_RESTORE_DB:-src/paycheck/sinkingFunds.db}"
BACKUP_DIR="$(dirname "$DB")/backups"
BACKUP="${SINKING_FUNDS_RESTORE_FROM:-$BACKUP_DIR/sinkingFunds_latest.db}"
SAFETY="$BACKUP_DIR/sinkingFunds_before_restore.db"

if [ ! -f "$BACKUP" ]; then
    echo "No backup found at $BACKUP"
    exit 1
fi

when="$(stat -f '%Sm' -t '%b %-d, %Y at %-I:%M %p' "$BACKUP")"
size="$(( $(stat -f %z "$BACKUP") / 1024 )) KB"

if [ "$1" = "--info" ]; then
    echo "Backup from $when ($size)"
    exit 0
fi

if command -v sqlite3 >/dev/null 2>&1; then
    check="$(sqlite3 "$BACKUP" 'PRAGMA integrity_check;' 2>&1)"
    if [ "$check" != "ok" ]; then
        echo "The backup is damaged, so nothing was changed: $check"
        exit 1
    fi
fi

if [ "$1" != "--yes" ]; then
    echo "Backup from $when ($size)."
    echo "This replaces your current data with it and stops the app if it's running."
    printf "Restore? [y/N] "
    read -r answer
    case "$answer" in y|Y|yes) ;; *) echo "Cancelled. Nothing changed."; exit 0 ;; esac
fi

# Stop the real app without the backup its stop handler would make.
pkill -9 -f 'start_app\.sh' 2>/dev/null
for port in 3000 5001; do
    pids="$(lsof -tiTCP:$port -sTCP:LISTEN 2>/dev/null)"
    [ -n "$pids" ] && kill -9 $pids 2>/dev/null
done
sleep 1
rm -f .run/real.pid

mkdir -p "$BACKUP_DIR"
if [ -f "$DB" ]; then
    cp "$DB" "$SAFETY" || { echo "Couldn't save the current data first, so nothing was changed."; exit 1; }
fi
cp "$BACKUP" "$DB.tmp" && mv "$DB.tmp" "$DB" || { echo "Restore failed."; exit 1; }
rm -f "$DB-wal" "$DB-shm"

echo "Restored the backup from $when."
echo "Your previous data is saved at $SAFETY."
