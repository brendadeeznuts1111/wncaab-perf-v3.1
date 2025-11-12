# TES-NGWS-001.5: Staging Deployment Guide

**Date:** 2025-11-11  
**Status:** ✅ Ready for Deployment  
**Epic:** TES-NGWS-001.5 - Security-Hardened WebSocket Foundation

---

## Prerequisites

1. **Cloudflare Account & Wrangler CLI**
   ```bash
   npm install -g wrangler
   # or
   bunx wrangler --version
   
   wrangler login
   ```

2. **Required Secrets**
   - `VERSION_SIGNING_KEY` (required)
   - `VERSION_SIGNING_KEY_V2` (optional, for dual-key rotation)
   - `TES_PROXY_IPS` (optional, for proxy IP whitelist)

3. **KV Namespace** (if not already created)
   ```bash
   wrangler kv:namespace create "KV"
   wrangler kv:namespace create "KV" --preview
   ```
   Update `wrangler.toml` with the returned namespace IDs.

---

## Deployment Steps

### Step 1: Set Secrets

```bash
# Required: Primary signing key (v1)
wrangler secret put VERSION_SIGNING_KEY --env=staging
# Paste your 64-character hex key when prompted

# Optional: Secondary signing key (v2) for zero-downtime rotation
wrangler secret put VERSION_SIGNING_KEY_V2 --env=staging
# Paste your 64-character hex key when prompted

# Optional: Trusted proxy IPs (comma-separated)
wrangler secret put TES_PROXY_IPS --env=staging
# Example: 192.0.2.1,198.51.100.0/24
```

### Step 2: Verify Configuration

```bash
# Check secrets are set
wrangler secret list --env=staging

# Verify wrangler.toml configuration
cat wrangler.toml | grep -A 5 "\[env.staging"
```

### Step 3: Deploy to Staging

**Option A: Automated Script (Recommended)**
```bash
./scripts/deploy-staging-ngws-001.5.sh
```

**Option B: Manual Deployment**
```bash
# Build and deploy
wrangler deploy --env=staging

# Or with explicit name
wrangler deploy --env=staging --name=tes-ngws-001-flux-veto-staging
```

### Step 4: Verify Deployment

```bash
# Get deployment URL
DEPLOYMENT_URL=$(wrangler deployments list --env=staging | head -n 1 | awk '{print $NF}')

# Health check
curl "$DEPLOYMENT_URL/health"

# Expected response:
# {"status":"ok","timestamp":...,"version":"v9-upgrade","meta":"[META:worker-health][SEMANTIC:zero-npm-deploy]"}
```

---

## Security Validation Tests

After deployment, run the comprehensive security validation test suite:

```bash
# Run all security validations
bun run scripts/test-ngws-001.5-security.ts --env=staging --url=https://tes-ngws-001-flux-veto-staging.workers.dev

# With verbose output
bun run scripts/test-ngws-001.5-security.ts --env=staging --url=https://tes-ngws-001-flux-veto-staging.workers.dev --verbose
```

### Test Coverage

The security validation suite tests:

1. ✅ **Health Check** - Worker is responding
2. ✅ **CSRF Token Generation** - Token endpoint accessible
3. ✅ **Subprotocol Negotiation** - RFC 6455 protocol selection
4. ✅ **Host Header Validation** - Invalid Host headers rejected
5. ✅ **Sec-WebSocket-Key Format Validation** - Invalid key formats rejected
6. ✅ **Version Registry Endpoint** - DO routing working

---

## Manual Testing

### Test 1: WebSocket Connection with Subprotocol Negotiation

```bash
# Generate CSRF token (if endpoint exists)
CSRF_TOKEN=$(curl -s "$DEPLOYMENT_URL/api/auth/csrf-token" | jq -r .token)

# Connect WebSocket with subprotocol negotiation
# Note: Browser WebSocket API doesn't support custom headers directly
# Use query parameter for dev/staging testing
wscat -c "wss://tes-ngws-001-flux-veto-staging.workers.dev/version/ws?csrf=$CSRF_TOKEN" \
  --subprotocol "tes-ui-v2,tes-ui-v1"
```

### Test 2: Version Bump via WebSocket

```javascript
// In browser console or Node.js with ws library
const ws = new WebSocket('wss://tes-ngws-001-flux-veto-staging.workers.dev/version/ws?csrf=YOUR_TOKEN', 
  ['tes-ui-v2', 'tes-ui-v1']);

ws.onopen = () => {
  console.log('Connected, protocol:', ws.protocol);
  
  // Send bump message
  ws.send(JSON.stringify({
    type: 'bump',
    scope: 'patch',
    keyVersion: 'v1'
  }));
};

ws.onmessage = (event) => {
  console.log('Response:', JSON.parse(event.data));
};
```

### Test 3: Header Validation

```bash
# Test invalid Host header (should be rejected)
curl -X GET "$DEPLOYMENT_URL/version/ws" \
  -H "Host: evil.com" \
  -H "Upgrade: websocket" \
  -H "Connection: Upgrade" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  -H "Sec-WebSocket-Version: 13"

# Expected: 400 Bad Request (Host Header Mismatch)
```

### Test 4: CSRF Token Validation

```bash
# Test without CSRF token (should be rejected)
curl -X GET "$DEPLOYMENT_URL/version/ws" \
  -H "Upgrade: websocket" \
  -H "Connection: Upgrade" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  -H "Sec-WebSocket-Version: 13"

# Expected: 403 Forbidden (WS CSRF Invalid)
```

---

## Monitoring

### View Logs

```bash
# Tail worker logs
wrangler tail --env=staging

# Filter for TES-NGWS-001.5 events
wrangler tail --env=staging | grep "TES-NGWS-001.5\|ws:upgrade\|keyVersion"
```

### Key Metrics to Monitor

1. **WebSocket Upgrade Success Rate**
   - Look for `ws:upgrade:headers_validated` events
   - Monitor `ws:upgrade:csrf_invalid` rejections

2. **Subprotocol Negotiation**
   - Check `selectedProtocol` in logs
   - Verify `tes-ui-v2` vs `tes-ui-v1` distribution

3. **Key Version Usage**
   - Monitor `[META:KEY-VERSION]` in signature logs
   - Track V1 → V2 migration progress

4. **Header Validation**
   - Monitor `ws:upgrade:host_mismatch` events
   - Track `ws:upgrade:invalid_key` rejections

---

## Troubleshooting

### Issue: Deployment Fails

**Error:** `Error: No such namespace`
- **Solution:** Create KV namespace and update `wrangler.toml`

**Error:** `Error: Missing required secret`
- **Solution:** Set `VERSION_SIGNING_KEY` secret:
  ```bash
  wrangler secret put VERSION_SIGNING_KEY --env=staging
  ```

### Issue: WebSocket Connection Fails

**Error:** `403 WS CSRF Invalid`
- **Solution:** Ensure CSRF token is passed in query parameter or header
- **Check:** CSRF token endpoint is accessible

**Error:** `400 Host Header Mismatch`
- **Solution:** Verify `TES_PROXY_IPS` secret is set correctly
- **Check:** Client IP is in trusted proxy list

### Issue: Subprotocol Not Negotiated

**Error:** `400 Subprotocol Mismatch`
- **Solution:** Verify `TES_SUPPORTED_SUBPROTOCOLS` in `wrangler.toml`
- **Check:** Client requests supported protocols (`tes-ui-v1`, `tes-ui-v2`)

---

## Rollback Procedure

If deployment causes issues:

```bash
# List recent deployments
wrangler deployments list --env=staging

# Rollback to previous version
wrangler rollback --env=staging --message="Rollback TES-NGWS-001.5"

# Or deploy previous version explicitly
wrangler deploy --env=staging --version=<previous-version-id>
```

---

## Next Steps

After successful staging deployment and validation:

1. ✅ **Monitor for 24-48 hours** - Watch for errors, performance issues
2. ✅ **Run load tests** - Test WebSocket connection limits
3. ✅ **Validate dual-key rotation** - Test V1 → V2 key migration
4. ✅ **Document production deployment** - Prepare production deployment guide
5. ✅ **Schedule production deployment** - After staging validation complete

---

## References

- **TES-NGWS-001.5 Epic:** `docs/TES-NGWS-001.5-COMPLETE.md`
- **Key Rotation Guide:** `docs/TES-NGWS-001.5-KEY-ROTATION.md`
- **Subprotocol Handshake:** `docs/TES-NGWS-001.5-SUBPROTO-HANDSHAKE.md`
- **Execution Log:** `docs/TES-NGWS-001.5-EXECUTION-LOG.md`
- **Key Rotation Lattice:** `docs/KEY-ROTATION-LATTICE.md`

---

**Status:** ✅ **READY FOR STAGING DEPLOYMENT**

Deploy with confidence - all security validations implemented, tested, and documented.

