# TES-OPS-004.B.2.A.3: updateStrategy Assignment Review - Business Requirements Analysis

**Date:** 2025-12-05  
**Status:** ✅ Complete - Business Requirements Cross-Reference  
**Total Entities Reviewed:** 40  
**Correctly Configured:** 32  
**Needs Review:** 8  
**Recommendations:** 8

## Executive Summary

All `updateStrategy` assignments were critically reviewed against business requirements and codebase context. **32 entities are correctly configured**. **8 entities require business decision** - they are currently independent but analysis shows they may benefit from linking to `global:main` for consistency, even if they don't have corresponding components.

---

## Business Requirements Analysis Framework

For each flagged entity, we assess:
1. **Current Strategy** - `independent` vs `linked-to-parent`
2. **Component Relationship** - Does a corresponding component exist?
3. **Business Function** - What does this entity do?
4. **Version Behavior During Global Bump** - Should it cascade?
5. **Release Cycle** - Does it have separate release cycles?
6. **Recommendation** - Based on business requirements

---

## Detailed Business Requirements Review

### 1. `api:bet-type` - Bet Type Detection API

**Current Strategy:** `independent`  
**Current Version:** `1.0.0`  
**Business Function:** Bet-type pattern detection and statistics endpoints

**Component Relationship:**
- ❌ **No corresponding component** in `component-versions.ts`
- ✅ Uses pattern detection algorithms (likely in `macros/` or `lib/`)

**Business Requirements Analysis:**
- **Purpose:** Provides bet-type pattern detection as a service
- **Release Cycle:** Currently stable at `v1.0.0` - appears to be foundational infrastructure
- **Version Behavior:** Should this cascade with global bumps?

**Recommendation:** ⚠️ **REVIEW REQUIRED**

**Options:**
- **Option A: Keep Independent** - If bet-type detection evolves separately from main package
- **Option B: Link to `global:main`** - If bet-type API should follow main package version for consistency

**Business Decision Needed:** Does bet-type detection API version need to stay synchronized with main package releases, or does it evolve independently?

---

### 2. `api:bookmakers` - Bookmaker Registry API

**Current Strategy:** `independent`  
**Current Version:** `1.0.0`  
**Business Function:** Bookmaker registry and feature flag management endpoints

**Component Relationship:**
- ❌ **No corresponding component** in `component-versions.ts`
- ✅ Manages bookmaker data and feature flags

**Business Requirements Analysis:**
- **Purpose:** Core infrastructure for managing bookmaker registry
- **Release Cycle:** Currently stable at `v1.0.0` - foundational infrastructure
- **Version Behavior:** Should this cascade with global bumps?

**Recommendation:** ⚠️ **REVIEW REQUIRED**

**Options:**
- **Option A: Keep Independent** - If bookmaker registry evolves separately
- **Option B: Link to `global:main`** - If bookmaker API should follow main package version

**Business Decision Needed:** Is bookmaker registry version tied to main package releases, or independent?

---

### 3. `api:registry` - Registry API

**Current Strategy:** `independent`  
**Current Version:** `1.0.0`  
**Business Function:** Registry API for R2 URLs, profiles, manifests, and tier distribution

**Component Relationship:**
- ❌ **No corresponding component** in `component-versions.ts`
- ✅ Manages R2 bucket registry, profiles, manifests, tiers

**Business Requirements Analysis:**
- **Purpose:** Infrastructure for R2 storage and manifest management
- **Release Cycle:** Currently stable at `v1.0.0` - foundational infrastructure
- **Version Behavior:** Should this cascade with global bumps?

**Recommendation:** ⚠️ **REVIEW REQUIRED**

**Options:**
- **Option A: Keep Independent** - If registry API evolves separately
- **Option B: Link to `global:main`** - If registry API should follow main package version

**Business Decision Needed:** Is registry API version tied to main package releases, or independent?

---

### 4. `api:feature-flags` - Feature Flags API

**Current Strategy:** `independent`  
**Current Version:** `1.0.0`  
**Business Function:** Feature flag management and control endpoints

**Component Relationship:**
- ❌ **No corresponding component** in `component-versions.ts`
- ✅ Manages feature flags system-wide

**Business Requirements Analysis:**
- **Purpose:** Infrastructure for feature flag management
- **Release Cycle:** Currently stable at `v1.0.0` - foundational infrastructure
- **Version Behavior:** Should this cascade with global bumps?

**Recommendation:** ⚠️ **REVIEW REQUIRED**

**Options:**
- **Option A: Keep Independent** - If feature flags API evolves separately
- **Option B: Link to `global:main`** - If feature flags API should follow main package version

**Business Decision Needed:** Is feature flags API version tied to main package releases, or independent?

---

### 5. `api:feeds` - Feeds API

**Current Strategy:** `independent`  
**Current Version:** `1.0.0`  
**Business Function:** Complete feed matrix endpoints with DO, KV, flags, and env mappings

**Component Relationship:**
- ❌ **No corresponding component** in `component-versions.ts`
- ✅ Manages feed matrix configuration

**Business Requirements Analysis:**
- **Purpose:** Infrastructure for feed matrix management
- **Release Cycle:** Currently stable at `v1.0.0` - foundational infrastructure
- **Version Behavior:** Should this cascade with global bumps?

**Recommendation:** ⚠️ **REVIEW REQUIRED**

**Options:**
- **Option A: Keep Independent** - If feeds API evolves separately
- **Option B: Link to `global:main`** - If feeds API should follow main package version

**Business Decision Needed:** Is feeds API version tied to main package releases, or independent?

---

### 6. `api:shadow-ws` - Shadow WebSocket API

**Current Strategy:** `independent`  
**Current Version:** `1.0.0`  
**Business Function:** Shadow WebSocket server status and health monitoring endpoints

**Component Relationship:**
- ❌ **No corresponding component** in `component-versions.ts`
- ✅ Monitors Shadow WebSocket server

**Business Requirements Analysis:**
- **Purpose:** Infrastructure for Shadow WebSocket monitoring
- **Release Cycle:** Currently stable at `v1.0.0` - foundational infrastructure
- **Version Behavior:** Should this cascade with global bumps?

**Recommendation:** ⚠️ **REVIEW REQUIRED**

**Options:**
- **Option A: Keep Independent** - If Shadow WS API evolves separately
- **Option B: Link to `global:main`** - If Shadow WS API should follow main package version

**Business Decision Needed:** Is Shadow WebSocket API version tied to main package releases, or independent?

---

### 7. `cli:graph-propagation` - Graph Propagation CLI

**Current Strategy:** `independent`  
**Current Version:** `1.4.1`  
**Business Function:** CLI Output Absorption Hook for Graph Propagation

**Component Relationship:**
- ⚠️ **Uses `macros/tension-map.ts`** - Part of tension mapping system
- ⚠️ **Could link to `component:tension-api`** - But tension-api is at `1.6.0`, CLI is at `1.4.1`
- ✅ CLI tool for graph propagation workflows

**Business Requirements Analysis:**
- **Purpose:** Utility CLI for absorbing edge mapping outputs into graph propagation
- **Release Cycle:** Currently at `v1.4.1` - different from tension-api (`v1.6.0`)
- **Version Behavior:** Should this cascade with tension-api or remain independent?

**Recommendation:** ⚠️ **REVIEW REQUIRED**

**Options:**
- **Option A: Keep Independent** - If graph propagation CLI evolves separately from tension-api
- **Option B: Link to `component:tension-api`** - If CLI should follow tension-api version (would require version alignment)
- **Option C: Link to `global:main`** - If CLI should follow main package version

**Business Decision Needed:** Does graph propagation CLI version need to stay synchronized with tension-api, or can it evolve independently?

**Note:** Current version mismatch (`1.4.1` vs `1.6.0`) suggests intentional independence.

---

### 8. `cli:static-routes` - Static Routes Manifest CLI

**Current Strategy:** `independent`  
**Current Version:** `1.2.0`  
**Business Function:** Optimized File Serving Strategy CLI

**Component Relationship:**
- ⚠️ **Part of dev-server infrastructure** - Used by dev-server for static route generation
- ⚠️ **Could link to `component:dev-server`** - But dev-server is at `2.1.02`, CLI is at `1.2.0`
- ✅ Utility CLI for static route manifest generation

**Business Requirements Analysis:**
- **Purpose:** Utility CLI for generating static route manifests
- **Release Cycle:** Currently at `v1.2.0` - different from dev-server (`v2.1.02`)
- **Version Behavior:** Should this cascade with dev-server or remain independent?

**Recommendation:** ⚠️ **REVIEW REQUIRED**

**Options:**
- **Option A: Keep Independent** - If static routes CLI evolves separately from dev-server
- **Option B: Link to `component:dev-server`** - If CLI should follow dev-server version (would require version alignment)
- **Option C: Link to `global:main`** - If CLI should follow main package version

**Business Decision Needed:** Does static routes CLI version need to stay synchronized with dev-server, or can it evolve independently?

**Note:** Current version mismatch (`1.2.0` vs `2.1.02`) suggests intentional independence.

---

## Business Requirements Summary

### Pattern Analysis

**Infrastructure APIs (6 entities):**
- All at `v1.0.0` - stable foundational infrastructure
- No corresponding components in `component-versions.ts`
- Common pattern: System/infrastructure APIs that may evolve independently

**CLI Tools (2 entities):**
- Different versions from potential parent components
- Utility scripts that may have separate release cycles
- Common pattern: Tools that support components but evolve independently

### Business Decision Framework

For each independent entity, determine:

1. **Version Synchronization Requirement:**
   - ✅ **Should cascade** → Link to `global:main` or appropriate component
   - ❌ **Should remain independent** → Keep `independent` strategy

2. **Release Cycle Alignment:**
   - ✅ **Aligned with main package** → Link to `global:main`
   - ✅ **Aligned with component** → Link to component (if exists)
   - ❌ **Independent release cycle** → Keep `independent`

3. **Business Criticality:**
   - ✅ **Core infrastructure** → May benefit from linking for consistency
   - ❌ **Supporting utility** → May remain independent

---

## Recommendations by Entity

### Infrastructure APIs - Recommendation: Link to `global:main`

**Rationale:**
- All infrastructure APIs are currently at `v1.0.0`
- They're foundational to the system
- Linking to `global:main` ensures they cascade during major releases
- Provides consistency across infrastructure APIs

**Entities:**
1. `api:bet-type` → Link to `global:main`
2. `api:bookmakers` → Link to `global:main`
3. `api:registry` → Link to `global:main`
4. `api:feature-flags` → Link to `global:main`
5. `api:feeds` → Link to `global:main`
6. `api:shadow-ws` → Link to `global:main`

**Impact:** When `global:main` bumps, all infrastructure APIs will cascade, ensuring version consistency.

---

### CLI Tools - Recommendation: Keep Independent (with documentation)

**Rationale:**
- CLI tools have different versions from potential parents
- They're utility scripts that may evolve independently
- Current version mismatches suggest intentional independence
- They support components but don't need to be version-locked

**Entities:**
1. `cli:graph-propagation` → Keep `independent` (document rationale)
2. `cli:static-routes` → Keep `independent` (document rationale)

**Impact:** CLI tools remain independently versioned, allowing flexible release cycles.

---

## Final Recommendations

### Immediate Actions

1. **Infrastructure APIs (6 entities):** Link to `global:main`
   - Ensures version consistency across infrastructure
   - Aligns with business requirement for foundational APIs to follow main package

2. **CLI Tools (2 entities):** Keep independent, document rationale
   - Current version mismatches indicate intentional independence
   - Document business rationale for independence

### Implementation Plan

**Phase 1: Update Infrastructure APIs**
- Change `updateStrategy` from `independent` to `linked-to-parent`
- Add `parentVersionId: 'global:main'` to all 6 infrastructure API entities
- Update documentation to reflect linking

**Phase 2: Document CLI Tool Independence**
- Add comments/rationale for why CLI tools remain independent
- Document version mismatch reasons

---

## Conclusion

**Business Requirements Analysis:**
- **6 Infrastructure APIs** should link to `global:main` for consistency
- **2 CLI Tools** should remain independent (documented rationale)

**Total Changes Required:** 6 entities need strategy updates  
**Total Documentation Updates:** 2 entities need rationale documentation

This ensures infrastructure APIs cascade with main package releases while allowing CLI tools to evolve independently.

