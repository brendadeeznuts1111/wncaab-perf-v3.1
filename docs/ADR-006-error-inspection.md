# ADR-006: Bun Error Inspection for Operational Debugging

**Status**: Accepted  
**Date**: 2025-01-XX  
**Deciders**: TES Operations Team  
**Tags**: `TES-OPS-004-B-8.15`, `error-handling`, `observability`, `bun`, `debugging`

## Context

When operational errors occur in the TES dev server (CPU metric failures, status API errors, WebSocket failures), developers see minimal error context:

```bash
TES-ERROR: Invalid CPU value: 1258940.2
at getCpuLoad (src/lib/status-aggregator.ts:42:13)
```

**Problems**:
1. **No Source Context**: Developers must manually open files to understand errors
2. **No Syntax Highlighting**: Plain text errors are hard to scan
3. **No Operational Context**: Missing route, worker ID, session ID, or metrics
4. **No Telemetry**: Errors aren't logged for analysis
5. **Poor Dashboard UX**: Errors displayed as plain text without formatting

## Decision

We will integrate Bun's native `Bun.inspect(error, {colors: true})` for **syntax-highlighted error previews** throughout the TES error handling system. This provides instant source context for unhandled exceptions, CPU metric failures, and WebSocket errors—directly in logs and the operational dashboard.

### Implementation Details

1. **Created `tes-error-inspector.ts` utility**:
   - `inspectTESError()`: Wraps `Bun.inspect()` with TES-specific formatting
   - `logTESError()`: Logs errors with telemetry integration
   - Adds operational context (route, workerId, sessionId, metrics)
   - Uses Bun's native syntax highlighting

2. **Error Inspector Features**:
   ```typescript
   export function inspectTESError(error: unknown, context: ErrorContext = {}): string {
     const errorObj = error instanceof Error ? error : new Error(String(error));
     
     // Add TES operational context
     if (context.route) {
       errorObj.message = `[${context.route}] ${errorObj.message}`;
     }
     
     // Use Bun's native inspect for syntax highlighting
     return Bun.inspect(errorObj, {
       colors: true,          // Syntax highlighting
       depth: 5,              // Deep object inspection
       showHidden: false,     // Don't show internals
       showProxy: false       // Clean output
     });
   }
   ```

3. **Integration Points**:
   - ✅ `getCpuLoad()`: Enhanced validation error logging
   - ✅ `handleStatusRoute()`: Syntax-highlighted error responses
   - ✅ `TmuxControlPanel`: Error display with context
   - ✅ WebSocket handlers: Full error context in messages
   - ✅ Error telemetry endpoint: Structured error logging

4. **Error Telemetry**:
   - `POST /api/dev/telemetry/error`: Logs errors to `.tes/logs/errors.jsonl`
   - `GET /api/dev/telemetry/errors`: Retrieves recent error logs
   - JSONL format for easy parsing and analysis

5. **Dashboard Integration**:
   - `<error-viewer-modal>`: Web component for displaying errors
   - Copy-to-clipboard functionality
   - Syntax-highlighted error preview
   - Telemetry data display

## Consequences

### Positive

- ✅ **Instant Source Context**: Developers see syntax-highlighted errors with file/line references
- ✅ **Operational Visibility**: Errors include route, worker ID, session ID, and metrics
- ✅ **Better Debugging**: No need to manually open files to understand errors
- ✅ **Telemetry Integration**: All errors logged for analysis
- ✅ **Dashboard UX**: Errors displayed with formatting and context
- ✅ **Zero Overhead**: Uses Bun's native inspection (no external dependencies)

### Negative

- ⚠️ **Color Codes in Logs**: Terminal colors may not render in all log viewers
- ⚠️ **Larger Error Messages**: More verbose output (acceptable trade-off)
- ⚠️ **Telemetry Dependency**: Requires telemetry endpoint to be available (fails gracefully)

### Mitigations

- **Color Codes**: Bun.inspect detects TTY and disables colors when appropriate
- **Verbose Output**: Errors are only shown when they occur (not in normal operation)
- **Telemetry**: Non-blocking fetch with graceful failure handling

## Implementation Checklist

- [x] `tes-error-inspector.ts` created with `inspectTESError` and `logTESError`
- [x] `getCpuLoad()` refactored to use error inspector on validation failure
- [x] `handleGetStatus()` enhanced with syntax-highlighted error responses
- [x] Tmux control panel shows source previews on spawn failures
- [x] WebSocket errors include full context and stack traces
- [x] Error telemetry endpoint logs structured errors to `.tes/logs/errors.jsonl`
- [x] Dashboard modal displays inspectable errors with copy-to-clipboard
- [x] Unit tests verify error context inclusion
- [x] ADR-006-error-inspection.md documents the pattern

## References

- **Issue**: TES-OPS-004.B.8.15
- **Implementation**: `src/lib/tes-error-inspector.ts`
- **Tests**: `test/unit/error-inspector.test.ts`
- **Telemetry**: `src/routes/dev/telemetry.ts`
- **Dashboard Component**: `src/dashboard/components/error-viewer.ts`

## Related ADRs

- ADR-005: CPU Metric Standardization (error handling integration)
- ADR-004: Enhanced Status System (error responses)

## Example Output

### Before: Useless Error
```
TES-ERROR: Invalid CPU value: 1258940.2
```

### After: Actionable Error
```
[TES-ERROR] CPU metric validation failed
48 |   const value = await sampleCpuLoad();
49 |   if (value < 0 || value > 100) {
50 |     throw new Error(`Invalid CPU value: ${value}`);
                       ^ error: Invalid CPU value: 1258940.2
Context:
{
  "route": "/api/dev/status",
  "metrics": { "rawValue": 1258940.2 }
}
at sampleCpuLoad (src/lib/status-aggregator.ts:50:23)
at async getCpuLoad (src/lib/status-aggregator.ts:48:16)
```

---

**Approved by**: TES Operations Team  
**Implementation Date**: 2025-01-XX  
**Review Date**: 2026-01-XX

