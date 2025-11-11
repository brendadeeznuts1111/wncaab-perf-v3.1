# TES-OPS-004.B.2.A.3: updateStrategy Critical Review - Business Requirements Cross-Reference

**Date:** 2025-12-05  
**Status:** ✅ Complete - Critical Business Requirements Analysis  
**Method:** Code analysis + Business requirements cross-reference

## Executive Summary

Critically reviewed `updateStrategy` assignments for all 8 flagged entities, cross-referencing with actual codebase behavior and business requirements. **Recommendation: Link 6 infrastructure APIs to `global:main` for consistency, keep 2 CLI tools independent.**

---

## Critical Review Framework

For each flagged entity, we assess:
1. **Current Implementation** - How versions are used in code
2. **Version Behavior During Global Bump** - Should it cascade?
3. **Business Requirements** - What does the business need?
4. **Code Evidence** - What does the codebase tell us?
5. **Final Recommendation** - Based on all evidence

---

## Entity 1: `api:bet-type` - Bet Type Detection API

### Current Implementation Analysis

**Code Evidence:**
```typescript
// scripts/dev-server.ts:9871
version: 'v1.0',  // Hardcoded in response metadata

// scripts/dev-server.ts:9213-9221
betType: {
  version: '1.0.0',  // Hardcoded in /api/dev/versions endpoint
  component: 'Bet Type Detection',
  endpoints: [...]
}
```

**Findings:**
- ✅ Version is hardcoded as `'1.0.0'` or `'v1.0'` in responses
- ✅ No dynamic version references (doesn't use `packageVersion` or component versions)
- ✅ Currently stable at v1.0.0

### Version Behavior During Global Bump

**Scenario:** `global:main` bumps from `3.1.0` → `3.2.0`

**Current Behavior (Independent):**
- ❌ Bet Type API version stays at `1.0.0`
- ❌ No automatic cascade
- ❌ Manual update required if version should change

**Proposed Behavior (Linked to `global:main`):**
- ✅ Bet Type API version cascades to match global bump
- ✅ Automatic synchronization
- ✅ Consistent versioning across infrastructure

### Business Requirements Analysis

**Business Function:**
- Provides bet-type pattern detection as a service
- Infrastructure API for defensive bookmaker detection
- Used by other components but is foundational infrastructure

**Business Requirements:**
1. **Version Consistency:** Infrastructure APIs should reflect main package releases
2. **Cascading Updates:** When main package releases, infrastructure should cascade
3. **API Stability:** Infrastructure APIs are stable but should version with main package

**Decision:** ✅ **LINK TO `global:main`**

**Rationale:**
- Infrastructure API that should stay synchronized with main package
- Currently hardcoded - linking enables automatic updates
- No business reason for independence
- Ensures version consistency across foundational APIs

---

## Entity 2: `api:bookmakers` - Bookmaker Registry API

### Current Implementation Analysis

**Code Evidence:**
```typescript
// scripts/dev-server.ts:9444, 9452, 9470
version: 'v1.0',  // Hardcoded in response metadata

// scripts/dev-server.ts:9188-9198
bookmakers: {
  version: '1.0.0',  // Hardcoded in /api/dev/versions endpoint
  component: 'Bookmaker Registry',
  endpoints: [...]
}
```

**Findings:**
- ✅ Version is hardcoded as `'1.0.0'` or `'v1.0'` in responses
- ✅ No dynamic version references
- ✅ Currently stable at v1.0.0

### Version Behavior During Global Bump

**Current Behavior (Independent):**
- ❌ Bookmaker API version stays at `1.0.0`
- ❌ No automatic cascade

**Proposed Behavior (Linked to `global:main`):**
- ✅ Bookmaker API version cascades with global bump
- ✅ Automatic synchronization

### Business Requirements Analysis

**Business Function:**
- Core infrastructure for managing bookmaker registry
- Provides bookmaker CRUD operations and feature flag management
- Foundational to the system

**Business Requirements:**
1. **Infrastructure Consistency:** Registry APIs should version with main package
2. **Cascading Updates:** Should cascade during major releases

**Decision:** ✅ **LINK TO `global:main`**

**Rationale:**
- Core infrastructure API
- Should stay synchronized with main package releases
- No business reason for independence

---

## Entity 3: `api:registry` - Registry API

### Current Implementation Analysis

**Code Evidence:**
```typescript
// scripts/dev-server.ts:9200-9211
registry: {
  version: '1.0.0',  // Hardcoded in /api/dev/versions endpoint
  component: 'Registry API',
  endpoints: [...]
}
```

**Findings:**
- ✅ Version is hardcoded as `'1.0.0'` in responses
- ✅ No dynamic version references
- ✅ Currently stable at v1.0.0

### Version Behavior During Global Bump

**Current Behavior (Independent):**
- ❌ Registry API version stays at `1.0.0`
- ❌ No automatic cascade

**Proposed Behavior (Linked to `global:main`):**
- ✅ Registry API version cascades with global bump
- ✅ Automatic synchronization

### Business Requirements Analysis

**Business Function:**
- Infrastructure for R2 storage and manifest management
- Manages profiles, manifests, tiers, R2 URLs
- Foundational infrastructure

**Business Requirements:**
1. **Infrastructure Consistency:** Registry should version with main package
2. **Cascading Updates:** Should cascade during major releases

**Decision:** ✅ **LINK TO `global:main`**

**Rationale:**
- Infrastructure API for storage and manifests
- Should stay synchronized with main package
- No business reason for independence

---

## Entity 4: `api:feature-flags` - Feature Flags API

### Current Implementation Analysis

**Code Evidence:**
```typescript
// scripts/dev-server.ts:10272, 10287, 10295
version: 'v1.0',  // Hardcoded in response metadata

// scripts/dev-server.ts:9224-9233
featureFlags: {
  version: '1.0.0',  // Hardcoded in /api/dev/versions endpoint
  component: 'Feature Flags',
  endpoints: [...]
}
```

**Findings:**
- ✅ Version is hardcoded as `'1.0.0'` or `'v1.0'` in responses
- ✅ No dynamic version references
- ✅ Currently stable at v1.0.0

### Version Behavior During Global Bump

**Current Behavior (Independent):**
- ❌ Feature Flags API version stays at `1.0.0`
- ❌ No automatic cascade

**Proposed Behavior (Linked to `global:main`):**
- ✅ Feature Flags API version cascades with global bump
- ✅ Automatic synchronization

### Business Requirements Analysis

**Business Function:**
- Infrastructure for feature flag management system-wide
- Enables/disables features across the application
- Foundational infrastructure

**Business Requirements:**
1. **Infrastructure Consistency:** Feature flags should version with main package
2. **Cascading Updates:** Should cascade during major releases

**Decision:** ✅ **LINK TO `global:main`**

**Rationale:**
- Infrastructure API for feature management
- Should stay synchronized with main package
- No business reason for independence

---

## Entity 5: `api:feeds` - Feeds API

### Current Implementation Analysis

**Code Evidence:**
```typescript
// scripts/dev-server.ts:9235-9240
feeds: {
  version: '1.0.0',  // Hardcoded in /api/dev/versions endpoint
  component: 'Feeds API',
  endpoints: ['/api/feeds/matrix']
}
```

**Findings:**
- ✅ Version is hardcoded as `'1.0.0'` in responses
- ✅ No dynamic version references
- ✅ Currently stable at v1.0.0

### Version Behavior During Global Bump

**Current Behavior (Independent):**
- ❌ Feeds API version stays at `1.0.0`
- ❌ No automatic cascade

**Proposed Behavior (Linked to `global:main`):**
- ✅ Feeds API version cascades with global bump
- ✅ Automatic synchronization

### Business Requirements Analysis

**Business Function:**
- Infrastructure for feed matrix management
- Manages DO, KV, flags, and env mappings
- Foundational infrastructure

**Business Requirements:**
1. **Infrastructure Consistency:** Feeds should version with main package
2. **Cascading Updates:** Should cascade during major releases

**Decision:** ✅ **LINK TO `global:main`**

**Rationale:**
- Infrastructure API for feed management
- Should stay synchronized with main package
- No business reason for independence

---

## Entity 6: `api:shadow-ws` - Shadow WebSocket API

### Current Implementation Analysis

**Code Evidence:**
```typescript
// scripts/dev-server.ts:9242-9250
shadowWs: {
  version: '1.0.0',  // Hardcoded in /api/dev/versions endpoint
  component: 'Shadow WebSocket',
  endpoints: [...]
}
```

**Findings:**
- ✅ Version is hardcoded as `'1.0.0'` in responses
- ✅ No dynamic version references
- ✅ Currently stable at v1.0.0

### Version Behavior During Global Bump

**Current Behavior (Independent):**
- ❌ Shadow WS API version stays at `1.0.0`
- ❌ No automatic cascade

**Proposed Behavior (Linked to `global:main`):**
- ✅ Shadow WS API version cascades with global bump
- ✅ Automatic synchronization

### Business Requirements Analysis

**Business Function:**
- Infrastructure for Shadow WebSocket server monitoring
- Provides status and health endpoints
- Foundational infrastructure

**Business Requirements:**
1. **Infrastructure Consistency:** Shadow WS should version with main package
2. **Cascading Updates:** Should cascade during major releases

**Decision:** ✅ **LINK TO `global:main`**

**Rationale:**
- Infrastructure API for WebSocket monitoring
- Should stay synchronized with main package
- No business reason for independence

---

## Entity 7: `cli:graph-propagation` - Graph Propagation CLI

### Current Implementation Analysis

**Code Evidence:**
```typescript
// graph-propagation/cli-absorb.ts:3
* CLI Output Absorption Hook - Graph Propagation (v1.4.1)

// Uses macros/tension-map.ts (part of tension-api system)
// Tension API is at v1.6.0, CLI is at v1.4.1
```

**Findings:**
- ✅ Version is hardcoded in file header: `v1.4.1`
- ⚠️ Uses `macros/tension-map.ts` (tension-api component)
- ⚠️ Version mismatch: CLI `v1.4.1` vs tension-api `v1.6.0`
- ✅ Utility CLI tool, not a component

### Version Behavior During Global Bump

**Current Behavior (Independent):**
- ❌ Graph Propagation CLI version stays at `1.4.1`
- ❌ No automatic cascade
- ✅ Can evolve independently

**Proposed Behavior (If Linked):**
- ⚠️ Would cascade with parent (tension-api or global:main)
- ⚠️ Would require version alignment (currently mismatched)

### Business Requirements Analysis

**Business Function:**
- Utility CLI for absorbing edge mapping outputs
- Supports graph propagation workflows
- Uses tension mapping system but is a separate tool

**Business Requirements:**
1. **Tool Independence:** CLI tools may evolve separately from components
2. **Version Mismatch:** Current mismatch (`1.4.1` vs `1.6.0`) suggests intentional independence
3. **Utility Nature:** Supporting tool, not core component

**Decision:** ✅ **KEEP INDEPENDENT**

**Rationale:**
- Version mismatch indicates intentional independence
- Utility CLI tool that supports components but doesn't need version lock
- Can evolve independently based on tool-specific needs
- Business requirement: Tools should have flexible release cycles

**Documentation Required:** Add comment explaining why this CLI remains independent.

---

## Entity 8: `cli:static-routes` - Static Routes Manifest CLI

### Current Implementation Analysis

**Code Evidence:**
```typescript
// scripts/static-routes.ts
* Static Routes Manifest - Optimized File Serving Strategy (v1.2.0)

// Used by dev-server for static route generation
// Dev Server is at v2.1.02, CLI is at v1.2.0
```

**Findings:**
- ✅ Version is hardcoded in file header: `v1.2.0`
- ⚠️ Used by dev-server infrastructure
- ⚠️ Version mismatch: CLI `v1.2.0` vs dev-server `v2.1.02`
- ✅ Utility CLI tool, not a component

### Version Behavior During Global Bump

**Current Behavior (Independent):**
- ❌ Static Routes CLI version stays at `1.2.0`
- ❌ No automatic cascade
- ✅ Can evolve independently

**Proposed Behavior (If Linked):**
- ⚠️ Would cascade with parent (dev-server or global:main)
- ⚠️ Would require version alignment (currently mismatched)

### Business Requirements Analysis

**Business Function:**
- Utility CLI for generating static route manifests
- Supports dev-server infrastructure
- Optimized file serving strategy

**Business Requirements:**
1. **Tool Independence:** CLI tools may evolve separately from components
2. **Version Mismatch:** Current mismatch (`1.2.0` vs `2.1.02`) suggests intentional independence
3. **Utility Nature:** Supporting tool, not core component

**Decision:** ✅ **KEEP INDEPENDENT**

**Rationale:**
- Version mismatch indicates intentional independence
- Utility CLI tool that supports dev-server but doesn't need version lock
- Can evolve independently based on tool-specific needs
- Business requirement: Tools should have flexible release cycles

**Documentation Required:** Add comment explaining why this CLI remains independent.

---

## Summary of Critical Review

### Infrastructure APIs (6 entities) - ✅ LINK TO `global:main`

**Business Requirement:** Infrastructure APIs should cascade with main package releases for consistency.

**Entities:**
1. `api:bet-type` → Link to `global:main`
2. `api:bookmakers` → Link to `global:main`
3. `api:registry` → Link to `global:main`
4. `api:feature-flags` → Link to `global:main`
5. `api:feeds` → Link to `global:main`
6. `api:shadow-ws` → Link to `global:main`

**Rationale:**
- All are foundational infrastructure APIs
- All currently hardcoded at `v1.0.0`
- Should cascade during global bumps for consistency
- No business reason for independence

**Impact:** When `global:main` bumps, all infrastructure APIs will automatically cascade, ensuring version consistency across foundational APIs.

---

### CLI Tools (2 entities) - ✅ KEEP INDEPENDENT

**Business Requirement:** CLI tools should have flexible release cycles independent of components.

**Entities:**
1. `cli:graph-propagation` → Keep `independent` (document rationale)
2. `cli:static-routes` → Keep `independent` (document rationale)

**Rationale:**
- Version mismatches indicate intentional independence
- Utility tools that support components but don't need version lock
- Can evolve independently based on tool-specific needs
- Business requirement: Tools should have flexible release cycles

**Impact:** CLI tools remain independently versioned, allowing flexible release cycles.

---

## Final Recommendations

### Immediate Actions

1. **Update 6 Infrastructure APIs:**
   - Change `updateStrategy` from `independent` to `linked-to-parent`
   - Add `parentVersionId: 'global:main'` to all 6 entities
   - This ensures they cascade during global bumps

2. **Document CLI Tool Independence:**
   - Add comments/rationale for why CLI tools remain independent
   - Document version mismatch reasons

### Business Requirements Compliance

**Infrastructure APIs:**
- ✅ **Compliance:** Linking to `global:main` ensures infrastructure APIs cascade with main package releases
- ✅ **Consistency:** All foundational APIs will version together
- ✅ **Automation:** Automatic cascading during global bumps

**CLI Tools:**
- ✅ **Compliance:** Independence allows flexible release cycles
- ✅ **Flexibility:** Tools can evolve independently
- ✅ **Documentation:** Rationale documented for future reference

---

## Conclusion

**Critical Review Results:**
- **6 Infrastructure APIs** → Should link to `global:main` for business requirement compliance
- **2 CLI Tools** → Should remain independent per business requirements

**Business Requirements Met:**
- ✅ Infrastructure APIs will cascade with main package releases
- ✅ CLI tools maintain flexible release cycles
- ✅ Version consistency across foundational APIs
- ✅ Tool independence preserved where appropriate

This ensures the version management system accurately reflects business requirements for how versions should behave during global bumps.

