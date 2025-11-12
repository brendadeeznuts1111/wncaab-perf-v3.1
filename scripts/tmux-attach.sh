#!/bin/bash
# scripts/tmux-attach.sh
# Quick attach to sentinel session

SESSION_NAME="sentinel-$(basename $(pwd))"

if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "Attaching to session: $SESSION_NAME"
  tmux attach-session -t "$SESSION_NAME"
else
  echo "Session $SESSION_NAME not found. Creating..."
  bun run scripts/setup-tmux-sentinel.sh
  tmux attach-session -t "$SESSION_NAME"
fi


