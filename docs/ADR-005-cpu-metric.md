# ADR-005: CPU Metric Standardization

**Status**: Accepted  
**Date**: 2025-11-11  
**Deciders**: TES Operations Team  
**Tags**: `TES-OPS-004-B-8.14`, `monitoring`, `metrics`, `cpu`

## Context

The CPU metric in the system status API (`/api/dev/status`) was returning values in microseconds rather than a standardized percentage (0-100). This caused:

1. **Inconsistent Display**: Dashboard components couldn't reliably display CPU usage
2. **Monitoring Integration Issues**: TES-MON-005 telemetry collection expected percentage values
3. **Developer Confusion**: Values like `1277180.3` were unclear without context
4. **Test Failures**: Unit tests expected percentage range validation

## Decision

We will standardize the CPU metric to return a percentage value between 0-100 with 1 decimal precision, calculated using delta sampling between function calls.

### Implementation Details

1. **Refactored `getCpuLoad()` function**:
   - Moved to `src/lib/status-aggregator.ts` for reusability
   - Uses `process.cpuUsage()` with delta sampling
   - Calculates percentage: `(CPU time / elapsed time) * 100`
   - Rounds to 1 decimal place using `toFixed(1)`
   - Caps values at 100% maximum
   - Includes runtime validation (throws error if value < 0 or > 100)

2. **Delta Sampling Algorithm**:
   ```typescript
   // Track previous measurement
   let previousCpuUsage: NodeJS.CpuUsage | null = null;
   let previousCpuTime: number = Date.now();
   
   // On each call:
   const currentUsage = process.cpuUsage(previousCpuUsage || undefined);
   const timeElapsed = (Date.now() - previousCpuTime) * 1000; // microseconds
   const totalMicroseconds = currentUsage.user + currentUsage.system;
   const percentage = (totalMicroseconds / timeElapsed) * 100;
   ```

3. **API Response Format**:
   ```json
   {
     "vector": {
       "others": {
         "cpu": 12.5  // Percentage (0-100), 1 decimal place
       }
     }
   }
   ```

## Consequences

### Positive

- ✅ **Consistent API**: All consumers receive percentage values
- ✅ **Dashboard Compatibility**: Status panel displays correctly with `%` suffix
- ✅ **Monitoring Integration**: TES-MON-005 can consume values directly
- ✅ **Test Coverage**: Unit tests validate range and precision
- ✅ **Developer Experience**: Clear, intuitive values (e.g., `45.2%`)

### Negative

- ⚠️ **Breaking Change**: Existing consumers expecting microseconds need updates
- ⚠️ **First Call Returns 0**: Initial call returns `0` (no previous measurement)
- ⚠️ **Precision Loss**: Reduced from 9 decimal places to 1 (acceptable trade-off)

### Mitigations

- **Backward Compatibility**: Documented in API changelog
- **First Call Handling**: Dashboard handles `0` gracefully
- **Precision**: 1 decimal place sufficient for monitoring use cases

## Implementation Checklist

- [x] Code updated: `getCpuLoad()` refactored to async delta sampling
- [x] Tests passing: Unit tests validate 0-100 range
- [x] API validated: `curl` returns percentage value
- [x] Dashboard updated: Status panel displays correctly
- [x] Telemetry verified: TES-MON-005 receives valid CPU values
- [x] Documentation: ADR-005-cpu-metric.md created

## References

- **Issue**: TES-OPS-004-B-8.14
- **API Endpoint**: `GET /api/dev/status`
- **Implementation**: `src/lib/status-aggregator.ts`
- **Tests**: `test/getCpuLoad.test.ts`
- **Dashboard Component**: `src/dashboard/components/system-status.ts`
- **Monitoring Standard**: TES-MON-005

## Related ADRs

- ADR-004: Enhanced Status System (vector format)
- ADR-003: Telemetry Architecture

---

**Approved by**: TES Operations Team  
**Implementation Date**: 2025-11-11  
**Review Date**: 2026-11-11

