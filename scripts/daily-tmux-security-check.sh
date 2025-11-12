#!/bin/bash

# scripts/daily-tmux-security-check.sh

echo "🔐 Daily tmux security check..."

# 1. Socket permissions
SOCKET=$(tmux display-message -p "#{socket_path}" 2>/dev/null)

check_socket() {
  if [ -z "$1" ] || [ ! -S "$1" ]; then
    echo "⚠️  Socket not found"
    return
  fi
  
  local socket_perms=$(stat -f "%OLp" "$1" 2>/dev/null || stat -c "%a" "$1" 2>/dev/null)
  local dir_perms=$(stat -f "%OLp" "$(dirname "$1")" 2>/dev/null || stat -c "%a" "$(dirname "$1")" 2>/dev/null)
  
  local socket_ok=false
  local dir_ok=false
  
  [[ "$socket_perms" == "600" ]] && socket_ok=true
  [[ "$dir_perms" == "700" ]] && dir_ok=true
  
  if [ "$socket_ok" = true ] && [ "$dir_ok" = true ]; then
    echo "✅ Socket 600/700"
  else
    echo "❌ Socket $socket_perms / Dir $dir_perms"
  fi
}

# 2. No leaked secrets
check_env() {
  # Exclude known safe variables that contain keywords but aren't secrets
  local leaks=$(tmux showenv -g | grep -Evi "NO_KEYRING|DISABLE.*KEY|KEYRING.*DISABLE" | grep -Eci "(^|_)(TOKEN|SECRET|PASSWORD|API_KEY|PRIVATE_KEY|ACCESS_KEY|SECRET_KEY)=")
  [[ "$leaks" -eq 0 ]] && echo "✅ No env leaks" || echo "❌ $leaks leaked vars"
}

# 3. Status bar safety
check_status() {
  local left=$(tmux show-options -gv status-left)
  local right=$(tmux show-options -gv status-right)
  [[ "$left" == *"\`"* ]] || [[ "$right" == *"\`"* ]] && echo "❌ Status bar has backticks" || echo "✅ Status bar secure"
}

# 4. Session naming
check_names() {
  local bad=$(tmux list-sessions -F "#{session_name}" | grep -c "\\n")
  [[ "$bad" -eq 0 ]] && echo "✅ No bad session names" || echo "❌ Found \\n in names"
}

# Run checks
check_socket "$SOCKET"
check_env
check_status
check_names

echo "🏁 Check complete"

