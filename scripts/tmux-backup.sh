#!/bin/bash
# scripts/tmux-backup.sh
# Backup session state and pane contents

SESSION_NAME="sentinel-$(basename $(pwd))"
BACKUP_DIR="${BACKUP_DIR:-/tmp/tmux-backups}"
TIMESTAMP=$(date +%Y%m%d%H%M%S)

mkdir -p "$BACKUP_DIR"

if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "❌ Session $SESSION_NAME not found"
  exit 1
fi

echo "📦 Backing up session: $SESSION_NAME"

# Backup session info
tmux list-windows -t "$SESSION_NAME" > "$BACKUP_DIR/session-$SESSION_NAME-$TIMESTAMP.txt"
echo "✅ Session info saved to: $BACKUP_DIR/session-$SESSION_NAME-$TIMESTAMP.txt"

# Backup all pane contents
for window in $(tmux list-windows -t "$SESSION_NAME" -F "#{window_index}"); do
  for pane in $(tmux list-panes -t "$SESSION_NAME:$window" -F "#{pane_index}"); do
    OUTPUT_FILE="$BACKUP_DIR/pane-$SESSION_NAME-$window-$pane-$TIMESTAMP.log"
    tmux capture-pane -t "$SESSION_NAME:$window.$pane" -p > "$OUTPUT_FILE"
    echo "✅ Pane $window.$pane saved to: $OUTPUT_FILE"
  done
done

# Save buffer
BUFFER_FILE="$BACKUP_DIR/buffer-$SESSION_NAME-$TIMESTAMP.txt"
tmux save-buffer - "$BUFFER_FILE" 2>/dev/null && echo "✅ Buffer saved to: $BUFFER_FILE" || echo "ℹ️  No buffer to save"

echo ""
echo "✅ Backup complete: $BACKUP_DIR"


