#!/bin/bash
# TES Telemetry Activation Script
# Integrated with tmux session management (TES-NGWS-001.12c)
# Usage: ./scripts/activate-telemetry.sh

set -euo pipefail

# Get workspace folder and session name (matches dev server pattern)
WORKSPACE_FOLDER="${WORKSPACE_FOLDER:-$(pwd)}"
WORKSPACE_BASENAME=$(basename "$WORKSPACE_FOLDER")

# Sanitize workspace name for tmux session (same pattern as start-dev-tmux.sh)
SANITIZED=$(echo "$WORKSPACE_BASENAME" | \
  tr -d '\n\r' | \
  tr '[:space:]' '-' | \
  tr -cd '[:alnum:]-_' | \
  sed 's/--*/-/g' | \
  sed 's/^-\+//' | \
  sed 's/-\+$//')

SESSION_NAME="sentinel-${SANITIZED}"
TELEMETRY_WINDOW="📡 telemetry"
TELEMETRY_WINDOW_INDEX="2"

echo "🚀 Starting TES Worker Telemetry API..."
echo "📦 tmux session: ${SESSION_NAME}"
echo "🪟 Window: ${TELEMETRY_WINDOW}"

# Check if already running via API health check
if curl -s http://localhost:3000/api/workers/registry > /dev/null 2>&1; then
  echo "✅ Worker Telemetry API already running on port 3000"
  
  # Check if it's running in tmux
  if tmux has-session -t "${SESSION_NAME}" 2>/dev/null; then
    if tmux list-windows -t "${SESSION_NAME}" -F "#{window_name}" | grep -q "^${TELEMETRY_WINDOW}$"; then
      echo "💡 Attach with: tmux attach-session -t ${SESSION_NAME}"
      echo "💡 View telemetry window: tmux select-window -t ${SESSION_NAME}:${TELEMETRY_WINDOW_INDEX}"
    fi
  fi
  exit 0
fi

# Check if tmux is available
if ! command -v tmux &> /dev/null; then
  echo "⚠️  tmux not found. Starting in background..."
  bun run scripts/worker-telemetry-api.ts &
  TELEMETRY_PID=$!
  echo "Worker Telemetry API started with PID: $TELEMETRY_PID"
  echo "To stop: kill $TELEMETRY_PID"
  echo "⚠️  Consider installing tmux for better process management"
else
  # Check if session exists, create if not
  if ! tmux has-session -t "${SESSION_NAME}" 2>/dev/null; then
    echo "📦 Creating tmux session: ${SESSION_NAME}"
    tmux new-session -d -s "${SESSION_NAME}" -c "${WORKSPACE_FOLDER}"
  else
    echo "✅ Session ${SESSION_NAME} exists"
  fi
  
  # Check if telemetry window exists
  if ! tmux list-windows -t "${SESSION_NAME}" -F "#{window_name}" | grep -q "^${TELEMETRY_WINDOW}$"; then
    echo "📦 Creating telemetry window"
    tmux new-window -t "${SESSION_NAME}:${TELEMETRY_WINDOW_INDEX}" -n "${TELEMETRY_WINDOW}" -c "${WORKSPACE_FOLDER}" 2>/dev/null || true
  else
    echo "✅ Telemetry window exists"
  fi
  
  # Check if telemetry API is already running in this window
  if tmux capture-pane -t "${SESSION_NAME}:${TELEMETRY_WINDOW_INDEX}" -p 2>/dev/null | grep -q "Worker Telemetry API\|TES-WORKER-API\|Listening on 3000"; then
    echo "⚠️  Worker Telemetry API appears to be running already in ${SESSION_NAME}:${TELEMETRY_WINDOW_INDEX}"
    echo "💡 Attach with: tmux attach-session -t ${SESSION_NAME}"
    exit 0
  fi
  
  # Check if port 3000 is in use
  if lsof -ti:3000 >/dev/null 2>&1; then
    PID=$(lsof -ti:3000 | head -1)
    echo "⚠️  Port 3000 is in use by PID: ${PID}"
    
    # Check if it's running in tmux
    if tmux list-panes -a -F "#{pane_pid}" 2>/dev/null | grep -q "^${PID}$"; then
      echo "✅ Process is already in tmux"
      exit 0
    else
      echo "❌ Process is NOT in tmux - stopping it"
      kill "${PID}" 2>/dev/null || true
      sleep 1
    fi
  fi
  
  # Start Worker Telemetry API in tmux window
  echo "🚀 Starting Worker Telemetry API in tmux window ${SESSION_NAME}:${TELEMETRY_WINDOW_INDEX}"
  tmux send-keys -t "${SESSION_NAME}:${TELEMETRY_WINDOW_INDEX}" "cd '${WORKSPACE_FOLDER}' && bun run scripts/worker-telemetry-api.ts" Enter
  
  echo "✅ Started Worker Telemetry API in tmux session '${SESSION_NAME}'"
  echo "💡 Attach with: tmux attach-session -t ${SESSION_NAME}"
  echo "💡 View telemetry: tmux select-window -t ${SESSION_NAME}:${TELEMETRY_WINDOW_INDEX}"
  echo "💡 Detach: Press Ctrl+B, then D"
fi

# Wait for startup (check every second for up to 30 seconds)
echo "⏳ Waiting for API to start..."
for i in {1..30}; do
  if curl -s http://localhost:3000/api/workers/registry > /dev/null 2>&1; then
    echo "✅ Worker Telemetry API started successfully"
    echo "📊 Health check: http://localhost:3000/api/workers/registry"
    echo "💡 View logs: tmux attach-session -t ${SESSION_NAME} && tmux select-window -t ${TELEMETRY_WINDOW_INDEX}"
    exit 0
  fi
  sleep 1
done

echo "❌ Failed to start Worker Telemetry API (timeout after 30s)"
if command -v tmux &> /dev/null && tmux has-session -t "${SESSION_NAME}" 2>/dev/null; then
  echo "📋 Check logs: tmux attach-session -t ${SESSION_NAME}"
  echo "📋 View telemetry window: tmux select-window -t ${SESSION_NAME}:${TELEMETRY_WINDOW_INDEX}"
  echo "📋 Capture output: tmux capture-pane -t ${SESSION_NAME}:${TELEMETRY_WINDOW_INDEX} -p -S -30"
fi
exit 1

