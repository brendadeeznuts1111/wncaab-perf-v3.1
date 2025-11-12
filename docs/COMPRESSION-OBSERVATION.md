# Compression Observation - TES-NGWS-001.12

## Observation

During live connection testing, the WebSocket connection reported:

```json
{
  "extensions": "none",
  "compressionEnabled": false
}
```

## Analysis

### Expected Behavior

NowGoal's WebSocket server **should** negotiate `permessage-deflate` compression (RFC 7692) to reduce bandwidth usage. The browser implementation uses `pako` library for decompression, suggesting compression is expected.

### Actual Behavior

The Bun WebSocket connection shows:
- **Extensions**: `"none"`
- **Compression**: `false`

This indicates the server **did not negotiate compression** during the WebSocket handshake.

## Implications

### Positive
- ✅ **Easier debugging**: Plaintext XML messages are human-readable
- ✅ **Lower CPU overhead**: No decompression needed
- ✅ **Simpler implementation**: No compression handling required

### Negative
- ⚠️ **Higher bandwidth**: ~3-5x more data transmitted
- ⚠️ **Increased latency**: Larger message sizes
- ⚠️ **Higher costs**: More data transfer if on metered connection

## Possible Causes

1. **Server Configuration**: NowGoal's server may disable compression for certain clients
2. **Bun WebSocket**: Bun's WebSocket implementation may not properly advertise compression support
3. **User-Agent Detection**: Server may check User-Agent and disable compression for non-browser clients
4. **Connection Parameters**: Missing headers or parameters that trigger compression negotiation

## Verification Steps

### 1. Check Browser Behavior

In browser console on `https://live.nowgoal26.com`:

```javascript
const ws = new WebSocket('wss://www.nowgoal26.com:9800/stream?channels=nba_change_xml,ch_nbaGoal8_xml&&token=...');
ws.onopen = () => {
  console.log('Extensions:', ws.extensions);
  console.log('Protocol:', ws.protocol);
};
```

### 2. Test with Explicit Headers

Try adding compression-related headers:

```typescript
const ws = new WebSocket(url, {
  headers: {
    'Origin': 'https://live.nowgoal26.com',
    'User-Agent': 'Mozilla/5.0 (compatible; Bun/1.3.0)',
    'Sec-WebSocket-Extensions': 'permessage-deflate; client_max_window_bits',
  }
});
```

### 3. Monitor Message Sizes

Compare message sizes:

```bash
# Binary message sizes (if compression enabled)
rg "BINARY_MESSAGE" logs/headers-index.log | rg -o "length:(\d+)" -r '$1'

# XML message sizes (if no compression)
rg "XML_RECEIVED" logs/headers-index.log | rg -o "length:(\d+)" -r '$1'
```

## Current Implementation

The current implementation handles both scenarios:

1. **Compressed messages**: Handled via `handleBinaryMessage()` with decompression
2. **Plaintext messages**: Handled via `onmessage` string handler

Both paths are fully functional, so the lack of compression doesn't break functionality.

## Recommendations

### Short Term
- ✅ **Accept current behavior**: System works fine without compression
- ✅ **Monitor bandwidth**: Track data usage if on metered connection
- ✅ **Document observation**: Note in production docs

### Long Term
- 🔄 **Investigate compression**: Test with browser User-Agent to see if server enables it
- 🔄 **Optimize if needed**: If bandwidth becomes an issue, investigate compression negotiation
- 🔄 **Fallback handling**: Current implementation already handles both compressed and uncompressed

## Production Impact

**Status**: ✅ **No action required**

The system functions correctly without compression. The higher bandwidth usage is acceptable for the current use case, and the simpler implementation reduces complexity.

## Related Documentation

- [WebSocket Implementation](./TES-NGWS-001.md)
- [Binary Protocol Decoding](./BINARY-PROTOCOL-DECODING.md)
- [Performance Benchmarks](./BUN-CONSOLE-FEATURES.md)

