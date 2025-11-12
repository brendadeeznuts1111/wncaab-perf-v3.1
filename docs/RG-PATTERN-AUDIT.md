# TES-OPS-004.B.2.A.9: rg Query Pattern Audit - Existing Usage Review

**Status:** ✅ **AUDIT COMPLETE**  
**Date:** 2025-11-12  
**Key:** TES-OPS-004.B.2.A.9

## Executive Summary

Comprehensive audit of existing `rg` query patterns across TES codebase reveals **two distinct log formats** requiring different bracket escaping strategies:

1. **JSON Log Format** (`logs/worker-events.log`) - Requires escaped brackets `\[...\]` for JSON keys
2. **Text Log Format** (`logs/headers-index.log`) - Uses brackets as literal text markers (may or may not need escaping depending on context)

## Audit Results

### ✅ Correctly Using Escaped Brackets (JSON Format)

**Files:** All documentation and validation scripts for `worker-events.log`

**Patterns Found:**
- `docs/RG-QUERY-EXAMPLES.md` - ✅ All patterns correctly escaped
- `docs/RG-AUDITING.md` - ✅ All patterns correctly escaped  
- `docs/TES-OPS-004-B-2-A-8-LOGGING-POINTS-TABLE.md` - ✅ All patterns correctly escaped
- `scripts/validate-rg-queries.ts` - ✅ All patterns correctly escaped

**Example:**
```bash
rg '"\[CHANNEL\]":\s*"DATA_CHANNEL"' logs/worker-events.log
```

### ⚠️ Using Unescaped Brackets (Text Format - Context Dependent)

**Files:** Scripts querying `headers-index.log` (different log format, created at runtime)

**Patterns Found:**
- `scripts/verify-secrets.ts` - ✅ **UPDATED** Now uses `rg "\[SECRETS_UPGRADE_V2\]"` (escaped)
- `scripts/verify-restart.sh` - Uses `rg "\[STEAM_DETECTED\]"` (already escaped!)
- `scripts/audit-tes-ngws-001.12c.sh` - Uses `rg "\[TES-NGWS-001.12c\]"` (already escaped!)
- `watch-steam-detections.sh` - Uses `rg "\[STEAM_DETECTED\]"` (already escaped!)

**Analysis:**
- These scripts query `headers-index.log` which uses a **text-based format** (not JSON)
- **Note:** `headers-index.log` is created dynamically at runtime - may not exist until application runs
- Patterns like `[STEAM_DETECTED]` are **literal text markers** in the log lines
- Most scripts already escape brackets correctly
- **Status:** ✅ All scripts now use escaped brackets for consistency

## Log Format Comparison

### JSON Format (`logs/worker-events.log`)
**Status:** ✅ File exists (created by `logTESEvent` in `lib/production-utils.ts`)

```json
{
  "[CHANNEL]": "DATA_CHANNEL",
  "[THREAD_GROUP]": "API_GATEWAY"
}
```
**Requires:** Escaped brackets `\[CHANNEL\]` to match JSON keys

### Text Format (`logs/headers-index.log`)
**Status:** ⚠️ Created dynamically at runtime (may not exist until first log write)

**Format:**
```
[HEADERS_BLOCK_START:v1]{event:STEAM_DETECTED}~[STEAM_DETECTED][nowgoal26.com]...
```

**Requires:** Escaped brackets `\[STEAM_DETECTED\]` for literal matching (recommended for consistency)

**Note:** This file is created by various logging functions:
- `src/lib/security-audit.ts` - `logHeadersForRg()`
- `src/lib/lifecycle-security-audit.ts` - `logHeadersForRg()`
- `src/lib/telegram-alert-system.ts` - `logHeadersForRg()`
- `src/lib/nowgoal-websocket.ts` - `logWebSocketEvent()`
- And others...

The file is created automatically when these functions are called, so queries may return "file not found" until the application runs.

## Recommendations

### 1. Standardize on Escaped Brackets (All Formats)

**Action:** Update all `rg` queries to use escaped brackets for consistency:

```bash
# Before (inconsistent)
rg "[SECRETS_UPGRADE_V2]" logs/headers-index.log

# After (consistent)
rg "\[SECRETS_UPGRADE_V2\]" logs/headers-index.log
```

### 2. Update Scripts

**Files to Update:**
- `scripts/verify-secrets.ts` - Lines 63, 65, 67, 69

**Changes:**
```typescript
// Before
console.log('  rg "[SECRETS_UPGRADE_V2]" logs/headers-index.log | wc -l');
console.log('  rg "[FALLBACK_TO_ENV]" logs/headers-index.log');
console.log('  rg "[TOKEN_CONFIG_MISSING]" logs/headers-index.log');

// After
console.log('  rg "\\[SECRETS_UPGRADE_V2\\]" logs/headers-index.log | wc -l');
console.log('  rg "\\[FALLBACK_TO_ENV\\]" logs/headers-index.log');
console.log('  rg "\\[TOKEN_CONFIG_MISSING\\]" logs/headers-index.log');
```

### 3. Documentation Updates

**Action:** Add note to `docs/RG-PATTERN-ANALYSIS.md` clarifying:
- JSON format requires escaped brackets
- Text format should also use escaped brackets for consistency
- Both formats benefit from escaped brackets for reliable matching

## Files Requiring Updates

| File | Lines | Current Pattern | Recommended Pattern | Status |
|------|-------|----------------|---------------------|--------|
| `scripts/verify-secrets.ts` | 63, 65, 67, 69 | `"\\[SECRETS_UPGRADE_V2\\]"` | ✅ Updated | ✅ **COMPLETE** |
| `scripts/verify-restart.sh` | 35, 40 | `"\[STEAM_DETECTED\]"` | ✅ Already correct | ✅ OK |
| `scripts/audit-tes-ngws-001.12c.sh` | 21, 25, 31, 42, 49, 58 | `"\[TES-NGWS-001.12c\]"` | ✅ Already correct | ✅ OK |
| `watch-steam-detections.sh` | 20 | `"\[STEAM_DETECTED\]"` | ✅ Already correct | ✅ OK |

**Note:** `headers-index.log` is created dynamically at runtime. Scripts referencing it will work once the application runs and creates the file.

## Best Practices Established

1. **Always escape brackets** in `rg` patterns for metadata tags:
   - JSON keys: `\[CHANNEL\]`, `\[THREAD_GROUP\]`, `\[THREAD_ID\]`
   - Text markers: `\[STEAM_DETECTED\]`, `\[SECRETS_UPGRADE_V2\]`

2. **Consistent pattern across all log formats:**
   - Escaped brackets work for both JSON and text formats
   - Prevents character class misinterpretation
   - Ensures reliable matching

3. **Documentation reference:**
   - See `docs/RG-PATTERN-ANALYSIS.md` for detailed explanation
   - See `docs/RG-QUERY-EXAMPLES.md` for working examples

## Next Steps

1. ✅ **TES-OPS-004.B.2.A.9: COMPLETE** - Pattern analysis documented
2. 🔄 **Update `scripts/verify-secrets.ts`** - Standardize bracket escaping
3. 🎯 **TES-OPS-004.B.3 (Bump.ts Refactor)** - Ensure all new logging uses escaped brackets
4. 🎯 **TES-OPS-004.B.4 (Atomic File Transaction)** - Apply escaped bracket pattern to new logging

## Related Documentation

- `docs/RG-PATTERN-ANALYSIS.md` - Escaped vs unescaped pattern analysis
- `docs/RG-QUERY-EXAMPLES.md` - Complete rg query reference
- `docs/RG-AUDITING.md` - Validated query patterns
- `docs/TES-OPS-004-B-2-A-9-VALIDATION-REPORT.md` - Validation results

[TYPE: RG-AUDIT-COMPLETE] – Existing Patterns Reviewed; Consistency Standard Established; Ready for Bump.ts Integration.

