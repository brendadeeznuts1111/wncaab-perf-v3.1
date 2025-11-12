#!/bin/bash
# scripts/tmux-telemetry.sh
# Helper script to manage Worker Telemetry API in tmux
# Usage: ./scripts/tmux-telemetry.sh [attach|status|stop|logs]

set -euo pipefail

# Get workspace folder and session name (matches dev server pattern)
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
TELEMETRY_WINDOW="📡 telemetry"
TELEMETRY_WINDOW_INDEX="2"

ACTION="${1:-attach}"

case "$ACTION" in
  attach)
    if ! tmux has-session -t "${SESSION_NAME}" 2>/dev/null; then
      echo "❌ Session ${SESSION_NAME} does not exist"
      echo "💡 Start telemetry with: ./scripts/activate-telemetry.sh"
      exit 1
    fi
    
    if ! tmux list-windows -t "${SESSION_NAME}" -F "#{window_name}" | grep -q "^${TELEMETRY_WINDOW}$"; then
      echo "❌ Telemetry window does not exist"
      echo "💡 Start telemetry with: ./scripts/activate-telemetry.sh"
      exit 1
    fi
    
    echo "🔗 Attaching to telemetry window..."
    tmux select-window -t "${SESSION_NAME}:${TELEMETRY_WINDOW_INDEX}"
    tmux attach-session -t "${SESSION_NAME}"
    ;;
    
  status)
    echo "📊 Worker Telemetry API Status"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Check API health
    if curl -s http://localhost:3000/api/workers/registry > /dev/null 2>&1; then
      echo "✅ API Status: Running on port 3000"
      
      # Get worker count
      WORKER_COUNT=$(curl -s http://localhost:3000/api/workers/registry 2>/dev/null | grep -o '"total":[0-9]*' | grep -o '[0-9]*' || echo "0")
      echo "👷 Workers: ${WORKER_COUNT}"
    else
      echo "❌ API Status: Not running"
    fi
    
    echo ""
    echo "📦 tmux Session: ${SESSION_NAME}"
    if tmux has-session -t "${SESSION_NAME}" 2>/dev/null; then
      echo "✅ Session exists"
      
      if tmux list-windows -t "${SESSION_NAME}" -F "#{window_name}" | grep -q "^${TELEMETRY_WINDOW}$"; then
        echo "✅ Telemetry window exists"
        
        # Check if process is running in window
        if tmux capture-pane -t "${SESSION_NAME}:${TELEMETRY_WINDOW_INDEX}" -p 2>/dev/null | grep -q "Worker Telemetry API\|TES-WORKER-API\|Listening on 3000"; then
          echo "✅ Process appears to be running in tmux"
        else
          echo "⚠️  Process not detected in window output"
        fi
      else
        echo "❌ Telemetry window does not exist"
      fi
    else
      echo "❌ Session does not exist"
    fi
    
    echo ""
    echo "💡 Commands:"
    echo "  ./scripts/tmux-telemetry.sh attach  - Attach to telemetry window"
    echo "  ./scripts/tmux-telemetry.sh logs    - View recent logs"
    echo "  ./scripts/tmux-telemetry.sh stop    - Stop the API"
    ;;
    
  logs)
    if ! tmux has-session -t "${SESSION_NAME}" 2>/dev/null; then
      echo "❌ Session ${SESSION_NAME} does not exist"
      exit 1
    fi
    
    if ! tmux list-windows -t "${SESSION_NAME}" -F "#{window_name}" | grep -q "^${TELEMETRY_WINDOW}$"; then
      echo "❌ Telemetry window does not exist"
      exit 1
    fi
    
    echo "📋 Recent telemetry logs (last 50 lines):"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    tmux capture-pane -t "${SESSION_NAME}:${TELEMETRY_WINDOW_INDEX}" -p -S -50
    ;;
    
  stop)
    echo "🛑 Stopping Worker Telemetry API..."
    
    # Check if running via API
    if curl -s http://localhost:3000/api/workers/registry > /dev/null 2>&1; then
      # Try graceful shutdown via tmux
      if tmux has-session -t "${SESSION_NAME}" 2>/dev/null && \
         tmux list-windows -t "${SESSION_NAME}" -F "#{window_name}" | grep -q "^${TELEMETRY_WINDOW}$"; then
        echo "📤 Sending Ctrl+C to telemetry window..."
        tmux send-keys -t "${SESSION_NAME}:${TELEMETRY_WINDOW_INDEX}" C-c
        sleep 2
        
        # Check if still running
        if curl -s http://localhost:3000/api/workers/registry > /dev/null 2>&1; then
          echo "⚠️  API still running, killing process..."
          PID=$(lsof -ti:3000 | head -1)
          kill "${PID}" 2>/dev/null || true
        else
          echo "✅ API stopped gracefully"
        fi
      else
        # Kill by port
        PID=$(lsof -ti:3000 | head -1)
        if [ -n "${PID}" ]; then
          echo "🔪 Killing process on port 3000 (PID: ${PID})"
          kill "${PID}" 2>/dev/null || true
          echo "✅ Process killed"
        else
          echo "✅ No process found on port 3000"
        fi
      fi
    else
      echo "✅ API is not running"
    fi
    ;;
    
  *)
    echo "Usage: $0 [attach|status|stop|logs]"
    echo ""
    echo "Commands:"
    echo "  attach  - Attach to telemetry window in tmux"
    echo "  status  - Show API and tmux session status"
    echo "  logs    - View recent logs from telemetry window"
    echo "  stop    - Stop the Worker Telemetry API"
    exit 1
    ;;
esac
