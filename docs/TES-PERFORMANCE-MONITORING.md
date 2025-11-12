# TES Performance Monitoring - Usage Guide

## Overview

Performance monitoring has been integrated into the TESRenderer module to track four key metrics:

| Metric                  | Target                  | How to Measure                                              |
| ----------------------- | ----------------------- | ----------------------------------------------------------- |
| **Initial Render Time** | < 200ms for 50 entities | `performance.mark()` before/after `renderGroupedEntities`   |
| **Layout Shifts**       | 0                       | Chrome DevTools "Layout Shift Regions"                      |
| **Memory Leaks**        | 0                       | Chrome Memory Profiler (take heap snapshot after re-render) |
| **Accessibility Score** | 100                     | axe DevTools or Lighthouse CI                               |

## Implementation Details

### 1. Initial Render Time Measurement

**How it works:**
- Uses `performance.mark()` and `performance.measure()` API
- Automatically measures render time for each `renderEntities()` call
- Logs warnings if render time exceeds 200ms target

**Usage:**
```javascript
// Automatically measured when calling renderEntities()
TESRenderer.renderEntities(entities, container);

// Access metrics
const metrics = TESRenderer.getPerformanceMetrics();
console.log('Average render time:', metrics.summary.averageRenderTime);
```

**Console Output:**
```
[TESPerformance] Render time: 145.23ms for 50 entities ✓
// or
[TESPerformance] Render time exceeded target: 234.56ms for 50 entities (target: <200ms)
```

### 2. Layout Shift Monitoring

**How it works:**
- Uses `PerformanceObserver` API to monitor layout-shift events
- Automatically starts on page load
- Tracks all layout shifts with timestamps and sources

**Usage:**
```javascript
// Automatically started on page load
// Access layout shifts
const metrics = TESRenderer.getPerformanceMetrics();
console.log('Total layout shifts:', metrics.summary.totalLayoutShifts);
console.log('Layout shift details:', metrics.layoutShifts);
```

**Console Output:**
```
[TESPerformance] Layout shift detected: 0.0234 (target: 0)
```

**Chrome DevTools:**
- Open DevTools → Performance tab
- Record a session
- Check "Layout Shift Regions" visualization
- Target: 0 layout shifts

### 3. Memory Leak Detection

**How it works:**
- Takes heap snapshots before and after render
- Compares memory usage to detect leaks
- Threshold: >10% heap growth suggests potential leak

**Usage:**
```javascript
// Automatically measured during renderEntities()
// Access memory leak detection
const metrics = TESRenderer.getPerformanceMetrics();
console.log('Memory leaks detected:', metrics.summary.memoryLeaksDetected);

// Manual snapshot
const snapshot = TESPerformanceMonitor.takeMemorySnapshot('custom-label');

// Compare snapshots
const leakDetection = TESPerformanceMonitor.detectMemoryLeaks(snapshot1, snapshot2);
```

**Console Output:**
```
[TESPerformance] Potential memory leak detected: 12.34% heap growth
```

**Chrome Memory Profiler:**
1. Open DevTools → Memory tab
2. Take heap snapshot before render
3. Trigger render
4. Take heap snapshot after render
5. Compare snapshots
6. Target: No significant heap growth

### 4. Accessibility Score Checking

**How it works:**
- Uses axe-core library if available (comprehensive audit)
- Falls back to basic manual checks if axe-core not loaded
- Checks for ARIA attributes, semantic HTML, button types

**Usage:**
```javascript
// Automatically checked after renderEntities()
// Access accessibility score
const metrics = TESRenderer.getPerformanceMetrics();
console.log('Accessibility score:', metrics.summary.accessibilityScore);

// Manual check
const score = await TESPerformanceMonitor.checkAccessibilityScore(container);
```

**Console Output:**
```
[TESPerformance] Accessibility score: 100/100 ✓
// or
[TESPerformance] Accessibility score: 85/100 (2 violations)
```

**Setup axe-core (for comprehensive audit):**
```html
<script src="https://cdn.jsdelivr.net/npm/axe-core@4.8.0/axe.min.js"></script>
```

**Lighthouse CI:**
```bash
# Run Lighthouse CI
npx lighthouse http://localhost:3000 --only-categories=accessibility
# Target: 100 accessibility score
```

## Accessing All Metrics

```javascript
// Get all performance metrics
const metrics = TESRenderer.getPerformanceMetrics();

console.log('Performance Summary:', {
  averageRenderTime: metrics.summary.averageRenderTime,
  totalLayoutShifts: metrics.summary.totalLayoutShifts,
  memoryLeaksDetected: metrics.summary.memoryLeaksDetected,
  accessibilityScore: metrics.summary.accessibilityScore,
});

// Detailed metrics
console.log('Render times:', metrics.renderTimes);
console.log('Layout shifts:', metrics.layoutShifts);
console.log('Memory snapshots:', metrics.memorySnapshots);
console.log('Accessibility score:', metrics.accessibilityScore);
```

## Resetting Metrics

```javascript
// Reset all metrics
TESRenderer.resetPerformanceMetrics();
```

## Integration with Testing

```javascript
// Example: Performance test
describe('TESRenderer Performance', () => {
  it('should render 50 entities in <200ms', () => {
    TESRenderer.resetPerformanceMetrics();
    TESRenderer.renderEntities(entities, container);
    
    const metrics = TESRenderer.getPerformanceMetrics();
    const lastRender = metrics.renderTimes[metrics.renderTimes.length - 1];
    
    expect(lastRender.duration).toBeLessThan(200);
    expect(lastRender.passed).toBe(true);
  });
  
  it('should have 0 layout shifts', () => {
    TESRenderer.resetPerformanceMetrics();
    TESRenderer.renderEntities(entities, container);
    
    const metrics = TESRenderer.getPerformanceMetrics();
    expect(metrics.summary.totalLayoutShifts).toBe(0);
  });
  
  it('should have 100 accessibility score', async () => {
    TESRenderer.resetPerformanceMetrics();
    TESRenderer.renderEntities(entities, container);
    
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for async check
    const metrics = TESRenderer.getPerformanceMetrics();
    
    expect(metrics.summary.accessibilityScore).toBe(100);
  });
});
```

## Browser Compatibility

- **Performance API**: Supported in all modern browsers
- **PerformanceObserver**: Supported in Chrome 52+, Firefox 57+, Safari 11+
- **performance.memory**: Chrome only (for memory leak detection)
- **axe-core**: Requires manual inclusion for comprehensive accessibility checks

## Notes

- Layout shift monitoring starts automatically on page load
- Memory snapshots are Chrome-only (uses `performance.memory`)
- Accessibility checks run asynchronously and don't block rendering
- All metrics are logged to console for debugging
- Metrics persist until explicitly reset

