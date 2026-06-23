#!/bin/bash
# Start Chrome with Muse Catch extension loaded
# This ensures the extension survives Chrome restarts

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PROFILE="$HOME/Library/Application Support/Google/Chrome/Default"
EXTENSION="/tmp/muse-catch/extension"

# Kill any existing debug Chrome
pkill -f "remote-debugging-port=9222" 2>/dev/null
sleep 1

"$CHROME" \
  --remote-debugging-port=9222 \
  --user-data-dir="$PROFILE" \
  --remote-allow-origins='*' \
  --load-extension="$EXTENSION" &

sleep 2
echo "✅ Chrome started with Muse Catch extension (port 9222)"
