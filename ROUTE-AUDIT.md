# Route Audit - dev-server.ts

**Generated:** $(date)  
**File:** `scripts/dev-server.ts`  
**Total Routes:** 60+

## TES-OPS-004.B.8: Automated Endpoint Discovery

**Note:** Endpoints are now auto-discovered from `src/lib/endpoint-metadata.ts`.  
See `docs/TES-ENDPOINT-DISCOVERY.md` for details on adding new endpoints.

The metadata registry provides:
- Type-safe endpoint definitions
- Automatic schema extraction
- Single source of truth for endpoint documentation
- Runtime validation

**To add a new endpoint:**
1. Add route handler to `Bun.serve()` routes
2. Add metadata entry to `src/lib/endpoint-metadata.ts`
3. Endpoint automatically appears in discovery

---

## Route Categories

### Static Routes (Zero-allocation dispatch)
- `GET /favicon.ico` - 204 No Content
- `GET /health` - Static "OK" response
- `GET /ready` - Readiness check (async, checks warmup status)
- `GET /tension-map` - Redirects to `/tension`
- `GET /api/version` - Static JSON version info

### HTML Import Routes
- `GET /tension` - Tension mapping visualization (HTML import)
- `GET /tes-dashboard.html` - TES lifecycle dashboard (HTML with rate limiting)
- `GET /registry` - Bookmaker registry dashboard (HTML)
- `GET /tiers` - Tier distribution dashboard (HTML)

### Dev API Routes
- `GET /api/dev/endpoints` - List all API endpoints (auto-generated from metadata)
- `POST /api/dev/bump-version` - Bump version for entity (metadata: v1.0)
- `GET /api/dev/endpoints/check` - Check all endpoints with header metadata enrichment
- `GET /api/dev/versions` - Get all component versions (metadata: v2.1.02)
- `GET /api/dev/configs` - Show all configs (metadata: v2.1.02)
- `GET /api/dev/colors` - Get color palette and usage stats (metadata: v2.1.02)
- `GET /api/dev/workers` - Worker telemetry (metadata: v2.1.02)
- `GET /api/dev/status` - System status (metadata: v2.1.02)
- `GET /api/dev/metrics` - Server metrics (pendingRequests, pendingWebSockets) (metadata: v2.1.02)
- `GET /api/dev/metrics/websocket` - WebSocket metrics
- `GET /api/dev/event-loop` - Event loop monitoring metrics (metadata: v2.1.02)
- `GET /api/dev/:endpoint` - Parameter route for unknown dev endpoints (returns validation error) (metadata: v2.1)

### Tension API Routes
- `GET /api/tension/map` - Tension mapping API (single)
- `POST /api/tension/map` - Tension mapping API (single)
- `GET /api/tension/batch` - Tension mapping API (batch)
- `POST /api/tension/batch` - Tension mapping API (batch)
- `GET /api/tension/health` - Health check (validates macro, inputs, HTML page)
- `GET /api/tension/help` - Help documentation (CLI, API, Portal)
- `GET /api/tension/socket-info` - WebSocket connection info

### Gauge API Routes
- `GET /api/gauge/womens-sports` - WNBATOR 5D tensor gauge

### AI API Routes
- `GET /api/ai/maparse` - AI auto-maparse curve detection
- `POST /api/ai/maparse` - AI auto-maparse curve detection (POST)
- `GET /api/ai/models/status` - AI model cache status and statistics

### Validation API Routes
- `GET /api/validate/threshold` - Threshold validator with auto-correction

### Spline API Routes
- `GET /api/spline/render` - Render spline path
- `POST /api/spline/render` - Render spline path (POST)
- `POST /api/spline/predict` - Predict next points
- `POST /api/spline/preset/store` - Store preset

### Bookmaker API Routes
- `GET /api/bookmakers` - Get all bookmakers
- `POST /api/bookmakers` - Create new bookmaker
- `GET /api/bookmakers/:id` - Get bookmaker by ID
- `PATCH /api/bookmakers/:id/flags/:flag` - Update bookmaker feature flag
- `PATCH /api/bookmakers/:id/rollout` - Update bookmaker rollout

### Registry API Routes
- `GET /api/registry/bookmakers` - List all bookmakers with R2 URLs
- `GET /api/registry/profile/:bookieId` - Get bookmaker profile
- `GET /api/registry/manifests/:bookieId` - Get RG index manifests
- `GET /api/registry/tiers` - Get tier distribution
- `GET /api/registry/r2` - Get R2 bucket registry URLs

### Bet-Type API Routes
- `GET /api/bet-type/detect/:bookieId/:marketId` - Detect bet-type patterns
- `GET /api/bet-type/stats` - Bet-type detection statistics
- `POST /api/bet-type/detect` - Detect bet-type pattern (POST with body)

### Glossary API Routes
- `GET /api/glossary/term/:termId` - Get glossary term by ID
- `GET /api/glossary/search` - Search glossary terms
- `GET /api/glossary/category/:category` - Get terms by category
- `GET /api/glossary/bet-types` - Get all bet-type terms

### Feature Flags API Routes
- `GET /api/feature-flags` - Get all feature flags
- `GET /api/feature-flags?category={category}` - Get feature flags by category (query param)
- `POST /api/feature-flags/:key/enable` - Enable a feature flag
- `POST /api/feature-flags/:key/disable` - Disable a feature flag

### Feeds API Routes
- `GET /api/feeds/matrix` - Get complete feed matrix with DO, KV, flags, and env mappings

### Shadow WebSocket API Routes
- `GET /api/shadow-ws/status` - Get Shadow WebSocket Server status and stats
- `GET /api/shadow-ws/health` - Check Shadow WebSocket Server health

### Lifecycle API Routes
- `GET /api/lifecycle/export` - Export lifecycle visualization data
- `GET /api/lifecycle/health` - TES lifecycle health check

### Worker Management API Routes
- `GET /api/workers/registry` - Live worker state
- `POST /api/workers/scale` - Manual worker scaling
- `GET /api/workers/snapshot/:id` - Download heap snapshot

### Wildcard Routes
- `GET /api/*` - Wildcard route for unmatched API paths (returns 404 with helpful message)

### Catch-All Route
- `GET /*` - Global catch-all route for unmatched paths (serves dashboard or 404)

## WebSocket Routes

- `WS /ws/workers/telemetry` - Live telemetry stream
- `WS /ws/spline-live` - Live spline streaming

## Route Precedence

Routes are matched in order of specificity:
1. **Exact routes** (e.g., `/api/dev/endpoints`) - Highest priority
2. **Parameter routes** (e.g., `/api/dev/:endpoint`) - Matches dynamic segments
3. **Wildcard routes** (e.g., `/api/*`) - Matches paths under prefix
4. **Catch-all route** (`/*`) - Matches all unmatched routes

## HTTP Methods Summary

- **GET**: 50+ routes
- **POST**: 10+ routes
- **PATCH**: 2 routes
- **WebSocket**: 2 routes

## Notes

- All routes use Bun's native routing system (`Bun.serve()` routes property)
- Static routes use zero-allocation dispatch for optimal performance
- Parameter routes use type-safe `BunRequest<T>` with explicit type annotations
- Most async routes include performance timing metadata
- Rate limiting is applied to `/tes-dashboard.html`
- Some routes support both GET and POST methods
- **TES-OPS-004.B.8**: Endpoints with metadata are auto-discovered from `src/lib/endpoint-metadata.ts`
- See `docs/TES-ENDPOINT-DISCOVERY.md` for metadata registry documentation

## Extraction Command

```bash
grep -E "^[[:space:]]+['\"](/[^'\"]+)['\"]:" scripts/dev-server.ts | \
  sed "s/.*['\"]\([^'\"]*\)['\"].*/\1/" | \
  grep -E "^/" | \
  grep -v "^/\*" | \
  sort -u
```

