#!/bin/bash
# scripts/fix-tmux-session-names.sh
# TES-NGWS-001.12c: Fix malformed tmux session names (weekly cleanup)

set -euo pipefail

echo "🔧 Fixing tmux session names..."
echo "Timestamp: $(date -Iseconds)"

MALFORMED_COUNT=0
FIXED_COUNT=0

# Check all sentinel sessions for invalid names
tmux list-sessions -F "#{session_name}" 2>/dev/null | grep "^sentinel-" | while read -r session_name; do
  # Check if session name contains newlines, spaces, or doesn't match pattern
  if echo "$session_name" | grep -qE '[[:space:]]' || \
     ! echo "$session_name" | grep -qE '^sentinel-[a-zA-Z0-9_-]+$'; then
    echo "❌ Found malformed sentinel session: $session_name"
    ((MALFORMED_COUNT++)) || true
    
    # Try to kill malformed session
    if tmux kill-session -t "$session_name" 2>/dev/null; then
      echo "   ✅ Killed malformed session"
      ((FIXED_COUNT++)) || true
    else
      echo "   ⚠️  Failed to kill (may already be gone or attached)"
    fi
  fi
done

# Verify socket permissions
SOCKET_DIR="/tmp/tmux-$(id -u)"
if [ -d "$SOCKET_DIR" ]; then
  chmod 700 "$SOCKET_DIR" 2>/dev/null || true
  find "$SOCKET_DIR" -type s -exec chmod 600 {} \; 2>/dev/null || true
  echo "✅ Socket permissions verified"
fi

# Summary
if [ "$MALFORMED_COUNT" -eq 0 ]; then
  echo "✅ No malformed sentinel sessions found"
else
  echo "🏁 Fixed $FIXED_COUNT of $MALFORMED_COUNT malformed session(s)"
fi

echo ""

