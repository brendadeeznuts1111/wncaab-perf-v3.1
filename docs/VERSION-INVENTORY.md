# 📊 TES Version Inventory - Complete Component Version Mapping

**Generated:** 2025  
**Purpose:** Comprehensive inventory of all versioned entities in TES

## Summary

**Total Versioned Entities:** 20+ distinct components/modules  
**Version Categories:** 5 categories  
**API Endpoints with Versions:** 60+ endpoints

## Version Categories

### 1. Core Package Versions (2)

| Component | Version | Location | Purpose |
|-----------|---------|----------|---------|
| **Main Package** | `3.1.0` | `package.json` | Project-wide version |
| **API Version** | `1.6.0` | `lib/constants.ts` | Tension Mapping API version |

### 2. Major Component Versions (7)

| Component | Version | Location | Displayed in UI |
|-----------|---------|----------|-----------------|
| **Betting Glossary** | `2.1.02` | `src/config/component-versions.ts` | ✅ Yes |
| **Tension API** | `1.6.0` | `src/config/component-versions.ts` | ✅ Yes |
| **AI Maparse** | `1.4.2` | `src/config/component-versions.ts` | ✅ Yes |
| **Gauge API (WNBATOR)** | `1.4.2` | `src/config/component-versions.ts` | ✅ Yes |
| **Worker Management** | `1.0.0` | `src/config/component-versions.ts` | ✅ Yes |
| **Dev Server** | `2.1.02` | `src/config/component-versions.ts` | ✅ Yes |
| **Endpoint Checker** | `2.0.0` | `src/config/component-versions.ts` | ❌ No |

### 3. API Endpoint Domain/Scope Versions (15+ domains)

#### Glossary API Endpoints (`domain: 'glossary'`)
- **Term endpoint** (`scope: 'term'`): `v2.1.02`
- **Search endpoint** (`scope: 'search'`): `v2.1.02`
- **Category endpoint** (`scope: 'category'`): `v2.0`
- **Bet-types endpoint** (`scope: 'bet-types'`): `v2.0`
- **Suggestions endpoint** (`scope: 'suggestions'`): `v2.0`
- **Related endpoint** (`scope: 'related'`): `v2.1.02`

#### Gauge API Endpoints (`domain: 'gauge'`)
- **Womens Sports endpoint** (`scope: 'womens-sports'`): `v1.4.2`
- **Multiple response versions**: `v1.4.2`

#### AI API Endpoints (`domain: 'ai'`)
- **Maparse endpoint** (`scope: 'maparse'`): `v1.4.2`
- **Multiple response versions**: `v1.4.2`

#### Validation Endpoints (`domain: 'validate'`)
- **Threshold endpoint** (`scope: 'threshold'`): `v1.4.2`

#### Tension API Endpoints (`domain: 'tension'`)
- **Mapping endpoint** (`scope: 'mapping'`): `v1.6.0` (uses `API_VERSION`)
- **Batch endpoint** (`scope: 'batch'`): `v1.6.0` (uses `API_VERSION`)

#### Spline API Endpoints (`domain: 'spline'`)
- **Render endpoint** (`scope: 'render'`): `v1.0`
- **Predict endpoint** (`scope: 'predict'`): `v1.0`
- **Preset endpoint** (`scope: 'preset'`): `v1.0`

#### Dev API Endpoints (`domain: 'dev'`)
- **Endpoints Check** (`scope: 'endpoints-check'`): `v2.0.0` / `v1.0`
- **Status** (`scope: 'status'`): `v2.1`
- **Colors** (`scope: 'colors'`): `v1.0`
- **Bump Version** (`scope: 'bump-version'`): `v1.0`
- **Bookmakers** (`scope: 'bookmakers'`): `v1.0`
- **Profile** (`scope: 'profile'`): `v1.0`
- **Manifests** (`scope: 'manifests'`): `v1.0`
- **Tiers** (`scope: 'tiers'`): `v1.0`
- **Feature Flags** (`scope: 'feature-flags'`): `v1.0`
- **Feeds** (`scope: 'feeds'`): `v1.0`
- **Shadow WS** (`scope: 'shadow-ws'`): `v1.0`
- **R2** (`scope: 'r2'`): `v1.0`
- **Routing** (`scope: 'routing'`): `v2.1`
- **Event Loop** (`scope: 'event-loop'`): `v1.0`

#### Bet Type Endpoints (`domain: 'bet-type'`)
- **Detection** (`scope: 'detection'`): `v1.0`
- **Stats** (`scope: 'stats'`): `v1.0`

#### System Endpoints (`domain: 'system'`)
- **Lifecycle** (`scope: 'lifecycle'`): `v1.0`
- **Workers** (`scope: 'workers'`): `v1.0`

### 4. CLI Tool Versions (3+)

| Tool | Version | Location |
|------|---------|----------|
| **Edge Mapping CLI** | `v1.6.0` | `scripts/map-edge.ts` |
| **Graph Propagation CLI** | `v1.4.1` | `graph-propagation/cli-absorb.ts` |
| **Static Routes Manifest** | `v1.2.0` | `scripts/static-routes.ts` |

### 5. Documentation Versions (20+)

Multiple documentation files have version numbers:
- `docs/BETTING-GLOSSARY.md`: `v2.1.02`
- `docs/TELEGRAM.md`: `v2.0.0`
- `docs/PRODUCTION-SYSTEM.md`: `v1.2.0`
- `docs/TELEGRAM-CONFIG-TEMPLATE.md`: `v1.8.0`
- `docs/TAGS-REFERENCE.md`: `v1.0.0`
- `docs/INDEX.md`: `v1.1.0`
- `STATUS.md`: `v1.0.0`
- `PORT.md`: `v1.0.0`
- `COMMANDS.md`: `v1.0.0`
- And many more...

## Version Distribution

### By Version Number

| Version | Components | Type |
|--------|------------|------|
| `3.1.0` | Main package | Core |
| `2.1.02` | Betting Glossary, Dev Server | Component |
| `2.0.0` | Endpoint Checker | Component |
| `1.6.0` | Tension API, API_VERSION, Edge Mapping CLI | API |
| `1.4.2` | AI Maparse, Gauge API, Validation | Component |
| `1.4.1` | Graph Propagation CLI | CLI Tool |
| `1.2.0` | Static Routes, Production System docs | Component/Docs |
| `1.0.0` | Worker Management, Spline API, Dev endpoints | Component/API |
| `v1.0` | Many dev/system endpoints | API |

### By Domain

| Domain | Version Count | Versions Used |
|--------|---------------|---------------|
| `glossary` | 6 endpoints | `v2.1.02`, `v2.0` |
| `gauge` | 1 endpoint | `v1.4.2` |
| `ai` | 1 endpoint | `v1.4.2` |
| `validate` | 1 endpoint | `v1.4.2` |
| `tension` | 2 endpoints | `v1.6.0` |
| `spline` | 3 endpoints | `v1.0` |
| `dev` | 15+ endpoints | `v1.0`, `v2.0.0`, `v2.1`, `v2.1.02` |
| `bet-type` | 2 endpoints | `v1.0` |
| `system` | 2 endpoints | `v1.0` |

## Version Management Status

### ✅ Managed by Bump Utility

These versions are updated by `scripts/bump.ts`:
- Main package version (`package.json`)
- Betting Glossary versions (multiple files)
- Dev Server version
- Component versions (`component-versions.ts`)
- Constants (`lib/constants.ts`)

### ⚠️ Not Yet Managed

These versions are **not** currently managed by the bump utility:
- API endpoint domain/scope versions (hardcoded in responses)
- CLI tool versions (in file headers)
- Documentation versions (in doc headers)
- Spline API versions (`v1.0`)
- Most dev API endpoint versions (`v1.0`)

## Version Dependency Graph

**Last Updated:** 2025-12-05  
**Status:** ✅ Validated - Zero warnings, zero errors

### Dependency Structure

The TES versioning system uses a hierarchical dependency model where:

1. **Global Entities** (`global:main`, `global:api-version`) are root nodes
2. **Component Entities** link to global entities
3. **API Scope, CLI Tool, and Documentation Entities** link to their parent components

### Valid Dependency Chains

All dependency chains are **linear** and **terminate at global entities**. This ensures predictable cascading version updates:

#### Chains Terminating at `global:main`:
- `api:glossary` → `component:betting-glossary` → `global:main`
- `api:gauge` → `component:gauge-api` → `global:main`
- `api:ai` → `component:ai-maparse` → `global:main`
- `api:validate` → `component:validation-threshold` → `global:main`
- `api:spline` → `component:spline-api` → `global:main`
- `api:dev` → `component:dev-server` → `global:main`
- `api:system` → `component:worker-management` → `global:main`
- `api:lifecycle` → `component:worker-management` → `global:main`
- `doc:betting-glossary` → `component:betting-glossary` → `global:main`
- `file:betting-glossary-impl` → `component:betting-glossary` → `global:main`
- `file:glossary-template` → `component:betting-glossary` → `global:main`

#### Chains Terminating at `global:api-version`:
- `api:tension` → `component:tension-api` → `global:api-version`
- `cli:map-edge` → `component:tension-api` → `global:api-version`

### Update Strategies

- **`linked-to-parent`**: Entity version cascades from parent (e.g., API scopes follow component versions)
- **`independent`**: Entity version is managed separately (e.g., `global:main` and `global:api-version`)

### Validation Rules

The `VersionRegistryLoader` validates:
- ✅ **No circular dependencies** (ERROR if detected)
- ✅ **All chains terminate at global entities** (WARNING if not)
- ✅ **Valid linear chains** (INFO message for documentation)
- ✅ **No duplicate entity IDs** (ERROR if detected)
- ✅ **All parent references exist** (ERROR if missing)

**Current Status:** ✅ **Zero warnings, zero errors** - All 13 dependency chains validated as valid linear dependencies.

## Recommendations

### High Priority: Add to Bump Utility

1. **API Endpoint Versions** - Many endpoints have hardcoded versions in response metadata
2. **Spline API** - Currently `v1.0`, should be versioned independently
3. **CLI Tools** - Edge Mapping, Graph Propagation should be versioned

### Medium Priority: Standardize

1. **Dev API Endpoints** - Many use `v1.0`, consider grouping by feature
2. **Documentation Versions** - Consider auto-incrementing on changes
3. **Endpoint Checker** - Should be displayed in UI

### Low Priority: Monitor

1. **System Endpoints** - Track version changes
2. **Bet Type Endpoints** - Monitor for version bumps

## Version Display Coverage

### Currently Displayed in UI ✅
- Enhanced Betting Glossary: `(v2.1.02)`
- WNBATOR Gauge: `(v1.4.2)`
- AI Maparse: `(v1.4.2)`
- Worker API: `(v1.0.0)`
- Tension Mapping: `(v1.6.0)`

### Not Yet Displayed ❌
- Endpoint Checker: `v2.0.0`
- Spline API: `v1.0`
- Validation Threshold: `v1.4.2`
- Edge Mapping CLI: `v1.6.0`
- Graph Propagation CLI: `v1.4.1`

## Next Steps

1. **Add missing components to `component-versions.ts`**
2. **Update `version-files.ts` to include API endpoint versions**
3. **Add version displays to dashboard for all major components**
4. **Create version consistency checker**
5. **Document versioning strategy per component**

