# TES-NOWGOAL-WS: NowGoal WebSocket Worker Deployment

**Date:** 2025-11-12  
**Status:** ✅ **DEPLOYED TO PRODUCTION**  
**Worker:** `nowgoal-ws-prod`

## Deployment Summary

### ✅ Worker Deployed Successfully

- **Worker Name:** `nowgoal-ws-prod`
- **URL:** `https://nowgoal-ws-prod.utahj4754.workers.dev`
- **WebSocket URL:** `wss://nowgoal-ws-prod.utahj4754.workers.dev`
- **Version ID:** `e16792aa-cd9b-4c74-a80b-198fdd56e286`
- **Bundle Size:** 3.77 KB (8.20 KB gzipped)
- **Startup Time:** 15 ms

### Configuration

**Environment Variables:**
- ✅ `TES_SUPPORTED_SUBPROTOCOLS`: "tes-ui-v1,tes-ui-v2"
- ✅ `NOWGOAL_WS_URL`: "wss://www.nowgoal26.com:9800/stream"

**Secrets Required:**
- ⚠️ `CSRF_SECRET` - **NEEDS TO BE SET**

## Next Steps

### Step 1: Set CSRF_SECRET Secret

```bash
cd workers/nowgoal-ws

# Generate secret
CSRF_SECRET=$(bun -e "console.log(crypto.randomBytes(32).toString('hex'))")

# Set in Cloudflare
echo "$CSRF_SECRET" | wrangler secret put CSRF_SECRET --env=production
```

### Step 2: Test WebSocket Connection

```bash
# Get CSRF token
CSRF_TOKEN=$(curl -s https://nowgoal-ws-prod.utahj4754.workers.dev/api/auth/csrf-token | jq -r .token)

# Test WebSocket connection
wscat -c wss://nowgoal-ws-prod.utahj4754.workers.dev \
  -H "x-tes-ws-csrf-token:$CSRF_TOKEN" \
  --subprotocol tes-ui-v1,tes-ui-v2
```

**Expected Result:**
- ✅ Connected
- ✅ Subprotocol: `tes-ui-v1` (selected from client list)
- ✅ Initial message: `{"type":"connected","protocol":"tes-ui-v1","timestamp":...}`

### Step 3: Verify Subprotocol Negotiation

The server should select `tes-ui-v1` from the client's requested list `["tes-ui-v1", "tes-ui-v2"]` based on priority order.

**Test Script:**
```bash
#!/usr/bin/env bun

const BASE_URL = "https://nowgoal-ws-prod.utahj4754.workers.dev";

// Get CSRF token
const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf-token`);
const { token: csrfToken } = await csrfResponse.json();

// Connect with subprotocol negotiation
const ws = new WebSocket(`wss://nowgoal-ws-prod.utahj4754.workers.dev`, ['tes-ui-v1', 'tes-ui-v2'], {
  headers: {
    'x-tes-ws-csrf-token': csrfToken,
  },
});

ws.onopen = () => {
  console.log('✅ Connected');
  console.log('Protocol:', ws.protocol); // Should be "tes-ui-v1"
  ws.close();
};

ws.onerror = (error) => {
  console.error('❌ Error:', error);
  process.exit(1);
};
```

## Endpoints

### Health Check
```bash
curl https://nowgoal-ws-prod.utahj4754.workers.dev/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "service": "nowgoal-ws",
  "timestamp": 1762920000000
}
```

### CSRF Token Generation
```bash
curl https://nowgoal-ws-prod.utahj4754.workers.dev/api/auth/csrf-token
```

**Expected Response:**
```json
{
  "token": "base64-encoded-token"
}
```

### WebSocket Connection
- **URL:** `wss://nowgoal-ws-prod.utahj4754.workers.dev`
- **Required Header:** `x-tes-ws-csrf-token: <token>`
- **Subprotocols:** `tes-ui-v1,tes-ui-v2` (client request)
- **Selected:** `tes-ui-v1` (server selects first matching)

## Custom Domain Setup (Optional)

To use `wss://nowgoal.tes-framework.com`:

1. Add route to `wrangler.toml`:
```toml
[[routes]]
pattern = "nowgoal.tes-framework.com/*"
zone_name = "tes-framework.com"
```

2. Configure DNS:
   - Add CNAME record: `nowgoal.tes-framework.com` → `nowgoal-ws-prod.utahj4754.workers.dev`

## Status: DEPLOYED ✅

**Worker:** ✅ Deployed  
**CSRF Secret:** ⚠️ Needs to be set  
**WebSocket Test:** ⏭️ Ready to test  
**Subprotocol:** ✅ Negotiation implemented

