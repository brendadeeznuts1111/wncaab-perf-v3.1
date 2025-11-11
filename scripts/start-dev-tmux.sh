#!/bin/bash
# scripts/start-dev-tmux.sh
# Ensures dev server ALWAYS runs in tmux session
# TES-NGWS-001.12c: All processes must run in tmux

set -euo pipefail

# Get workspace folder and session name
WORKSPACE_FOLDER="${WORKSPACE_FOLDER:-$(pwd)}"
WORKSPACE_BASENAME=$(basename "$WORKSPACE_FOLDER")

# Sanitize workspace name for tmux session
SANITIZED=$(echo "$WORKSPACE_BASENAME" | \
  tr -d '\n\r' | \
  tr '[:space:]' '-' | \
  tr -cd '[:alnum:]-_' | \
  sed 's/--*/-/g' | \
  sed 's/^-\+//' | \
  sed 's/-\+$//')

SESSION_NAME="sentinel-${SANITIZED}"
WINDOW_NAME="🚀 main"
WINDOW_INDEX="1"

echo "🔧 Starting dev server in tmux session: ${SESSION_NAME}"

# Check if session exists, create if not
if ! tmux has-session -t "${SESSION_NAME}" 2>/dev/null; then
  echo "📦 Creating tmux session: ${SESSION_NAME}"
  tmux new-session -d -s "${SESSION_NAME}" -c "${WORKSPACE_FOLDER}"
  
  # Create main window if it doesn't exist
  tmux new-window -t "${SESSION_NAME}:${WINDOW_INDEX}" -n "${WINDOW_NAME}" 2>/dev/null || true
else
  echo "✅ Session ${SESSION_NAME} exists"
  
  # Ensure main window exists
  if ! tmux list-windows -t "${SESSION_NAME}" -F "#{window_name}" | grep -q "^${WINDOW_NAME}$"; then
    echo "📦 Creating main window"
    tmux new-window -t "${SESSION_NAME}:${WINDOW_INDEX}" -n "${WINDOW_NAME}" 2>/dev/null || true
  fi
fi

# Check if dev server is already running in this window
if tmux capture-pane -t "${SESSION_NAME}:${WINDOW_INDEX}" -p | grep -q "Dev Server running on"; then
  echo "⚠️  Dev server appears to be running already in ${SESSION_NAME}:${WINDOW_INDEX}"
  echo "💡 Attach with: tmux attach-session -t ${SESSION_NAME}"
  exit 0
fi

# Check if port 3002 is in use
if lsof -ti:3002 >/dev/null 2>&1; then
  PID=$(lsof -ti:3002 | head -1)
  echo "⚠️  Port 3002 is in use by PID ${PID}"
  
  # Check if it's running in tmux
  if tmux list-panes -a -F "#{pane_pid}" | grep -q "^${PID}$"; then
    echo "✅ Process is already in tmux"
    exit 0
  else
    echo "❌ Process is NOT in tmux - stopping it"
    kill "${PID}" 2>/dev/null || true
    sleep 1
  fi
fi

# Start dev server in tmux window
echo "🚀 Starting dev server in tmux window ${SESSION_NAME}:${WINDOW_INDEX}"
tmux send-keys -t "${SESSION_NAME}:${WINDOW_INDEX}" "cd '${WORKSPACE_FOLDER}' && bun run dev:direct" Enter

# Wait a moment for server to start
sleep 2

# Verify it's running
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/ | grep -q "200"; then
  echo "✅ Dev server is running in tmux!"
  echo "📊 Dashboard: http://localhost:3002/"
  echo "💡 Attach with: tmux attach-session -t ${SESSION_NAME}"
else
  echo "⚠️  Dev server may still be starting..."
  echo "💡 Check status with: tmux attach-session -t ${SESSION_NAME}"
fi

