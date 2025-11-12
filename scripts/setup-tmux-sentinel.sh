#!/bin/bash
# TES-NGWS-001.12c: Setup tmux for Sentinel Project

set -euo pipefail

echo "🔐 Setting up tmux for TES-NGWS-001.12c..."

# 0. Copy tmux config if missing
if [[ ! -f ~/.tmux.conf ]] && [[ -f .tmux.conf.example ]]; then
  echo "Copying tmux configuration..."
  cp .tmux.conf.example ~/.tmux.conf
  echo "✅ tmux config copied to ~/.tmux.conf"
  # Reload config if tmux is running
  if tmux list-sessions &>/dev/null; then
    tmux source-file ~/.tmux.conf 2>/dev/null && echo "✅ Config reloaded" || echo "⚠️  Could not reload config"
  fi
fi

# 1. Install tmux plugin manager if missing
if [[ ! -d ~/.tmux/plugins/tpm ]]; then
  echo "Installing tmux plugin manager..."
  git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm
fi

# 2. Install plugins (only if config exists)
echo "Installing tmux plugins..."
if [[ -f ~/.tmux.conf ]]; then
  ~/.tmux/plugins/tpm/bin/install_plugins || echo "⚠️  Plugin installation skipped (config may need reload)"
else
  echo "⚠️  ~/.tmux.conf not found, skipping plugin installation"
fi

# 3. Verify config syntax
echo "Verifying tmux configuration..."
tmux list-keys | grep -q "sentinel" && echo "✅ Config loaded" || echo "⚠️  Config not loaded"

# 4. Create sentinel session
SESSION_NAME="sentinel-$(basename "$(pwd)" | tr ' ' '-')"
echo "Creating session: $SESSION_NAME"
tmux new-session -d -s "$SESSION_NAME" -c "$(pwd)" 2>/dev/null || echo "ℹ️  Session exists"

# 5. Set up windows
tmux new-window -t "$SESSION_NAME":1 -n "🚀 main" 2>/dev/null
tmux new-window -t "$SESSION_NAME":2 -n "🛡️ security" 2>/dev/null
tmux new-window -t "$SESSION_NAME":3 -n "📊 metrics" 2>/dev/null
tmux new-window -t "$SESSION_NAME":4 -n "📝 logs" 2>/dev/null
tmux new-window -t "$SESSION_NAME":5 -n "💻 shell" 2>/dev/null

# 6. Restrict socket permissions
TMUX_SOCKET=$(tmux display-message -p "#{socket_path}")
chmod 600 "$TMUX_SOCKET" 2>/dev/null

echo "✅ tmux setup complete"
echo "Attach with: tmux attach-session -t $SESSION_NAME"
echo "or: code . (will auto-attach)"
