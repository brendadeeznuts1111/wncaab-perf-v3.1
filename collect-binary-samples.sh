#!/bin/bash
# Binary Sample Collection Helper Script
# Usage: ./collect-binary-samples.sh [duration_seconds]

DURATION=${1:-180}  # Default to 180 seconds (3 minutes)
LOG_FILE="binary-samples.log"
PID_FILE=".test-nowgoal.pid"

echo "🚀 Starting binary sample collection..."
echo "⏱️  Duration: ${DURATION} seconds ($(($DURATION / 60)) minutes)"
echo "📝 Log file: ${LOG_FILE}"
echo ""

# Start the test script in background
cd "$(dirname "$0")"
bun run test-nowgoal-connection.ts > "${LOG_FILE}" 2>&1 &
TEST_PID=$!
echo $TEST_PID > "${PID_FILE}"

echo "✅ Process started (PID: ${TEST_PID})"
echo "📊 Collecting samples..."
echo ""

# Wait for the specified duration
for i in $(seq 1 $DURATION); do
  if ! kill -0 $TEST_PID 2>/dev/null; then
    echo "⚠️  Process ended early (exit code: $?)"
    break
  fi
  if [ $((i % 30)) -eq 0 ]; then
    echo "⏳ ${i}/${DURATION} seconds elapsed..."
  fi
  sleep 1
done

# Stop the process
if kill -0 $TEST_PID 2>/dev/null; then
  echo ""
  echo "🛑 Stopping collection..."
  kill $TEST_PID 2>/dev/null
  wait $TEST_PID 2>/dev/null
  echo "✅ Collection stopped"
else
  echo "⚠️  Process already stopped"
fi

rm -f "${PID_FILE}"

echo ""
echo "📊 Collection complete!"
echo "📁 Log file: ${LOG_FILE}"
echo ""
echo "🔍 Analyzing results..."
echo ""

# Analyze binary patterns
echo "=== Binary Messages ==="
BINARY_COUNT=$(rg -c "\[BINARY_HEX\]|\[PROTOCOL_ANALYSIS\]" "${LOG_FILE}" 2>/dev/null || echo "0")
echo "Binary messages found: ${BINARY_COUNT}"

echo ""
echo "=== Compression Signatures ==="
GZIP_COUNT=$(rg -c "1f 8b" "${LOG_FILE}" 2>/dev/null || echo "0")
ZLIB_COUNT=$(rg -c "78 9c|78 01|78 da" "${LOG_FILE}" 2>/dev/null || echo "0")
echo "GZIP signatures (0x1f 0x8b): ${GZIP_COUNT}"
echo "ZLIB signatures (0x78): ${ZLIB_COUNT}"

echo ""
echo "=== Protocol Analysis ==="
rg "\[PROTOCOL_ANALYSIS\]" "${LOG_FILE}" 2>/dev/null | head -10

echo ""
echo "=== Decompression Results ==="
DECOMPRESSED=$(rg -c "\[GZIP_DECOMPRESSED\]|\[ZLIB_DECOMPRESSED\]" "${LOG_FILE}" 2>/dev/null || echo "0")
echo "Successfully decompressed: ${DECOMPRESSED}"

echo ""
echo "=== XML Messages ==="
XML_COUNT=$(rg -c "📨.*Received tick" "${LOG_FILE}" 2>/dev/null || echo "0")
echo "XML messages parsed: ${XML_COUNT}"

echo ""
echo "=== Steam Detections ==="
STEAM_COUNT=$(rg -c "\[STEAM_DETECTED\]|STEAM PATTERN DETECTED" "${LOG_FILE}" 2>/dev/null || echo "0")
echo "Steam patterns detected: ${STEAM_COUNT}"

echo ""
echo "📋 Next steps:"
echo "  1. View full binary hex signatures: rg '\[BINARY_HEX\]' ${LOG_FILE}"
echo "  2. View protocol analysis: rg '\[PROTOCOL_ANALYSIS\]' ${LOG_FILE}"
echo "  3. View decompressed content: rg '\[PROTOCOL_DECODED\]' ${LOG_FILE}"
echo "  4. View steam detections: rg '\[STEAM_DETECTED\]' ${LOG_FILE}"

