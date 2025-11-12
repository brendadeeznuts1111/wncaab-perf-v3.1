# TES-OPS-004.B.3: Bump.ts Refactor Preparation - Escaped rg-Infused Audits

**Status:** 🎯 **READY FOR REFACTOR**  
**Date:** 2025-11-12  
**Key:** TES-OPS-004.B.3  
**Prerequisite:** TES-OPS-004.B.2.A.9 ✅ COMPLETE

## Executive Summary

**Objective:** Refactor `scripts/bump.ts` to use standardized `logTESEvent` from `lib/production-utils.ts` with escaped bracket metadata keys, ensuring all bump operations are rg-queryable with thread/channel context.

## Current State Analysis

### Existing `logTESEvent` in `bump.ts` (Lines 61-97)

**Issues Identified:**
1. ❌ Custom implementation (duplicates `lib/production-utils.ts`)
2. ❌ Uses unescaped brackets in JSON keys: `[VERSION]`, `[BUMP_TRANSACTION_ID]`, etc.
3. ❌ Missing thread/channel context (no HSL mapping)
4. ❌ Writes to separate log file (`logs/version-bumps.log`)
5. ❌ No integration with TES thread architecture

**Current Format:**
```typescript
const logEntry = {
  '[VERSION]': '[BUMP_TRANSACTION]',           // ❌ Unescaped
  '[BUMP_TRANSACTION_ID]': transactionId,      // ❌ Unescaped
  '[TYPE]': bumpType.toUpperCase(),            // ❌ Unescaped
  '[ENTITY_ID]': entityId || 'global:main',    // ❌ Unescaped
  '[STATUS]': status,                          // ❌ Unescaped
  '[ENTITY_BUMPED]': entityBumps.map(...),    // ❌ Unescaped
  '[USER]': user,
  '[TS]': timestamp,
};
```

**rg Query Impact:**
```bash
# Current (won't work reliably)
rg '"[VERSION]":\s*"\[BUMP_TRANSACTION\]"' logs/version-bumps.log
# ❌ Character class interpretation issues
```

## Refactor Requirements

### 1. Replace Custom `logTESEvent` with Standardized Version

**Action:** Import and use `logTESEvent` from `lib/production-utils.ts`

**Before:**
```typescript
async function logTESEvent(...) { /* custom implementation */ }
```

**After:**
```typescript
import { logTESEvent, TESLogContext } from '../lib/production-utils.ts';
```

### 2. Add Thread/Channel Context

**Thread Group Mapping:**
- **VERSION_MANAGEMENT** (new thread group)
- Thread ID: `0x6001` (Version Management range: 0x6000-0x6FFF)
- Channel: `COMMAND_CHANNEL` (bump is a command operation)
- HSL: `#FF6B35` (Orange-red for version operations)

**Context Object:**
```typescript
const context: TESLogContext = {
  threadGroup: 'VERSION_MANAGEMENT',
  threadId: '0x6001',
  channel: 'COMMAND_CHANNEL',
};
```

### 3. Use Escaped Bracket Metadata Keys

**Standardized Keys:**
```typescript
await logTESEvent('bump:transaction:success', {
  '[BUMP_TRANSACTION_ID]': transactionId,      // ✅ Escaped in JSON
  '[BUMP_TYPE]': bumpType.toUpperCase(),
  '[ENTITY_ID]': entityId || 'global:main',
  '[AFFECTED_ENTITIES]': transaction.affectedEntities.length,
  '[FILES_CHANGED]': transaction.fileChanges.length,
  '[TOTAL_MATCHES]': totalMatches,
  '[STATUS]': status,
  ...(status === 'FAILURE' && errorDetails ? { '[ERROR_DETAILS]': errorDetails } : {}),
}, context);
```

**rg Query (Will Work):**
```bash
rg '"\[BUMP_TRANSACTION_ID\]":\s*"[^"]+"' logs/worker-events.log
rg '"\[THREAD_GROUP\]":\s*"VERSION_MANAGEMENT"' logs/worker-events.log
rg '"\[THREAD_ID\]":\s*"0x6001"' logs/worker-events.log
```

### 4. Consolidate Log Files

**Action:** Remove separate `logs/version-bumps.log`, use unified `logs/worker-events.log`

**Benefits:**
- Single source of truth for all TES events
- Unified rg queries across all operations
- Consistent log format

### 5. Add Logging Points

**Key Operations to Log:**
1. **Transaction Start** - `bump:transaction:start`
2. **Entity Preparation** - `bump:entity:prepare`
3. **File Changes Prepared** - `bump:files:prepared`
4. **Transaction Committed** - `bump:transaction:committed`
5. **Transaction Rolled Back** - `bump:transaction:rolled_back`
6. **Transaction Failed** - `bump:transaction:failed`

## Implementation Plan

### Phase 1: Import Standardized Logging
```typescript
import { logTESEvent, TESLogContext } from '../lib/production-utils.ts';
```

### Phase 2: Define Thread Context
```typescript
const BUMP_CONTEXT: TESLogContext = {
  threadGroup: 'VERSION_MANAGEMENT',
  threadId: '0x6001',
  channel: 'COMMAND_CHANNEL',
};
```

### Phase 3: Replace All `logTESEvent` Calls
- Remove custom `logTESEvent` function (lines 61-97)
- Update all calls to use standardized version
- Add context parameter to all calls

### Phase 4: Update Log File Path
- Change from `logs/version-bumps.log` to `logs/worker-events.log`
- Remove file path from `logTESEvent` calls (handled by standard function)

### Phase 5: Add Logging Points
- Transaction start (line ~659)
- Entity preparation (line ~800)
- File changes prepared (line ~825)
- Transaction committed (line ~844)
- Error handling (catch blocks)

## Expected rg Queries After Refactor

```bash
# Find all bump transactions
rg '"\[TES_EVENT\]":\s*"bump:transaction:success"' logs/worker-events.log

# Find version management operations
rg '"\[THREAD_GROUP\]":\s*"VERSION_MANAGEMENT"' logs/worker-events.log

# Find specific transaction
rg '"\[BUMP_TRANSACTION_ID\]":\s*"<uuid>"' logs/worker-events.log

# Find failed bumps
rg '"\[TES_EVENT\]":\s*"bump:transaction:failed"' logs/worker-events.log --context=5

# Find entity-specific bumps
rg '"\[ENTITY_ID\]":\s*"api:bet-type"' logs/worker-events.log

# Count total bumps
rg '"\[THREAD_ID\]":\s*"0x6001"' logs/worker-events.log --stats
```

## Thread Architecture Integration

### New Thread Group: VERSION_MANAGEMENT

**Thread ID Range:** 0x6000-0x6FFF (External Services / Operations)

**Mapping:**
- `0x6001` - Version Bump Operations
- `0x6002` - Version Rollback Operations (future)
- `0x6003` - Version Validation (future)

**HSL Color:** `#FF6B35` (Orange-red)

**Channel:** `COMMAND_CHANNEL` (bump is a command-line operation)

## Validation Checklist

- [ ] Custom `logTESEvent` removed
- [ ] Standardized `logTESEvent` imported
- [ ] Thread context defined and used
- [ ] All metadata keys use escaped brackets
- [ ] Log file changed to `worker-events.log`
- [ ] All logging points added
- [ ] rg queries tested and validated
- [ ] Documentation updated

## Related Documentation

- `docs/RG-PATTERN-ANALYSIS.md` - Escaped bracket patterns
- `docs/RG-QUERY-EXAMPLES.md` - Query reference
- `lib/production-utils.ts` - Standardized logging function
- `docs/TES-OPS-004-B-2-A-9-COMPLETE.md` - Prerequisite completion

## Next Steps

1. ✅ **TES-OPS-004.B.2.A.9: COMPLETE** - Escaped patterns established
2. 🎯 **TES-OPS-004.B.3: READY** - Refactor `bump.ts` with escaped rg-infused audits
3. 🔄 **TES-OPS-004.B.4: PENDING** - Atomic file transaction (after B.3)

[TYPE: REFACTOR-READY] – Escaped Patterns Established; Thread Architecture Mapped; Ready for Precision-Crisp Cascades.

**Status:** 🎯 **READY FOR IMPLEMENTATION**

