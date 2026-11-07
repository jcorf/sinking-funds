#!/bin/bash
# Builds "Sinking Funds.app" on your Desktop: a native Mac dialog that shows
# whether the app and the test instance are running and lets you start,
# stop, or open either one (no Terminal window), plus restore the backup. Also
# writes "Sinking Funds.command", the same menu for Terminal. Re-run after
# moving the repo.

cd "$(dirname "$0")"
REPO="$(pwd)"
APP="$HOME/Desktop/Sinking Funds.app"
TMP_SCRIPT="$(mktemp -t sinkingfunds).applescript"

cat >"$TMP_SCRIPT" <<EOF
set ctl to quoted form of "$REPO/app_control.sh"

on actionsFor(statusText)
	set appUp to statusText contains "App: running"
	set testUp to statusText contains "Test: running"
	set acts to {}
	if appUp then
		set end of acts to "Open app"
		set end of acts to "Stop app"
	else
		set end of acts to "Start app"
	end if
	if testUp then
		set end of acts to "Open test"
		set end of acts to "Stop test"
	else
		set end of acts to "Start test"
	end if
	set end of acts to "Restore backup…"
	return acts
end actionsFor

set statusText to do shell script ctl & " status"
set picked to choose from list actionsFor(statusText) with title "Sinking Funds" with prompt statusText & return & return & "What would you like to do?" OK button name "Go" cancel button name "Close"
if picked is false then return
set choice to item 1 of picked

if choice is "Restore backup…" then
	try
		set info to do shell script ctl & " backup-info"
		set answer to display dialog info & return & return & "Replace your current data with this backup? The app will stop if it's running. Your current data is kept as backups/sinkingFunds_before_restore.db." with title "Sinking Funds" buttons {"Cancel", "Restore"} default button "Cancel" cancel button "Cancel" with icon caution
		set result to do shell script ctl & " restore"
		display dialog result with title "Sinking Funds" buttons {"OK"} default button 1
	on error errMsg number errNum
		if errNum is not -128 then display dialog errMsg with title "Sinking Funds" buttons {"OK"} default button 1 with icon caution
	end try
	return
end if

set verbAndWhich to {"start", "real"}
if choice is "Start app" then set verbAndWhich to {"start", "real"}
if choice is "Stop app" then set verbAndWhich to {"stop", "real"}
if choice is "Open app" then set verbAndWhich to {"open", "real"}
if choice is "Start test" then set verbAndWhich to {"start", "test"}
if choice is "Stop test" then set verbAndWhich to {"stop", "test"}
if choice is "Open test" then set verbAndWhich to {"open", "test"}

if item 1 of verbAndWhich is "start" then display notification "Starting… this takes a few seconds." with title "Sinking Funds"
try
	set result to do shell script ctl & " " & item 1 of verbAndWhich & " " & item 2 of verbAndWhich
	if item 1 of verbAndWhich is not "open" then display notification result with title "Sinking Funds"
on error errMsg
	display dialog errMsg with title "Sinking Funds" buttons {"OK"} default button 1 with icon caution
end try
EOF

rm -rf "$APP"
osacompile -o "$APP" "$TMP_SCRIPT"
rm -f "$TMP_SCRIPT"
# Terminal version of the same menu
CMD="$HOME/Desktop/Sinking Funds.command"
printf '#!/bin/bash\nexec "%s/menu.sh"\n' "$REPO" >"$CMD"
chmod +x "$CMD"
echo "✅ Created $APP and $CMD"
echo "Double-click it to start/stop the app or the test instance."
