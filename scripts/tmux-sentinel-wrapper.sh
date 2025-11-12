#!/bin/bash
# scripts/tmux-sentinel-wrapper.sh
# TES-NGWS-001.12c: Sanitized tmux session name wrapper
# Prevents malformed session names from workspace folder names with spaces/special chars

set -euo pipefail

# Get workspace folder from environment or current directory
WORKSPACE_FOLDER="${WORKSPACE_FOLDER:-$(pwd)}"
WORKSPACE_BASENAME=$(basename "$WORKSPACE_FOLDER")

# Sanitize: replace spaces, newlines, and special chars with hyphens
# Remove leading/trailing hyphens, collapse multiple hyphens
SANITIZED=$(echo "$WORKSPACE_BASENAME" | \
  tr -d '\n\r' | \
  tr '[:space:]' '-' | \
  tr -cd '[:alnum:]-_' | \
  sed 's/--*/-/g' | \
  sed 's/^-\+//' | \
  sed 's/-\+$//')

SESSION_NAME="sentinel-${SANITIZED}"

# Ensure session name is valid (tmux allows: alphanumeric, hyphens, underscores)
if ! echo "$SESSION_NAME" | grep -qE '^sentinel-[a-zA-Z0-9_-]+$'; then
  echo "Error: Invalid session name generated: $SESSION_NAME" >&2
  exit 1
fi

# Execute tmux with sanitized session name
exec tmux new-session -A -s "$SESSION_NAME" -c "$WORKSPACE_FOLDER"

