# TES-OPS-004.B.8 - Advanced Dashboard UI: Refined Implementation Plan

## Status: In Progress

### Phase 1: Foundation & Resilience ✅ (Partially Complete)

#### TES-OPS-004.B.8.1: Fetch VersionRegistry Data with Resilience & Caching ✅
- ✅ Exponential backoff (3 retries: 1s, 2s, 4s)
- ✅ SessionStorage caching with 5-minute TTL
- ✅ Cache fallback on fetch failure
- ✅ User feedback for cache usage

#### TES-OPS-004.B.8.2: Create Robust & Accessible Base UI Structure ✅
- ✅ CSS classes refactored to use `tes-` prefix
- ✅ Data attributes refactored to use `data-tes-*` format
- ✅ Semantic HTML structure
- ✅ Global spinner overlay added
- ⏳ ARIA attributes for collapsible groups (pending)

#### TES-OPS-004.B.8.9: Clean Client-side Code & Modularize ⏳
- ⏳ Create `api.js` module (CSRF-aware fetch)
- ⏳ Create `renderer.js` module (DocumentFragment batching)
- ⏳ Create `feedback.js` module (centralized feedback)
- ⏳ Create `state.js` module (UI state management)
- ⏳ Refactor existing code to use modules

### Phase 2: Entity Display & Optimized Rendering ⏳

#### TES-OPS-004.B.8.3: Dynamic Entity List Rendering with Optimization ⏳
- ⏳ DocumentFragment batching for DOM writes
- ⏳ Update class names to `tes-*` prefix
- ⏳ Prepare for virtual scrolling (>100 entities)

#### TES-OPS-004.B.8.4: Accessible Grouping ⏳
- ⏳ Collapsible groups with `<button>` headers
- ⏳ ARIA attributes (`aria-expanded`, `aria-controls`)
- ⏳ Screen reader compatibility

### Phase 3: Interactive Controls & Feedback System ⏳

#### TES-OPS-004.B.8.5: Global Bump Controls ⏳
- ⏳ API contract clarity (no entityId = global)
- ⏳ CSRF token integration
- ⏳ Debounce (300ms)

#### TES-OPS-004.B.8.6: Targeted Bump Controls ⏳
- ⏳ Debounce (300ms) for rapid clicks
- ⏳ Disable on submit, re-enable on response
- ⏳ CSRF token integration

#### TES-OPS-004.B.8.7: Centralized Reactive Feedback System ⏳
- ✅ Global spinner overlay HTML/CSS
- ⏳ `feedback.js` module implementation
- ⏳ Never reload page (reactive updates)

### Phase 4: Security, Audit & Testing ⏳

#### TES-OPS-004.B.8.10: CSRF Protection ⏳
- ⏳ CSRF token generation endpoint integration
- ⏳ Token in `X-CSRF-Token` header
- ⏳ Token refresh on expiry

#### TES-OPS-004.B.8.11: API Endpoint for Rollback Manifests ⏳
- ⏳ `GET /api/dev/rollbacks` endpoint
- ⏳ Stream manifest data
- ⏳ UI modal for rollback display

#### TES-OPS-004.B.8.12: Client-side Error Reporting ⏳
- ⏳ `window.onerror` handler
- ⏳ `window.onunhandledrejection` handler
- ⏳ `POST /api/dev/client-error` endpoint

## Implementation Notes

### CSS Class Migration
All classes have been migrated to `tes-` prefix:
- `.version-group` → `.tes-version-group`
- `.entity-card` → `.tes-entity-card`
- `.bump-btn` → `.tes-bump-btn`
- etc.

### Data Attribute Migration
All data attributes use `data-tes-*` format:
- `data-entity-id` → `data-tes-entity-id`
- `data-entity-type` → `data-tes-entity-type`
- `data-error` → `data-tes-error`

### Next Steps
1. Create modular JavaScript structure
2. Update existing JavaScript to use new modules
3. Implement DocumentFragment batching
4. Add ARIA attributes
5. Implement debounce
6. Add CSRF protection
7. Create rollback API endpoint
8. Add client-side error reporting

## Files Modified
- `scripts/dev-server.ts` - CSS classes, spinner overlay, initial structure

## Files to Create
- Modular JavaScript (inline in dev-server.ts):
  - `api.js` module
  - `renderer.js` module
  - `feedback.js` module
  - `state.js` module

