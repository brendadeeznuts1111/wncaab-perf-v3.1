# TES-NGWS-001.11: Binary Protocol Decoding - Quick Reference

## ✅ Implementation Status

All components are **fully implemented** and ready for binary sample collection:

- ✅ Enhanced WebSocket message handler with binary detection
- ✅ Protocol analyzer (`NowGoalProtocolAnalyzer`) with gzip/zlib support
- ✅ Decompression handlers (`handleGzipCompressed`, `handleZlibCompressed`)
- ✅ Raw bytes logging (`logRawBytes`) for unknown formats
- ✅ Steam detection integration with RG logging
- ✅ Test script configured for sample collection

## 🚀 Quick Start: Collect Binary Samples

### Step 1: Run Sample Collection

```bash
# Start collection (runs in background)
bun run test-nowgoal-connection.ts > binary-samples.log 2>&1 &

# Let it run for 3-5 minutes
sleep 180

# Stop collection
kill $!
```

### Step 2: Analyze Binary Patterns

```bash
# View all binary messages
rg "\[BINARY_HEX\]" binary-samples.log

# Check for gzip compression (0x1f 0x8b)
rg "1f 8b" binary-samples.log

# Check for zlib compression (0x78 0x9c)
rg "78 9c" binary-samples.log

# View protocol analysis results
rg "\[PROTOCOL_ANALYSIS\]" binary-samples.log

# View successfully decompressed messages
rg "\[GZIP_DECOMPRESSED\]|\[ZLIB_DECOMPRESSED\]" binary-samples.log

# View decoded XML content
rg "\[PROTOCOL_DECODED\]" binary-samples.log | head -20
```

### Step 3: Monitor Steam Detections

```bash
# Watch for steam patterns in real-time
tail -f logs/headers-index.log | rg "STEAM_PATTERN"

# Or watch console output
tail -f binary-samples.log | rg "\[STEAM_DETECTED\]"
```

## 📊 Expected Output Format

### Binary Messages (70% of traffic)
```
[PROTOCOL_ANALYSIS] type:gzip | confidence:high | hex:1f 8b 08 00 ...
[GZIP_DECOMPRESSED] Original:256 → Decompressed:1024 bytes
[PROTOCOL_DECODED] <?xml version="1.0"?><tick>...
```

### Unknown Binary Format
```
[BINARY_HEX] a1 b2 c3 d4 e5 f6 ... | length:128 | rg:{BINARY_MESSAGE}~[...]
```

### XML Messages (5% of traffic)
```
📨 [1] Received tick:
  Game ID: 12345
  League: NBA
  Teams: Lakers vs Warriors
  ...
```

### Steam Detections
```
🚨 STEAM PATTERN DETECTED!
[STEAM_DETECTED] [HEADERS_BLOCK_START:v1]{gameId:12345|velocity:0.0523}~[...]
```

## 🔍 Protocol Analysis Workflow

1. **Collect samples** → Run test script for 3-5 minutes
2. **Identify patterns** → Check hex signatures for known compression
3. **Verify decompression** → Look for successful `[GZIP_DECOMPRESSED]` or `[ZLIB_DECOMPRESSED]` logs
4. **Check XML parsing** → Verify `[PROTOCOL_DECODED]` shows valid XML
5. **Monitor steam** → Watch for `[STEAM_DETECTED]` patterns

## 🎯 Success Criteria

- ✅ Binary messages are being logged with hex signatures
- ✅ Compression format is identified (gzip/zlib/unknown)
- ✅ Decompressed messages parse as valid XML
- ✅ XML messages feed into steam detection pipeline
- ✅ Steam detections are logged with RG metadata

## 📝 Notes

- **Message distribution**: Expect ~70% binary, ~5% XML, ~25% heartbeat
- **Compression**: Most likely gzip (0x1f8b) or zlib (0x789c)
- **Protocol**: If protobuf, will need `.proto` schema file
- **Timing**: Binary samples collected during active games will show more patterns

## 🐛 Troubleshooting

### No binary messages received?
- Check WebSocket connection status
- Verify JWT token is valid
- Check if games are currently active

### Decompression fails?
- Check hex signature matches expected format
- Verify Bun version supports `gunzipSync`/`inflateSync`
- Try manual decompression with different algorithms

### XML parsing errors?
- Check decompressed content starts with `<`
- Verify XML structure matches expected format
- Review `onParseError` callback logs

---

**Status**: ✅ Ready for binary sample collection
**Next Step**: Run sample collection and analyze hex signatures

