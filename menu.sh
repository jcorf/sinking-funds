#!/bin/bash
# Terminal menu for Sinking Funds: start, stop and open the app or the test
# instance, and restore the backup. Wraps app_control.sh and restore_db.sh.
# The Desktop "Sinking Funds.command" (made by make_desktop_app.sh) runs this.
cd "$(dirname "$0")"

if [ -t 1 ]; then
    B=$'\e[1m'; D=$'\e[2m'; G=$'\e[32m'; O=$'\e[33m'; R=$'\e[0m'
else
    B=; D=; G=; O=; R=
fi

up() { ./app_control.sh status | grep -q "^$1: running"; }

line() {  # name, label, url
    if up "$1"; then
        printf "  ${G}●${R} %-6s ${G}running${R}   ${D}%s${R}\n" "$2" "$3"
    else
        printf "  ${D}○ %-6s stopped${R}\n" "$2"
    fi
}

while true; do
    clear
    printf "\n  ${B}Sinking Funds${R}\n  ${D}─────────────────────────────${R}\n\n"
    line App App "http://localhost:3000"
    line Test Test "http://localhost:3001  (fake data)"
    printf "\n  ${D}%s${R}\n\n" "$(./restore_db.sh --info 2>/dev/null || echo 'No backup yet')"

    labels=(); acts=()
    if up App; then
        labels+=("Open app" "Stop app"); acts+=("open real" "stop real")
    else
        labels+=("Start app"); acts+=("start real")
    fi
    if up Test; then
        labels+=("Open test" "Stop test"); acts+=("open test" "stop test")
    else
        labels+=("Start test"); acts+=("start test")
    fi
    labels+=("Restore backup"); acts+=("restore")

    for i in "${!labels[@]}"; do
        printf "  ${O}%d${R}  %s\n" $((i + 1)) "${labels[$i]}"
    done
    printf "  ${O}q${R}  Quit\n\n"
    printf "  Choose: "
    read -r -n 1 key; echo

    case "$key" in
        q|Q|"") break ;;
        [1-9])
            act="${acts[$((key - 1))]}"
            [ -z "$act" ] && continue
            echo
            if [ "$act" = restore ]; then
                ./restore_db.sh
            else
                ./app_control.sh $act
            fi
            echo
            read -n 1 -s -r -p "  Press any key to go back to the menu…"
            ;;
    esac
done
