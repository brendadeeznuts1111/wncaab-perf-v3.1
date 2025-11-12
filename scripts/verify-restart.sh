#!/usr/bin/env bash
# Post-Restart Verification Script - TES-NGWS-001.11b

echo "🔍 Post-Restart Verification"
echo "============================"
echo ""

# 1. Confirm new PID is running
NEW_PID=$(cat tmp/sentinel.pid 2>/dev/null || echo "")
if [[ -n "$NEW_PID" ]]; then
  if ps aux | grep -q "$NEW_PID.*index-unified"; then
    echo "✅ Process running: PID $NEW_PID"
  else
    echo "❌ Process not found: PID $NEW_PID"
  fi
else
  echo "⚠️  No PID file found"
fi

echo ""

# 2. Health endpoint check
echo "🏥 Health Check:"
HEALTH=$(curl -s http://localhost:3001/health 2>/dev/null)
if [[ -n "$HEALTH" ]]; then
  echo "$HEALTH" | jq '{status, active_pollers, match_ids, recent_moves, uptime}' 2>/dev/null || echo "$HEALTH"
else
  echo "❌ Health endpoint not responding"
fi

echo ""

# 3. Check for steam detections
echo "🚨 Steam Detections (last 5 minutes):"
STEAM_COUNT=$(rg "\[STEAM_DETECTED\]" logs/headers-index.log 2>/dev/null | wc -l | tr -d ' ')
echo "   Total detections: $STEAM_COUNT"

if [[ "$STEAM_COUNT" -gt 0 ]]; then
  echo "   Recent detections:"
  rg "\[STEAM_DETECTED\]" logs/headers-index.log 2>/dev/null | tail -5 | while read line; do
    echo "   - $line"
  done
else
  echo "   ⏳ No detections yet (this is normal for first few minutes)"
fi

echo ""

# 4. Check WebSocket connection
echo "🔌 WebSocket Status:"
if rg -q "WS_OPEN\|Connected to NowGoal" /tmp/sentinel.stdout.log 2>/dev/null; then
  echo "   ✅ WebSocket connected"
else
  echo "   ⏳ WebSocket connecting..."
fi

echo ""

# 5. Check for errors
echo "❌ Error Check:"
ERROR_COUNT=$(rg -i "error\|fatal\|exception" /tmp/sentinel.stdout.log 2>/dev/null | wc -l | tr -d ' ')
if [[ "$ERROR_COUNT" -eq 0 ]]; then
  echo "   ✅ No errors detected"
else
  echo "   ⚠️  Found $ERROR_COUNT error(s):"
  rg -i "error\|fatal\|exception" /tmp/sentinel.stdout.log 2>/dev/null | tail -3
fi

echo ""
echo "📊 Monitor commands:"
echo "   tail -f logs/headers-index.log | rg 'STEAM_DETECTED'"
echo "   tail -f /tmp/sentinel.stdout.log"
echo "   curl http://localhost:3001/metrics | jq '.poller'"







