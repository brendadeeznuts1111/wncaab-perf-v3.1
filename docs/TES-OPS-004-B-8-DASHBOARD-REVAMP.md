# TES-OPS-004.B.8: Dashboard UI Revamp - Cryptographic Signing Integration

**Status:** ✅ **IN PROGRESS**  
**Date:** 2025-11-12  
**Priority:** High (Final Mile for Version Management)

## Overview

Enhanced the dashboard UI to display cryptographic signature verification badges for version entities, integrating with the Durable Objects backend we just secured.

## Changes Made

### 1. Enhanced Version Entity Component ✅

**File:** `src/dashboard/components/version-entity.js`

- Added signature badge display (🔒 SIGNED / ⚠️ INVALID / 🔓 UNSIGNED)
- Color-coded badges:
  - Green: Valid signature (cryptographically verified)
  - Red: Invalid signature (verification failed)
  - Yellow: No signature (legacy/unsigned)
- Updated `setEntity()` method to accept signature and signatureValid parameters
- Added signature attributes to observedAttributes

### 2. Next Steps (To Complete Integration)

#### A. Update Dashboard JavaScript Functions

**File:** `scripts/dev-server.ts` (around line 6659)

1. **Update `loadVersionEntities()` function:**
   - Fetch from `/version/registry` endpoint (Durable Objects)
   - Extract signatures from response
   - Pass signatures to `setEntity()` calls

2. **Update `bumpVersion()` function:**
   - Call `/version/bump` endpoint (Durable Objects)
   - Display signature in success message
   - Show signature verification status

3. **Add signature verification helper:**
   ```javascript
   async function verifySignature(entities, signature) {
     // Verify HMAC-SHA256 signature
     // Return boolean indicating validity
   }
   ```

#### B. Update Bump Endpoint

**File:** `scripts/dev-server.ts` (around line 11874)

- Optionally proxy to Durable Objects `/version/bump` endpoint
- Return signature in response
- Include signature verification status

#### C. Add Signature Display to UI

**File:** `scripts/dev-server.ts` (dashboard HTML generation)

- Add signature status indicator to global bump controls
- Show signature in bump result message
- Display signature hash (truncated) for transparency

## Integration Points

### Durable Objects Endpoints

1. **GET `/version/registry`**
   - Returns: `{ entities: VersionedEntity[], lifecycle: string, hsl: string }`
   - Note: Currently doesn't include signatures (needs enhancement)

2. **POST `/version/bump`**
   - Returns: `{ success: boolean, bumped: VersionedEntity[], changes: VersionChange[], signature: string, timestamp: number, hsl: string }`
   - Includes signature in response ✅

### Signature Flow

```
User clicks bump → POST /version/bump → Durable Object signs response → 
Dashboard receives signature → Display badge → Verify signature (optional)
```

## Future Enhancements

### TES-OPS-004.B.4 Follow-up: Bump Process Integration

1. **Update `scripts/bump.ts`:**
   - Load signing key from KV/Durable Object
   - Sign version manifest (`.manifest.json`)
   - Add signature field to manifest

2. **Update `VersionRegistryLoader`:**
   - Verify signatures when loading entities
   - Cache verification results
   - Display verification status

3. **Manifest Signing:**
   ```typescript
   interface VersionManifest {
     entities: VersionedEntity[];
     timestamp: number;
     signature: string; // HMAC-SHA256 signature
   }
   ```

## Testing Checklist

- [ ] Verify signature badges display correctly
- [ ] Test with signed versions (from Durable Objects)
- [ ] Test with unsigned versions (legacy)
- [ ] Test signature verification (valid/invalid)
- [ ] Test bump flow with signature display
- [ ] Verify signature persists after page reload

## Files Modified

1. ✅ `src/dashboard/components/version-entity.js` - Enhanced with signature badges
2. ⏳ `scripts/dev-server.ts` - Needs signature integration in loadVersionEntities()
3. ⏳ `scripts/dev-server.ts` - Needs signature display in bumpVersion()

## Status

**Phase 1:** ✅ Component enhancement complete  
**Phase 2:** ⏳ Dashboard integration in progress  
**Phase 3:** ⏳ Bump process integration (future)

---

**Next Action:** Update `loadVersionEntities()` and `bumpVersion()` functions in dev-server.ts to integrate with Durable Objects API and display signatures.

