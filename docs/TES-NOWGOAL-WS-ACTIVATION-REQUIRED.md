# TES-NOWGOAL-WS: Production Activation Required

**Date:** 2025-11-12  
**Status:** ⚠️ **CSRF_SECRET NOT CONFIGURED**  
**Worker:** `nowgoal-ws-prod`

## Current Status

### ✅ Worker Deployed
- **Worker:** `nowgoal-ws-prod`
- **URL:** `https://nowgoal-ws-prod.utahj4754.workers.dev`
- **WebSocket:** `wss://nowgoal-ws-prod.utahj4754.workers.dev`
- **Version ID:** `518f8da2-1048-490c-9d46-8feb842ef2e9`

### ⚠️ Missing Configuration
- **CSRF_SECRET:** Not set (required for WebSocket connections)

## Activation Steps

### Step 1: Set CSRF_SECRET Secret

```bash
cd workers/nowgoal-ws

# Generate 256-bit CSPRNG secret
CSRF_SECRET=$(bun -e "console.log(crypto.randomBytes(32).toString('hex'))")

# Set in Cloudflare Workers (OS-encrypted)
echo "$CSRF_SECRET" | wrangler secret put CSRF_SECRET --env=production
```

**Expected Output:**
```
✨ Success! Secret "CSRF_SECRET" created for environment "production"
```

### Step 2: Verify Secret is Set

```bash
wrangler secret list --env=production | grep CSRF_SECRET
```

**Expected Output:**
```
CSRF_SECRET | Wed, 12 Nov 2025 22:10:00 GMT
```

### Step 3: Test WebSocket Connection

```bash
# Get CSRF token
CSRF_TOKEN=$(curl -s https://nowgoal-ws-prod.utahj4754.workers.dev/api/auth/csrf-token | jq -r .token)

# Test WebSocket connection
bun run test-websocket.ts
```

**Expected Output:**
```
✅ WebSocket connected
✅ Subprotocol negotiated: tes-ui-v1
✅ Manifest signature badge: GREEN
```

## WebSocket Connection Details

### Endpoint
- **URL:** `wss://nowgoal-ws-prod.utahj4754.workers.dev?csrf=<token>`
- **Subprotocols:** `tes-ui-v1,tes-ui-v2`
- **CSRF Token:** Required (via query parameter `csrf`)

### Subprotocol Negotiation
1. **Client requests:** `["tes-ui-v1", "tes-ui-v2"]`
2. **Server selects:** `tes-ui-v1` (first matching)
3. **Response:** `Sec-WebSocket-Protocol: tes-ui-v1`

### Initial Message
```json
{
  "type": "connected",
  "protocol": "tes-ui-v1",
  "timestamp": 1762922000000
}
```

## Troubleshooting

### WebSocket Connection Fails
- **Check:** CSRF_SECRET is set
- **Check:** CSRF token is valid (not expired)
- **Check:** Token is passed via query parameter `?csrf=<token>`

### CSRF Token Generation Fails
- **Check:** CSRF_SECRET is configured
- **Check:** Worker logs: `wrangler tail --env=production`

## Status: AWAITING ACTIVATION

**Next Action:** Set CSRF_SECRET secret to activate WebSocket connections.

