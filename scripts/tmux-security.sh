#!/bin/bash
# scripts/tmux-security.sh
# Quick switch to security monitoring window

SESSION_NAME="sentinel-$(basename $(pwd))"

if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "❌ Session $SESSION_NAME not found. Run: bun run scripts/setup-tmux-sentinel.sh"
  exit 1
fi

echo "Switching to security window..."
tmux select-window -t "$SESSION_NAME:2"

# If not attached, attach to session
if [[ -z "${TMUX:-}" ]]; then
  tmux attach-session -t "$SESSION_NAME"
else
  echo "✅ Switched to security window (Window 2)"
fi


