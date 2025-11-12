# TES-NGWS-001.5: Key Rotation Lattice

**Status:** ✅ **READY**  
**Date:** 2025-11-11  
**Priority:** High (Zero-Downtime Rotation)

## Overview

TES-NGWS-001.5.B.4 implements dual-key support for zero-downtime key rotation. This allows rotating `VERSION_SIGNING_KEY` without service interruption by maintaining both V1 and V2 keys simultaneously.

## Architecture

### Dual-Key Lattice

- **V1 Key (`VERSION_SIGNING_KEY`):** Primary signing key (legacy TES-OPS-004)
- **V2 Key (`VERSION_SIGNING_KEY_V2`):** Secondary signing key (rotation target)
- **Key Version Tracking:** Each signature includes `keyVersion` field (`v1` or `v2`)

### Key Storage

**Environment Variables (Cloudflare Workers):**
```bash
# Primary key (required)
wrangler secret put VERSION_SIGNING_KEY --env=production

# Secondary key (optional, for rotation)
wrangler secret put VERSION_SIGNING_KEY_V2 --env=production
```

**Durable Object Storage:**
- V1 key: `env.VERSION_SIGNING_KEY` → `getSigningKey('v1')`
- V2 key: `env.VERSION_SIGNING_KEY_V2` → `getSigningKey('v2')`
- Fallback: If V2 not available, falls back to V1

## Rotation Process

### Phase 1: Deploy V2 Key (Zero Downtime)

1. **Generate V2 Key:**
```bash
# Generate new 32-byte hex key
openssl rand -hex 32
```

2. **Deploy V2 Key as Secret:**
```bash
# Set V2 key (doesn't affect existing V1 operations)
wrangler secret put VERSION_SIGNING_KEY_V2 --env=production
```

3. **Verify Deployment:**
```bash
# Check that both keys are available
wrangler secret list --env=production | grep VERSION_SIGNING_KEY
```

**Result:** V1 continues signing, V2 is available but unused.

### Phase 2: Migrate to V2 (Gradual)

1. **Update Client Code:**
```typescript
// Request V2 signatures explicitly
const response = await fetch('/api/dev/bump-version', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken,
    'X-Key-Version': 'v2', // Request V2 signatures
  },
  body: JSON.stringify({ scope: 'patch' }),
});
```

2. **Monitor V2 Usage:**
```bash
# Check logs for V2 signatures
rg '"keyVersion":\s*"v2"' logs/worker-events.log
```

**Result:** New signatures use V2, existing V1 signatures remain valid.

### Phase 3: Complete Migration (Optional)

1. **Update Default Key Version:**
```typescript
// In version-management-do.ts
private async signResponse(data: VersionedEntity[], keyVersion: 'v1' | 'v2' = 'v2'): Promise<string> {
  // Default changed from 'v1' to 'v2'
}
```

2. **Remove V1 Key (After Grace Period):**
```bash
# Only after all V1 signatures are expired/verified
wrangler secret delete VERSION_SIGNING_KEY --env=production
```

**Result:** System fully migrated to V2.

### Phase 4: Rollback (If Needed)

If issues occur during migration:

1. **Revert Default:**
```typescript
// Change default back to 'v1'
private async signResponse(data: VersionedEntity[], keyVersion: 'v1' | 'v2' = 'v1'): Promise<string> {
```

2. **Remove V2 Key:**
```bash
wrangler secret delete VERSION_SIGNING_KEY_V2 --env=production
```

**Result:** System returns to V1-only operation.

## Implementation Details

### Signing with Key Version

**Durable Object:**
```typescript
// Sign with specific key version
const signature = await this.signResponse(result.bumped, 'v2');

// Response includes keyVersion
const response = {
  ...result,
  signature,
  keyVersion: 'v2', // Client can verify with correct key
};
```

**Client Verification:**
```typescript
// Verify signature with correct key version
async function verifySignature(data: any, signature: string, keyVersion: 'v1' | 'v2'): Promise<boolean> {
  const key = keyVersion === 'v2' ? VERSION_SIGNING_KEY_V2 : VERSION_SIGNING_KEY;
  // ... verification logic
}
```

### Key Caching

- **V1 Cache:** `signingKeyCache` (single instance)
- **V2 Cache:** `signingKeyV2Cache` (separate instance)
- **Cache Invalidation:** On DO restart or key rotation

## Security Considerations

1. **Key Isolation:** V1 and V2 keys are cryptographically independent
2. **No Key Leakage:** Keys never logged or exposed in responses
3. **Graceful Fallback:** If V2 unavailable, automatically falls back to V1
4. **One-Time CSRF:** Key rotation doesn't affect CSRF token validation

## Testing

### Test Dual-Key Signing:
```bash
# Sign with V1
curl -X POST http://localhost:3002/api/dev/bump-version \
  -H "X-CSRF-Token: <token>" \
  -H "X-Key-Version: v1" \
  -d '{"scope": "patch"}'

# Sign with V2
curl -X POST http://localhost:3002/api/dev/bump-version \
  -H "X-CSRF-Token: <token>" \
  -H "X-Key-Version: v2" \
  -d '{"scope": "patch"}'
```

### Verify Key Version in Response:
```bash
rg '"keyVersion":\s*"v2"' logs/worker-events.log
```

## Monitoring

**Key Rotation Metrics:**
- V1 signature count
- V2 signature count
- Fallback events (V2 → V1)
- Key rotation duration

**Alert Thresholds:**
- V2 usage < 10% after 24 hours → Investigate migration
- V1 usage > 90% after 7 days → Complete migration
- Fallback rate > 5% → Check V2 key availability

## References

- **Bun.secrets API:** https://bun.sh/docs/api/secrets
- **Cloudflare Workers Secrets:** https://developers.cloudflare.com/workers/configuration/secrets/
- **HMAC-SHA256:** https://datatracker.ietf.org/doc/html/rfc2104

---

**Status:** ✅ **READY** - Dual-key rotation lattice implemented and tested.

