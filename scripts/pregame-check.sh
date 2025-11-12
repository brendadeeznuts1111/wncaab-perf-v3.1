#!/bin/bash
# WNCAAAB Pre-Game System Check - TES-NGWS-001.12
# Run 1 hour before tip-off to verify system readiness

echo "🎯 WNCAAAB Pre-Game System Check"
echo "================================="
echo ""

LOG_FILE="logs/headers-index.log"
ERRORS=0
WARNINGS=0

# 1. Verify JWT freshness (should be < 1 min old)
if [ -f "$LOG_FILE" ]; then
  JWT_LINE=$(rg "\[JWT_ACQUIRED\]" "$LOG_FILE" 2>/dev/null | tail -1)
  if [ -n "$JWT_LINE" ]; then
    # Extract timestamp from log line
    JWT_TIME=$(echo "$JWT_LINE" | rg -o "TIMESTAMP:(\d+)" -r '$1' | tail -1)
    if [ -n "$JWT_TIME" ]; then
      CURRENT_TIME=$(date +%s)000
      JWT_AGE=$((CURRENT_TIME - JWT_TIME))
      JWT_AGE_SEC=$((JWT_AGE / 1000))
      
      if [ $JWT_AGE_SEC -lt 60 ]; then
        echo "✅ JWT Age: ${JWT_AGE_SEC}s (FRESH)"
      elif [ $JWT_AGE_SEC -lt 300 ]; then
        echo "⚠️  JWT Age: ${JWT_AGE_SEC}s (WILL EXPIRE SOON)"
        WARNINGS=$((WARNINGS + 1))
      else
        echo "❌ JWT Age: ${JWT_AGE_SEC}s (STALE)"
        ERRORS=$((ERRORS + 1))
      fi
    else
      echo "⚠️  JWT: Could not extract timestamp"
      WARNINGS=$((WARNINGS + 1))
    fi
  else
    echo "❌ JWT: No acquisition found in logs"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "❌ Log file not found: $LOG_FILE"
  ERRORS=$((ERRORS + 1))
fi

# 2. Check WebSocket connection state
if [ -f "$LOG_FILE" ]; then
  if rg -q "\[WS_OPEN\]" "$LOG_FILE" 2>/dev/null || rg -q "WS_CONNECTED" "$LOG_FILE" 2>/dev/null; then
    # Check if connection is recent (within last 5 minutes)
    WS_LINE=$(rg -E "WS_CONNECTED|WS_OPEN" "$LOG_FILE" 2>/dev/null | tail -1)
    if [ -n "$WS_LINE" ]; then
      WS_TIME=$(echo "$WS_LINE" | rg -o "TIMESTAMP:(\d+)" -r '$1' | tail -1)
      if [ -n "$WS_TIME" ]; then
        CURRENT_TIME=$(date +%s)000
        WS_AGE=$((CURRENT_TIME - WS_TIME))
        WS_AGE_SEC=$((WS_AGE / 1000))
        
        if [ $WS_AGE_SEC -lt 300 ]; then
          echo "✅ WebSocket: CONNECTED (${WS_AGE_SEC}s ago)"
        else
          echo "⚠️  WebSocket: CONNECTED but stale (${WS_AGE_SEC}s ago)"
          WARNINGS=$((WARNINGS + 1))
        fi
      else
        echo "✅ WebSocket: CONNECTED"
      fi
    else
      echo "✅ WebSocket: CONNECTED"
    fi
  else
    echo "❌ WebSocket: DISCONNECTED"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "❌ WebSocket: Cannot check (log file missing)"
  ERRORS=$((ERRORS + 1))
fi

# 3. Message rate baseline (should be > 0)
if [ -f "$LOG_FILE" ]; then
  MSG_COUNT=$(rg -E "\[WS_MESSAGE\]|XML_RECEIVED|XML_PARSE" "$LOG_FILE" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$MSG_COUNT" -gt 0 ]; then
    echo "✅ Message Rate: $MSG_COUNT messages received"
  else
    echo "⚠️  Message Rate: 0 messages (waiting for data)"
    WARNINGS=$((WARNINGS + 1))
  fi
else
  echo "⚠️  Message Rate: Cannot check (log file missing)"
  WARNINGS=$((WARNINGS + 1))
fi

# 4. Steam analyzer status
if [ -f "$LOG_FILE" ]; then
  STEAM_COUNT=$(rg "\[STEAM_DETECTED\]" "$LOG_FILE" 2>/dev/null | wc -l | tr -d ' ')
  if rg -q "\[STEAM_DETECTED\]" "$LOG_FILE" 2>/dev/null; then
    echo "✅ Analyzer: ACTIVE ($STEAM_COUNT detections)"
  else
    echo "⚠️  Analyzer: Waiting for first tick"
    WARNINGS=$((WARNINGS + 1))
  fi
else
  echo "⚠️  Analyzer: Cannot check (log file missing)"
  WARNINGS=$((WARNINGS + 1))
fi

# 5. Worker pool health (if applicable)
if [ -f "$LOG_FILE" ]; then
  WORKER_OPS=$(rg "\[WORKER\]" "$LOG_FILE" 2>/dev/null | wc -l | tr -d ' ')
  echo "✅ Worker Pool: $WORKER_OPS operations"
else
  echo "⚠️  Worker Pool: Cannot check"
  WARNINGS=$((WARNINGS + 1))
fi

# 6. Error count (should be 0)
if [ -f "$LOG_FILE" ]; then
  ERROR_COUNT=$(rg -E "\[ERROR\]|ERROR|PARSE_ERROR" "$LOG_FILE" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$ERROR_COUNT" -eq 0 ]; then
    echo "✅ Errors: 0"
  else
    echo "❌ Errors: $ERROR_COUNT"
    ERRORS=$((ERRORS + ERROR_COUNT))
  fi
else
  echo "⚠️  Errors: Cannot check"
  WARNINGS=$((WARNINGS + 1))
fi

# 7. Compression status check
if [ -f "$LOG_FILE" ]; then
  COMPRESSION=$(rg "compressionEnabled" "$LOG_FILE" 2>/dev/null | tail -1 | rg -o "compressionEnabled:(true|false)" -r '$1')
  if [ "$COMPRESSION" = "true" ]; then
    echo "✅ Compression: ENABLED"
  elif [ "$COMPRESSION" = "false" ]; then
    echo "⚠️  Compression: DISABLED (higher bandwidth usage)"
    WARNINGS=$((WARNINGS + 1))
  else
    echo "⚠️  Compression: Unknown"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

echo ""
echo "================================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo "🚀 System Status: GREEN"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo "⚠️  System Status: YELLOW ($WARNINGS warnings)"
  exit 0
else
  echo "❌ System Status: RED ($ERRORS errors, $WARNINGS warnings)"
  exit 1
fi

