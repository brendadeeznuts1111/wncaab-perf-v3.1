#!/bin/bash
# scripts/verify-tmux-config.sh

echo "🔒 Verifying tmux configuration for TES-NGWS-001.12c..."

# Check 1: tmux version
tmux -V | grep -q "tmux 3." && echo "✅ tmux 3.x installed" || echo "⚠️  Update tmux to 3.x"

# Check 2: Config file exists
[[ -f ~/.tmux.conf ]] && echo "✅ ~/.tmux.conf exists" || echo "❌ Missing ~/.tmux.conf"

# Check 3: Session exists
SESSION_NAME="sentinel-$(basename "$(pwd)" | tr ' ' '-')"
tmux has-session -t "$SESSION_NAME" 2>/dev/null && echo "✅ Session $SESSION_NAME exists" || echo "❌ Session missing"

# Check 4: Socket permissions
SOCKET=$(tmux display-message -p "#{socket_path}" 2>/dev/null)
if [[ -n "$SOCKET" ]]; then
  PERMS=$(stat -f "%OLp" "$SOCKET" 2>/dev/null || stat -c "%a" "$SOCKET" 2>/dev/null)
  [[ "$PERMS" == "600" ]] && echo "✅ Socket permissions 0600" || echo "❌ Socket permissions $PERMS (should be 600)"
fi

# Check 5: Plugins installed
[[ -d ~/.tmux/plugins/tpm ]] && echo "✅ tmux plugin manager installed" || echo "❌ tpm missing"
[[ -d ~/.tmux/plugins/tmux-resurrect ]] && echo "✅ Resurrect plugin installed" || echo "❌ Resurrect missing"

# Check 6: VS Code integration
echo "✅ VS Code profile: tmux-sentinel"
grep -q "tmux-sentinel" .vscode/settings.json && echo "✅ VS Code configured" || echo "❌ VS Code not configured"

echo "🏁 Verification complete"
