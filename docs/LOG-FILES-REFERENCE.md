# TES Log Files Reference

**Status:** ✅ **DOCUMENTED**  
**Date:** 2025-11-12

## Log File Overview

TES uses two primary log file formats for different purposes:

### 1. `logs/worker-events.log` (JSON Format)

**Status:** ✅ File exists (created by `logTESEvent`)

**Format:** JSON objects with escaped bracket keys
```json
{
  "[TES_EVENT]": "worker:assigned",
  "[THREAD_GROUP]": "WORKER_POOL",
  "[THREAD_ID]": "0x3001",
  "[CHANNEL]": "COMMAND_CHANNEL",
  "[HSL]": "#FF006E",
  "[SIGNED]": "uuid-..."
}
```

**Created By:**
- `lib/production-utils.ts` - `logTESEvent()` function

**rg Query Pattern:**
```bash
rg '"\[CHANNEL\]":\s*"DATA_CHANNEL"' logs/worker-events.log
```

**Note:** Always use escaped brackets `\[...\]` for JSON keys.

### 2. `logs/headers-index.log` (Text Format)

**Status:** ⚠️ Created dynamically at runtime (may not exist until first log write)

**Format:** Text-based rg-compatible blocks
```
[HEADERS_BLOCK_START:v1]{event:STEAM_DETECTED}~[STEAM_DETECTED][nowgoal26.com][DETECTION]...
```

**Created By:**
- `src/lib/security-audit.ts` - `logHeadersForRg()`
- `src/lib/lifecycle-security-audit.ts` - `logHeadersForRg()`
- `src/lib/telegram-alert-system.ts` - `logHeadersForRg()`
- `src/lib/telegram-alert-system-v2.ts` - `logRgMetadataToFile()`
- `src/lib/nowgoal-websocket.ts` - `logWebSocketEvent()`
- `src/lib/alert-system.ts` - `logAlert()`
- `src/lib/steam-pattern-analyzer.ts` - `logHeadersForRg()`
- `src/lib/nowgoal-xml-parser.ts` - `logHeadersForRg()`
- `src/lib/nowgoal-jwt-acquisition.ts` - `logHeaderForRg()`
- `src/lib/jwt-extractor.ts` - `logHeadersForRg()`
- `src/lib/csrf-guard.ts` - `logHeadersForRg()`
- `src/lib/cookie-factory.ts` - `logHeadersForRg()`

**rg Query Pattern:**
```bash
rg "\[STEAM_DETECTED\]" logs/headers-index.log
```

**Note:** Use escaped brackets `\[...\]` for consistency, even though text format may work without escaping in some cases.

## File Creation Behavior

### `worker-events.log`
- Created immediately when `logTESEvent()` is called
- Uses `Bun.write()` with `createPath: true`
- Always exists after first log call

### `headers-index.log`
- Created dynamically when any `logHeadersForRg()` function is called
- Uses `Bun.write()` with `createPath: true, flag: "a"` (append mode)
- May not exist until application runs
- Scripts referencing it should handle "file not found" gracefully

## Query Best Practices

### For JSON Format (`worker-events.log`)
```bash
# Always escape brackets for JSON keys
rg '"\[CHANNEL\]":\s*"DATA_CHANNEL"' logs/worker-events.log
rg '"\[THREAD_GROUP\]":\s*"API_GATEWAY"' logs/worker-events.log
```

### For Text Format (`headers-index.log`)
```bash
# Use escaped brackets for consistency
rg "\[STEAM_DETECTED\]" logs/headers-index.log
rg "\[SECRETS_UPGRADE_V2\]" logs/headers-index.log

# Handle file not found gracefully
rg "\[STEAM_DETECTED\]" logs/headers-index.log 2>/dev/null || echo "File not created yet"
```

## Verification

```bash
# Check if files exist
ls -la logs/*.log

# Test worker-events.log (should exist)
rg '"\[CHANNEL\]":\s*"DATA_CHANNEL"' logs/worker-events.log --stats

# Test headers-index.log (may not exist until runtime)
rg "\[STEAM_DETECTED\]" logs/headers-index.log --stats 2>/dev/null || echo "File created at runtime"
```

## Related Documentation

- `docs/RG-PATTERN-ANALYSIS.md` - Escaped vs unescaped bracket patterns
- `docs/RG-QUERY-EXAMPLES.md` - Complete query reference
- `docs/RG-PATTERN-AUDIT.md` - Existing usage audit

[TYPE: LOG-FILE-REFERENCE] – File Formats Documented; Creation Behavior Clarified; Query Patterns Standardized.

