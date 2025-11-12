#!/bin/bash
# Performance Benchmarking Script - TES-NGWS-001.12
# Run periodically to analyze system performance metrics

LOG_FILE="logs/headers-index.log"

if [ ! -f "$LOG_FILE" ]; then
  echo "❌ Log file not found: $LOG_FILE"
  exit 1
fi

echo "📈 NowGoal WebSocket Performance Metrics"
echo "========================================"
echo ""

# 1. Latency percentile analysis
echo "⏱️  XML Parsing Latency:"
XML_TIMES=$(rg "\[XML_PARSE\]" "$LOG_FILE" 2>/dev/null | rg -o "processingMs:([\d.]+)" -r '$1' | sort -n)
if [ -n "$XML_TIMES" ]; then
  echo "$XML_TIMES" | awk '{
    count++;
    sum+=$1;
    if($1 > max || max == 0) max=$1;
    if(count == int(NR*0.50)) p50=$1;
    if(count == int(NR*0.95)) p95=$1;
    if(count == int(NR*0.99)) p99=$1;
  } END {
    if(count > 0) {
      print "  p50:", p50, "ms";
      print "  p95:", p95, "ms";
      print "  p99:", p99, "ms";
      print "  avg:", (sum/count), "ms";
      print "  max:", max, "ms";
      print "  samples:", count;
    } else {
      print "  No data available";
    }
  }'
else
  echo "  No XML parse data found"
fi
echo ""

# 2. Steam detection rate
STEAM_COUNT=$(rg "\[STEAM_DETECTED\]" "$LOG_FILE" 2>/dev/null | wc -l | tr -d ' ')
echo "🚨 Steam Detections: $STEAM_COUNT"
echo ""

# 3. Message rate
MSG_COUNT=$(rg -E "\[WS_MESSAGE\]|XML_RECEIVED|XML_PARSE" "$LOG_FILE" 2>/dev/null | wc -l | tr -d ' ')
if [ "$MSG_COUNT" -gt 0 ]; then
  # Calculate time span
  FIRST_TIME=$(rg -E "TIMESTAMP:(\d+)" "$LOG_FILE" 2>/dev/null | head -1 | rg -o "TIMESTAMP:(\d+)" -r '$1')
  LAST_TIME=$(rg -E "TIMESTAMP:(\d+)" "$LOG_FILE" 2>/dev/null | tail -1 | rg -o "TIMESTAMP:(\d+)" -r '$1')
  
  if [ -n "$FIRST_TIME" ] && [ -n "$LAST_TIME" ]; then
    TIME_SPAN=$(( (LAST_TIME - FIRST_TIME) / 1000 ))
    if [ "$TIME_SPAN" -gt 0 ]; then
      MSG_RATE=$(echo "scale=2; $MSG_COUNT / $TIME_SPAN" | bc)
      echo "📊 Message Rate: $MSG_RATE msg/s (${MSG_COUNT} messages over ${TIME_SPAN}s)"
    else
      echo "📊 Message Rate: ${MSG_COUNT} messages (insufficient time span)"
    fi
  else
    echo "📊 Message Rate: ${MSG_COUNT} messages"
  fi
else
  echo "📊 Message Rate: 0 messages"
fi
echo ""

# 4. Reconnection frequency
RECONNECT_COUNT=$(rg "\[WS_RECONNECT_SCHEDULED\]|RECONNECT_SCHEDULED" "$LOG_FILE" 2>/dev/null | wc -l | tr -d ' ')
echo "🔄 Reconnections: $RECONNECT_COUNT"
echo ""

# 5. Error rate
ERROR_COUNT=$(rg -E "\[ERROR\]|ERROR|PARSE_ERROR" "$LOG_FILE" 2>/dev/null | wc -l | tr -d ' ')
if [ "$MSG_COUNT" -gt 0 ]; then
  ERROR_RATE=$(echo "scale=4; $ERROR_COUNT / $MSG_COUNT * 100" | bc)
  echo "❌ Error Rate: $ERROR_RATE% ($ERROR_COUNT errors / $MSG_COUNT messages)"
else
  echo "❌ Error Rate: $ERROR_COUNT errors"
fi
echo ""

# 6. JWT refresh frequency
JWT_REFRESH_COUNT=$(rg "\[JWT_REFRESH\]|JWT_REFRESHED" "$LOG_FILE" 2>/dev/null | wc -l | tr -d ' ')
echo "🔐 JWT Refreshes: $JWT_REFRESH_COUNT"
echo ""

# 7. Compression status
COMPRESSION_STATUS=$(rg "compressionEnabled" "$LOG_FILE" 2>/dev/null | tail -1 | rg -o "compressionEnabled:(true|false)" -r '$1')
if [ "$COMPRESSION_STATUS" = "true" ]; then
  echo "✅ Compression: ENABLED"
elif [ "$COMPRESSION_STATUS" = "false" ]; then
  echo "⚠️  Compression: DISABLED"
else
  echo "⚠️  Compression: Unknown"
fi

echo ""
echo "========================================"

