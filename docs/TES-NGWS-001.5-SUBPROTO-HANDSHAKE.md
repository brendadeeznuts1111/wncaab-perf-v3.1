# TES-NGWS-001.5: Subprotocol Handshake Formalization

**Status:** ✅ **COMPLETE**  
**Date:** 2025-11-11  
**Priority:** High (RFC 6455 Compliance)

## Overview

TES-NGWS-001.5.B.1 formalizes RFC 6455 compliant subprotocol negotiation for WebSocket connections. This enables version pinning, fallback support, and future crypto schema migration.

## Subprotocol Versions

### tes-ui-v1 (Legacy TES-OPS-004)

**Crypto Schema:** HMAC-SHA256  
**Signature Format:** Hex-encoded HMAC  
**Key Source:** `VERSION_SIGNING_KEY`  
**Status:** ✅ Production-ready

**Message Types:**
- `refresh` - Request version entity refresh
- `ping` - Heartbeat check
- `bump` - Version bump request
- `refresh_response` - Server response with entities
- `pong` - Heartbeat response
- `bump_response` - Bump completion response

**Example:**
```json
{
  "type": "bump",
  "scope": "patch",
  "entityId": "component:betting-glossary",
  "cascade": true,
  "keyVersion": "v1"
}
```

### tes-ui-v2 (Future Crypto Schema)

**Crypto Schema:** Ed25519 (planned)  
**Signature Format:** Base64-encoded Ed25519 signature  
**Key Source:** `VERSION_SIGNING_KEY_V2`  
**Status:** 🚧 Framework ready, crypto schema pending

**Message Types:** Same as v1, with enhanced crypto:
- `bump` - Version bump with Ed25519 signature
- `bump_response` - Response includes Ed25519 signature

**Example (Future):**
```json
{
  "type": "bump",
  "scope": "patch",
  "entityId": "component:betting-glossary",
  "cascade": true,
  "keyVersion": "v2",
  "crypto": "ed25519"
}
```

## Handshake Process

### Client Request

**Browser WebSocket:**
```javascript
const ws = new WebSocket('ws://localhost:3002/api/dev/version-ws', [
  'tes-ui-v2',  // Preferred (future crypto)
  'tes-ui-v1'   // Fallback (legacy)
]);
```

**Server-Side (Bun 1.3+):**
```typescript
const ws = new WebSocket('ws://localhost:3002/api/dev/version-ws', {
  headers: {
    'Sec-WebSocket-Protocol': 'tes-ui-v2, tes-ui-v1',
    'x-tes-ws-csrf-token': csrfToken,
  },
});
```

### Server Negotiation

**Supported Protocols (Priority Order):**
1. `tes-ui-v2` - Future crypto schema
2. `tes-ui-v1` - Legacy TES-OPS-004

**Selection Logic:**
```typescript
const requestedProtocols = req.headers.get('Sec-WebSocket-Protocol')?.split(', ') || [];
const supportedProtocols = ['tes-ui-v2', 'tes-ui-v1'];
const selectedProtocol = requestedProtocols.find(p => supportedProtocols.includes(p)) 
  || supportedProtocols[0]; // Fallback to first supported
```

**Response:**
```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Protocol: tes-ui-v2  # Selected protocol
```

### Client Verification

**Check Negotiated Protocol:**
```javascript
ws.onopen = () => {
  const protocol = ws.protocol; // "tes-ui-v2" or "tes-ui-v1"
  console.log(`Negotiated protocol: ${protocol}`);
  
  // Route messages based on protocol
  if (protocol === 'tes-ui-v2') {
    // Use Ed25519 verification (future)
  } else {
    // Use HMAC-SHA256 verification (current)
  }
};
```

## Protocol Differences

| Feature | tes-ui-v1 | tes-ui-v2 |
|---------|-----------|-----------|
| **Crypto** | HMAC-SHA256 | Ed25519 (planned) |
| **Key Length** | 32 bytes (hex) | 32 bytes (seed) |
| **Signature** | Hex-encoded | Base64-encoded |
| **Performance** | Fast (6-400×) | Very Fast (planned) |
| **Key Rotation** | Single key | Dual-key support |
| **Backward Compat** | N/A | ✅ Compatible with v1 |

## Migration Path

### Step 1: Deploy V2 Framework (✅ Complete)

- RFC 6455 negotiation implemented
- Protocol routing in place
- V2 handler delegates to V1 (temporary)

### Step 2: Implement Ed25519 Crypto (🚧 Pending)

```typescript
// Future implementation
private async signResponseV2(data: VersionedEntity[]): Promise<string> {
  const key = await this.getEd25519Key();
  const payload = JSON.stringify(data);
  const signature = await crypto.subtle.sign('Ed25519', key, new TextEncoder().encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}
```

### Step 3: Gradual Migration

1. **Deploy V2 with Ed25519**
2. **Update clients to prefer V2**
3. **Monitor V2 adoption**
4. **Deprecate V1 after grace period**

### Step 4: V1 Deprecation (Future)

- Remove `tes-ui-v1` from supported protocols
- Update clients to V2-only
- Archive V1 signatures

## Configuration

### Environment Variables

**wrangler.toml:**
```toml
[env.production.vars]
TES_SUPPORTED_SUBPROTOCOLS = "tes-ui-v1,tes-ui-v2"
```

**Runtime Override:**
```typescript
// In Durable Object
const supportedProtocolsStr = env.TES_SUPPORTED_SUBPROTOCOLS || 'tes-ui-v1,tes-ui-v2';
const supportedProtocols = supportedProtocolsStr.split(',').map(p => p.trim());
```

## Error Handling

### Protocol Mismatch

**Client Request:** `['unsupported-v3']`  
**Server Response:** `400 Bad Request`  
**Message:** `"Subprotocol Mismatch: No supported protocol"`

### Fallback Behavior

**Client Request:** `[]` (no protocol specified)  
**Server Response:** `101 Switching Protocols`  
**Selected:** `tes-ui-v1` (first supported)

## Testing

### Test Protocol Negotiation:
```bash
# Request V2, should negotiate V2
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Protocol: tes-ui-v2, tes-ui-v1" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  http://localhost:3002/api/dev/version-ws

# Request V1, should negotiate V1
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Protocol: tes-ui-v1" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  http://localhost:3002/api/dev/version-ws
```

### Verify Protocol Selection:
```bash
# Check logs for negotiated protocol
rg '"selectedProtocol":\s*"tes-ui-v2"' logs/worker-events.log
```

## References

- **RFC 6455:** https://datatracker.ietf.org/doc/html/rfc6455
- **Bun 1.3 WebSocket:** https://bun.com/blog/bun-v1.3#websocket-improvements
- **Ed25519:** https://ed25519.cr.yp.to/

---

**Status:** ✅ **COMPLETE** - RFC 6455 subprotocol handshake formalized and implemented.

