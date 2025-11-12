#!/bin/bash
# scripts/cleanup-malformed-sessions.sh
# TES-NGWS-001.12c: Remove malformed tmux sessions with invalid names

set -euo pipefail

echo "🔍 Scanning for malformed sentinel tmux sessions..."

MALFORMED_COUNT=0

# Check only sentinel sessions for invalid names
tmux list-sessions -F "#{session_name}" 2>/dev/null | grep "^sentinel-" | while read -r session_name; do
  # Check if session name contains newlines, spaces, or doesn't match pattern
  if echo "$session_name" | grep -qE '[[:space:]]' || \
     ! echo "$session_name" | grep -qE '^sentinel-[a-zA-Z0-9_-]+$'; then
    echo "❌ Found malformed sentinel session: $session_name"
    if tmux kill-session -t "$session_name" 2>/dev/null; then
      echo "   ✅ Killed"
      ((MALFORMED_COUNT++)) || true
    else
      echo "   ⚠️  Failed to kill (may already be gone)"
    fi
  fi
done

if [ "$MALFORMED_COUNT" -eq 0 ]; then
  echo "✅ No malformed sentinel sessions found"
else
  echo "🏁 Cleaned up $MALFORMED_COUNT malformed sentinel session(s)"
fi

