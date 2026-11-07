#!/bin/bash
# Start / stop / check the real app and the test instance in the background.
# Used by the "Sinking Funds" desktop app (make_desktop_app.sh); also works
# from a terminal:
#
#   ./app_control.sh status
#   ./app_control.sh start real|test
#   ./app_control.sh stop  real|test
#   ./app_control.sh open  real|test
#
# Logs and pid files live in .run/ (gitignored).

cd "$(dirname "$0")"
REPO="$(pwd)"
RUN_DIR="$REPO/.run"
mkdir -p "$RUN_DIR"

# GUI-launched scripts don't get the terminal's PATH: load Homebrew and nvm.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    # shellcheck disable=SC1091
    . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1
fi

ports_for() {
    case "$1" in
        real) echo "3000 5001" ;;
        test) echo "3001 5002" ;;
        *) echo "Unknown instance: $1 (use real or test)" >&2; exit 2 ;;
    esac
}
web_port() { set -- $(ports_for "$1"); echo "$1"; }
label() { [ "$1" = real ] && echo "App" || echo "Test"; }

is_up() {
    local port
    for port in $(ports_for "$1"); do
        lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 || return 1
    done
    return 0
}

status_line() {
    if is_up "$1"; then
        echo "$(label "$1"): running at http://localhost:$(web_port "$1")"
    else
        echo "$(label "$1"): stopped"
    fi
}

start() {
    local which="$1"
    if is_up "$which"; then
        echo "$(label "$which") is already running."
        return 0
    fi
    if [ "$which" = real ] && [ ! -f .env ]; then
        echo "No login set up yet. Run ./start_app.sh once in Terminal first."
        return 1
    fi
    local script=./start_app.sh
    [ "$which" = test ] && script=./start_test.sh
    # BROWSER=none: we open the page ourselves once it's actually up.
    BROWSER=none nohup "$script" >"$RUN_DIR/$which.log" 2>&1 &
    echo $! >"$RUN_DIR/$which.pid"

    # Wait up to ~90s for both ports to come up.
    local i
    for i in $(seq 1 180); do
        if is_up "$which"; then
            open "http://localhost:$(web_port "$which")"
            echo "$(label "$which") started at http://localhost:$(web_port "$which")"
            return 0
        fi
        if ! kill -0 "$(cat "$RUN_DIR/$which.pid")" 2>/dev/null; then
            echo "$(label "$which") failed to start. See .run/$which.log"
            return 1
        fi
        sleep 0.5
    done
    echo "$(label "$which") is taking a while to start. See .run/$which.log"
    return 1
}

stop() {
    local which="$1"
    local pidfile="$RUN_DIR/$which.pid"
    # Ask the start script to shut down cleanly first (its trap stops both
    # servers and, for the real app, makes the backup).
    if [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
        kill -TERM "$(cat "$pidfile")" 2>/dev/null
        sleep 2
    fi
    # Then make sure nothing is left listening on its ports.
    local port pids
    for port in $(ports_for "$which"); do
        pids=$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null)
        [ -n "$pids" ] && kill $pids 2>/dev/null
    done
    rm -f "$pidfile"
    # The real app is backed up on every stop, even if it wasn't started here.
    [ "$which" = real ] && ./backup_db.sh >/dev/null
    if is_up "$which"; then
        echo "$(label "$which") didn't fully stop. Check .run/$which.log"
        return 1
    fi
    echo "$(label "$which") stopped."
}

case "$1" in
    status) status_line real; status_line test ;;
    start) start "${2:?real or test}" ;;
    stop) stop "${2:?real or test}" ;;
    open) open "http://localhost:$(web_port "${2:?real or test}")" ;;
    *) echo "Usage: $0 status | start real|test | stop real|test | open real|test"; exit 2 ;;
esac
