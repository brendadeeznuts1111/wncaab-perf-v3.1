#!/usr/bin/env bash
set -euo pipefail

# TES-NGWS-001.11b Production Restart
# Ensures zero alert loss during deployment

OLD_PID_FILE="tmp/sentinel.pid"
RG_LOG="logs/headers-index.log"
RESTART_ID="restart-$(date +%s)"

# Ensure directories exist
mkdir -p tmp logs

log_restart_event() {
  local event="$1"
  local status="$2"
  local ref="${3:-internal}"
  
  rg_block="[HEADERS_BLOCK_START:v1]{restartId:${RESTART_ID}|event:${event}|status:${status}}~[SYSTEM][tes.internal][OPS][DEPLOY][BUN-V1.3][TES-NGWS-001.11b][RestartScript][#REF:${ref}][TIMESTAMP:$(date +%s)][HEADERS_BLOCK_END]"
  echo "$(date -Iseconds) $rg_block" >> "$RG_LOG"
  echo "[$(date +%T)] $event: $status" >&2
}

# 1. Log restart initiation
log_restart_event "RESTART_INIT" "STARTING"

# 2. Check if old process exists
if [[ -f "$OLD_PID_FILE" ]]; then
  OLD_PID=$(cat "$OLD_PID_FILE")
  
  if kill -0 "$OLD_PID" 2>/dev/null; then
    log_restart_event "OLD_PID_FOUND" "PID:$OLD_PID"
    
    # 3. Graceful shutdown (SIGTERM allows cleanup)
    log_restart_event "SIGTERM_SEND" "PID:$OLD_PID"
    kill -TERM "$OLD_PID"
    
    # 4. Wait for graceful exit (max 10 seconds)
    for i in {1..10}; do
      if ! kill -0 "$OLD_PID" 2>/dev/null; then
        log_restart_event "OLD_PROCESS_EXITED" "SUCCESS"
        break
      fi
      sleep 1
    done
    
    # 5. Force kill if still running
    if kill -0 "$OLD_PID" 2>/dev/null; then
      log_restart_event "FORCE_KILL" "PID:$OLD_PID"
      kill -KILL "$OLD_PID" 2>/dev/null || true
    fi
  else
    log_restart_event "OLD_PID_STALE" "Removing stale PID file"
  fi
  
  rm -f "$OLD_PID_FILE"
fi

# Also check for process on port 3001 (index-unified.ts)
PORT_PID=$(lsof -ti:3001 2>/dev/null || echo "")
if [[ -n "$PORT_PID" ]]; then
  log_restart_event "PORT_PID_FOUND" "PID:$PORT_PID"
  kill -TERM "$PORT_PID" 2>/dev/null || true
  sleep 2
  if kill -0 "$PORT_PID" 2>/dev/null; then
    kill -KILL "$PORT_PID" 2>/dev/null || true
  fi
fi

# 6. Start new process
log_restart_event "NEW_PROCESS_START" "Launching..."

# Use index-unified.ts (the one with health endpoint)
nohup bun run src/index-unified.ts > /tmp/sentinel.stdout.log 2>&1 &
NEW_PID=$!

# 7. Save PID
echo "$NEW_PID" > "$OLD_PID_FILE"
log_restart_event "NEW_PID_SAVED" "PID:$NEW_PID"

# 8. Health check (wait for health endpoint)
log_restart_event "HEALTH_CHECK" "Waiting for health endpoint..."

for i in {1..30}; do
  if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    log_restart_event "HEALTH_CHECK" "PASSED"
    break
  fi
  sleep 1
done

# 9. Verify no immediate errors
sleep 2
if rg -q "ERROR|FATAL" /tmp/sentinel.stdout.log 2>/dev/null; then
  log_restart_event "HEALTH_CHECK" "FAILED - Errors detected"
  echo "❌ Errors detected in startup log:"
  tail -20 /tmp/sentinel.stdout.log
  exit 1
fi

# 10. Log completion
log_restart_event "RESTART_COMPLETE" "SUCCESS"
echo ""
echo "✅ Sentinel restarted successfully. PID: $NEW_PID"
echo "📊 Monitor logs: tail -f $RG_LOG | rg '$RESTART_ID'"
echo "📊 Monitor stdout: tail -f /tmp/sentinel.stdout.log"
echo "🏥 Health check: curl http://localhost:3001/health"







