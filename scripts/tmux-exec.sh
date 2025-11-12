#!/bin/bash
# scripts/tmux-exec.sh
# Execute command in sentinel session

SESSION_NAME="sentinel-$(basename $(pwd))"
WINDOW="${1:-5}"
COMMAND="${2:-echo 'No command provided'}"

if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "❌ Session $SESSION_NAME not found. Run: bun run scripts/setup-tmux-sentinel.sh"
  exit 1
fi

echo "Executing in $SESSION_NAME:$WINDOW: $COMMAND"
tmux send-keys -t "$SESSION_NAME:$WINDOW" "$COMMAND" Enter

# Optionally capture output after a delay
if [[ "${3:-}" == "--capture" ]]; then
  sleep 2
  echo ""
  echo "Output:"
  echo "─".repeat(50)
  tmux capture-pane -t "$SESSION_NAME:$WINDOW" -p -S -20
  echo "─".repeat(50)
fi


