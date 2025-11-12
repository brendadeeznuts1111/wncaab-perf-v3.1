# NowGoal WebSocket Protocol - Complete Reference

Based on reverse-engineering NowGoal's JavaScript implementation from:
https://live.nowgoal26.com/scripts/common

## Protocol Details

### WebSocket URL Format
```
wss://${_wsUrl}/stream?channels={0}&&token={1}
```
- Channels: Comma-separated, URL-encoded (e.g., `nba_change_xml,ch_nbaGoal8_xml`)
- Token: JWT token from `/ajax/getwebsockettoken`

### Message Format

**Binary Messages (Primary)**:
- Format: ArrayBuffer (deflate-compressed)
- Decompression: Raw deflate (no zlib header) using `pako.inflate()`
- Decompressed: JSON string
- Processing: `JSON.parse(pako.inflate(data, {to:"string"}))`

**String Messages**:
- `"ok"` - Keepalive/heartbeat (should be ignored)
- XML strings (rare, for compatibility)
- JSON strings (uncompressed)

### NowGoal's JavaScript Implementation

```javascript
// Message handler from their code:
this.socket.onmessage = function(t) {
  var r = t.data;
  if (r != "ok") {  // Skip keepalive
    let i = new FileReader;
    i.readAsArrayBuffer(r, "utf-8");
    i.onload = function() {
      var t = JSON.parse(pako.inflate(i.result, {to:"string"}));
      t != undefined && n.wsHandler(t);
    }
  }
}
```

### Key Insights

1. **Compression**: Raw deflate (not zlib with header)
   - `pako.inflate()` handles raw deflate
   - Bun's `inflateSync()` also handles raw deflate

2. **Format**: JSON objects (not XML)
   - After decompression, parse as JSON
   - Structure varies by message type

3. **Keepalive**: `"ok"` string messages
   - Should be silently ignored
   - Sent periodically to maintain connection

4. **Reconnection**: Every 30 seconds if disconnected
   - Their code: `setInterval(() => {n.connectWs()}, 3e4)`

5. **Channel Changing**: Send JSON message
   ```json
   {"type": 0, "channels": ["channel1", "channel2"]}
   ```

## Our Implementation

### Protocol Analyzer
- Tries raw deflate first (matches `pako.inflate`)
- Detects JSON format automatically
- Falls back to zlib/gzip if needed

### Message Handler
- Skips `"ok"` keepalive messages
- Handles binary ArrayBuffer messages
- Decompresses with `Bun.inflateSync()` (raw deflate)
- Parses JSON and passes to callbacks
- Maintains XML parsing for compatibility

### Expected Log Output

```
[JSON_DECOMPRESSED] type:deflate-json | keys:gameId,odds,market,...
```

## Testing

When you receive binary messages, you should see:
1. `[PROTOCOL_ANALYSIS]` - Protocol detection
2. `[JSON_DECOMPRESSED]` - Successfully decompressed JSON
3. JSON objects passed to `onMessage` callback

## References

- NowGoal WebSocket Implementation: https://live.nowgoal26.com/scripts/common
- Pako.js (deflate library): https://github.com/nodeca/pako
- Bun Compression API: https://bun.sh/docs/api/compression

