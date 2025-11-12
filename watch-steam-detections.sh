#!/bin/bash
# Watch for steam pattern detections in real-time
# Usage: ./watch-steam-detections.sh

LOG_FILE="logs/headers-index.log"

if [ ! -f "$LOG_FILE" ]; then
  echo "⚠️  Log file not found: $LOG_FILE"
  echo "📝 Creating log file..."
  mkdir -p logs
  touch "$LOG_FILE"
fi

echo "🔍 Watching for steam pattern detections..."
echo "📁 Log file: $LOG_FILE"
echo "⏹️  Press Ctrl+C to stop"
echo ""

# Watch for steam detections
tail -f "$LOG_FILE" | rg --line-buffered "\[STEAM_DETECTED\]|STEAM_PATTERN" --color=always

