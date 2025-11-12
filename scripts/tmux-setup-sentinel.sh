#!/bin/bash
# TES-NGWS-001.12c: tmux Sentinel Session Setup
# Creates or attaches to the sentinel tmux session with predefined windows

set -euo pipefail

WORKSPACE_NAME="${WORKSPACE_FOLDER:-$(basename "$(pwd)")}"
SESSION_NAME="sentinel-${WORKSPACE_NAME}"

echo "🔧 Setting up tmux session: ${SESSION_NAME}"

# Check if session already exists
if tmux has-session -t "${SESSION_NAME}" 2>/dev/null; then
    echo "✅ Session ${SESSION_NAME} already exists"
    echo "💡 Attach with: tmux attach-session -t ${SESSION_NAME}"
    exit 0
fi

# Create new session
echo "📦 Creating new tmux session..."
tmux new-session -d -s "${SESSION_NAME}" -c "$(pwd)"

# Create windows with specific purposes
echo "🪟 Creating windows..."

# Window 1: Main development
tmux new-window -t "${SESSION_NAME}:1" -n "🚀 main"
tmux send-keys -t "${SESSION_NAME}:1" "echo 'Main development window - run: bun run dev'" Enter

# Window 2: Security monitoring
tmux new-window -t "${SESSION_NAME}:2" -n "🛡️ security"
tmux send-keys -t "${SESSION_NAME}:2" "echo 'Security monitoring window'" Enter

# Window 3: Metrics dashboard
tmux new-window -t "${SESSION_NAME}:3" -n "📊 metrics"
tmux send-keys -t "${SESSION_NAME}:3" "echo 'Metrics dashboard window'" Enter

# Window 4: Log analysis
tmux new-window -t "${SESSION_NAME}:4" -n "📝 logs"
tmux send-keys -t "${SESSION_NAME}:4" "echo 'Log analysis window'" Enter

# Window 5: Command shell (default for Cursor agents)
tmux new-window -t "${SESSION_NAME}:5" -n "💻 shell"
tmux send-keys -t "${SESSION_NAME}:5" "echo 'Command shell - Cursor agents use this window'" Enter

# Select the shell window as default
tmux select-window -t "${SESSION_NAME}:5"

echo "✅ tmux session ${SESSION_NAME} created successfully!"
echo ""
echo "📋 Windows:"
tmux list-windows -t "${SESSION_NAME}" -F "  #{window_index}: #{window_name}"
echo ""
echo "💡 Attach with: tmux attach-session -t ${SESSION_NAME}"
echo "💡 Or use VS Code/Cursor integrated terminal (auto-attaches)"



