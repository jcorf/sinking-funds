#!/bin/bash

# Get the current directory (where the start_app.sh is located)
CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_DIR="$HOME/Desktop"
SHORTCUT_NAME="Sinking Funds"
SCRIPT_PATH="$CURRENT_DIR/start_app.sh"

echo "Creating desktop shortcut for Sinking Funds..."

# Create the .command file on desktop
cat > "$DESKTOP_DIR/$SHORTCUT_NAME.command" << EOF
#!/bin/bash
cd "$CURRENT_DIR"
./start_app.sh
EOF

# Make the shortcut executable
chmod +x "$DESKTOP_DIR/$SHORTCUT_NAME.command"

echo "✅ Desktop shortcut created: $DESKTOP_DIR/$SHORTCUT_NAME.command"
echo "Double-click the shortcut on your desktop to start the app!"

