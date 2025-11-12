#!/bin/bash
# Comprehensive Binary Pattern Analysis
# Analyzes binary-samples.log for protocol signatures

LOG_FILE="${1:-binary-samples.log}"

if [ ! -f "$LOG_FILE" ]; then
  echo "❌ Log file not found: $LOG_FILE"
  exit 1
fi

echo "🔍 Binary Protocol Analysis"
echo "📁 Log file: $LOG_FILE"
echo "📊 File size: $(wc -l < "$LOG_FILE") lines"
echo ""

# Overall statistics
echo "=== Message Statistics ==="
TEXT_MSG=$(rg -c '\[TEXT_MESSAGE\]' "$LOG_FILE" 2>/dev/null || echo "0")
JSON_MSG=$(rg -c '\[JSON_MESSAGE\]' "$LOG_FILE" 2>/dev/null || echo "0")
BINARY_HEX=$(rg -c '\[BINARY_HEX\]' "$LOG_FILE" 2>/dev/null || echo "0")
PROTOCOL_ANALYSIS=$(rg -c '\[PROTOCOL_ANALYSIS\]' "$LOG_FILE" 2>/dev/null || echo "0")
XML_TICKS=$(rg -c '📨.*Received tick' "$LOG_FILE" 2>/dev/null || echo "0")
GZIP_DECOMP=$(rg -c '\[GZIP_DECOMPRESSED\]' "$LOG_FILE" 2>/dev/null || echo "0")
ZLIB_DECOMP=$(rg -c '\[ZLIB_DECOMPRESSED\]' "$LOG_FILE" 2>/dev/null || echo "0")

echo "Text messages:     $TEXT_MSG"
echo "JSON messages:     $JSON_MSG"
echo "Binary hex logs:   $BINARY_HEX"
echo "Protocol analysis: $PROTOCOL_ANALYSIS"
echo "XML ticks parsed:  $XML_TICKS"
echo "GZIP decompressed: $GZIP_DECOMP"
echo "ZLIB decompressed: $ZLIB_DECOMP"
echo ""

# Binary signature detection
echo "=== Compression Signatures ==="
GZIP_COUNT=$(rg -c '1f 8b' "$LOG_FILE" 2>/dev/null || echo "0")
ZLIB_78_9C=$(rg -c '78 9c' "$LOG_FILE" 2>/dev/null || echo "0")
ZLIB_78_01=$(rg -c '78 01' "$LOG_FILE" 2>/dev/null || echo "0")
ZLIB_78_DA=$(rg -c '78 da' "$LOG_FILE" 2>/dev/null || echo "0")
PROTOBUF_0A=$(rg -c '\b0a\b' "$LOG_FILE" 2>/dev/null || echo "0")

echo "GZIP (0x1f 0x8b):     $GZIP_COUNT"
echo "ZLIB (0x78 0x9c):     $ZLIB_78_9C"
echo "ZLIB (0x78 0x01):     $ZLIB_78_01"
echo "ZLIB (0x78 0xda):     $ZLIB_78_DA"
echo "Protobuf varint (0a): $PROTOBUF_0A"
echo ""

# Show actual binary hex signatures
if [ "$BINARY_HEX" != "0" ]; then
  echo "=== Binary Hex Signatures (first 10) ==="
  rg '\[BINARY_HEX\]' "$LOG_FILE" 2>/dev/null | head -10
  echo ""
fi

# Show protocol analysis results
if [ "$PROTOCOL_ANALYSIS" != "0" ]; then
  echo "=== Protocol Analysis Results (first 10) ==="
  rg '\[PROTOCOL_ANALYSIS\]' "$LOG_FILE" 2>/dev/null | head -10
  echo ""
fi

# Show decompressed content preview
if [ "$GZIP_DECOMP" != "0" ] || [ "$ZLIB_DECOMP" != "0" ]; then
  echo "=== Decompression Results ==="
  rg '\[GZIP_DECOMPRESSED\]|\[ZLIB_DECOMPRESSED\]' "$LOG_FILE" 2>/dev/null | head -5
  echo ""
  
  echo "=== Decoded Content Preview ==="
  rg '\[PROTOCOL_DECODED\]' "$LOG_FILE" 2>/dev/null | head -5
  echo ""
fi

# Show XML messages
if [ "$XML_TICKS" != "0" ]; then
  echo "=== XML Messages Received ==="
  rg '📨.*Received tick' "$LOG_FILE" 2>/dev/null | head -5
  echo ""
fi

# Show any errors
ERROR_COUNT=$(rg -c 'ERROR|FAIL|error|fail' "$LOG_FILE" 2>/dev/null || echo "0")
if [ "$ERROR_COUNT" != "0" ]; then
  echo "=== Errors/Warnings ==="
  rg -i 'ERROR|FAIL|error|fail|⚠️|❌' "$LOG_FILE" 2>/dev/null | head -10
  echo ""
fi

# Recommendations
echo "=== Recommendations ==="
if [ "$BINARY_HEX" = "0" ] && [ "$PROTOCOL_ANALYSIS" = "0" ]; then
  echo "⚠️  No binary messages detected yet."
  echo "   - Connection may be idle (no active games)"
  echo "   - Try running during active NBA/WNCAAAB games"
  echo "   - Check if WebSocket is receiving any data"
elif [ "$GZIP_COUNT" != "0" ] || [ "$ZLIB_78_9C" != "0" ]; then
  echo "✅ Compression signatures detected!"
  echo "   - Protocol analyzer should automatically decompress"
  echo "   - Check [PROTOCOL_DECODED] logs for XML content"
elif [ "$PROTOCOL_ANALYSIS" != "0" ]; then
  echo "✅ Protocol analysis active!"
  echo "   - Review [PROTOCOL_ANALYSIS] logs for format detection"
else
  echo "📊 Binary messages detected but format unknown"
  echo "   - Review [BINARY_HEX] logs for pattern analysis"
  echo "   - May need custom decompression algorithm"
fi

