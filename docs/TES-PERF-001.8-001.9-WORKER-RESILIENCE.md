# Worker Error Handling & Resilience - TES-PERF-001.8

**Status**: ✅ **IMPLEMENTED**  
**Version**: v3.1  
**Date**: December 2024

---

## 🎯 Overview

Enhanced worker management system with comprehensive error handling, automatic respawn with exponential backoff, graceful shutdown, and event loop monitoring.

---

## 📋 Features

### **1. Worker Error Handling**

**TES-PERF-001.8**: Implement `worker.onerror` and `worker.on('error')` handlers

- **Dual Error Handlers**: Both `worker.onerror` and `worker.addEventListener('error')` are implemented for maximum compatibility
- **Error Logging**: All worker errors are logged with context (worker ID, error message, error type)
- **Error Tracking**: Each worker tracks error count and last error message

**Implementation**:
```typescript
// TES-PERF-001.8: Implement worker.onerror handler
worker.onerror = (error: ErrorEvent) => {
  log('error', 'worker_error', {
    workerId: id,
    error: error.message || String(error),
    errorType: error.error?.constructor?.name || 'Unknown',
  });
  
  this.handleWorkerError(id, error);
};

// TES-PERF-001.8: Implement worker.on('error') handler (alternative API)
worker.addEventListener('error', (event: ErrorEvent) => {
  log('error', 'worker_error_event', {
    workerId: id,
    error: event.message || String(event),
  });
  
  this.handleWorkerError(id, event);
});
```

**References**:
- `worker.onerror` (MDN Web Workers): https://developer.mozilla.org/en-US/docs/Web/API/Worker/onerror
- `worker.addEventListener('error')` (MDN Web Workers): https://developer.mozilla.org/en-US/docs/Web/API/Worker/error_event

---

### **2. Automatic Respawn with Exponential Backoff**

**TES-PERF-001.8**: Implement logic to respawn crashed workers with exponential backoff

- **Exponential Backoff**: Respawn delays increase exponentially: 1s → 2s → 4s → 8s → 16s → max 60s
- **Max Attempts**: Configurable maximum respawn attempts (default: 5)
- **Respawn Tracking**: Tracks attempt count, last respawn time, and next delay for each worker

**Implementation**:
```typescript
// Calculate exponential backoff delay
const delay = Math.min(
  respawnInfo.nextRespawnDelay * Math.pow(2, respawnInfo.attemptCount - 1),
  this.maxRespawnDelay
);

// Schedule respawn with exponential backoff
setTimeout(async () => {
  await this.respawnWorker(workerId, respawnInfo!);
}, delay);
```

**Configuration**:
- `initialRespawnDelay`: 1000ms (1 second)
- `maxRespawnDelay`: 60000ms (60 seconds)
- `maxRespawnAttempts`: 5

---

### **3. Graceful Shutdown**

**TES-PERF-001.8**: Ensure workers are terminated on main process exit

- **Shutdown Handler**: Registers with `registerShutdownHandler()` for graceful cleanup
- **Termination Signal**: Sends `{ type: 'terminate' }` message to each worker before termination
- **Cleanup Delay**: Gives workers 100ms to clean up before forceful termination
- **Event Loop Cleanup**: Stops event loop monitoring interval on shutdown

**Implementation**:
```typescript
private setupGracefulShutdown(): void {
  registerShutdownHandler(async () => {
    log('info', 'worker_manager_shutdown_start', {
      workerCount: this.workers.size,
    });
    
    await this.terminateAllWorkers();
    
    // Stop event loop monitoring
    if (this.eventLoopMonitorInterval) {
      clearInterval(this.eventLoopMonitorInterval);
    }
    
    log('info', 'worker_manager_shutdown_complete');
  });
}
```

**References**:
- `worker.terminate()` (MDN Web Workers): https://developer.mozilla.org/en-US/docs/Web/API/Worker/terminate

---

## 🔍 Event Loop Monitoring - TES-PERF-001.9

**TES-PERF-001.9**: Event Loop Monitoring (Bun.peek())

**Note**: `Bun.peek()` is for promise inspection, not event loop monitoring. We use `Bun.nanoseconds()` to measure tick durations instead.

### **Implementation**

- **Tick Duration Measurement**: Uses `Bun.nanoseconds()` to measure time between ticks
- **Long Tick Detection**: Detects ticks exceeding 16ms threshold (60 FPS target)
- **Metrics Tracking**:
  - `tickCount`: Total number of ticks monitored
  - `longTickCount`: Number of ticks exceeding threshold
  - `maxTickDuration`: Maximum tick duration observed
  - `averageTickDuration`: Rolling average tick duration (exponential moving average)
  - `lastTickStart`: Timestamp of last tick start
  - `lastTickDuration`: Duration of last tick

**Goal**: Reduce "long tick" occurrences on the main thread during peak hashing load

**Implementation**:
```typescript
private startEventLoopMonitoring(): void {
  let lastTickEnd = Bun.nanoseconds();
  
  this.eventLoopMonitorInterval = setInterval(() => {
    const tickStart = Bun.nanoseconds();
    const tickDuration = tickStart - lastTickEnd;
    
    // Detect long ticks (>16ms threshold)
    if (tickDuration > this.longTickThreshold) {
      this.eventLoopMetrics.longTickCount++;
      
      const tickDurationMs = tickDuration / 1_000_000;
      log('warn', 'event_loop_long_tick', {
        duration_ms: tickDurationMs.toFixed(2),
        threshold_ms: this.longTickThreshold / 1_000_000,
        workerCount: this.workers.size,
      });
    }
    
    lastTickEnd = Bun.nanoseconds();
  }, 100); // Check every 100ms
}
```

**Configuration**:
- `longTickThreshold`: 16_000_000 nanoseconds (16ms)
- Monitoring interval: 100ms

**Reference**:
- `Bun.peek()` (Bun Documentation): https://bun.sh/docs/runtime/utils#bunpeek
- Note: `Bun.peek()` is for promise inspection. We use `Bun.nanoseconds()` for event loop monitoring.

---

## 📊 API

### **Get Event Loop Metrics**

```typescript
import { getEventLoopMetrics } from './scripts/workers/worker-manager.ts';

const metrics = getEventLoopMetrics();
if (metrics) {
  console.log('Tick Count:', metrics.tickCount);
  console.log('Long Ticks:', metrics.longTickCount);
  console.log('Max Tick Duration (ms):', metrics.maxTickDuration / 1_000_000);
  console.log('Average Tick Duration (ms):', metrics.averageTickDuration / 1_000_000);
}
```

---

## 🧪 Testing

### **Test Worker Error Handling**

```typescript
// Create a worker that throws an error
const worker = new Worker('./error-worker.js');

// Error should be caught and logged
// Worker should be respawned with exponential backoff
```

### **Test Graceful Shutdown**

```bash
# Start server
bun run scripts/dev-server.ts

# Send SIGTERM
kill -TERM <pid>

# Workers should be terminated gracefully
```

### **Test Event Loop Monitoring**

```typescript
// Monitor event loop metrics
const metrics = getEventLoopMetrics();
console.log('Long tick ratio:', metrics.longTickCount / metrics.tickCount);
```

---

## 📈 Metrics

### **Worker Error Metrics**

- `worker_error`: Worker error occurred
- `worker_error_event`: Worker error event fired
- `worker_respawn_scheduled`: Worker respawn scheduled with delay
- `worker_respawned`: Worker successfully respawned
- `worker_respawn_exhausted`: Worker respawn attempts exhausted
- `worker_respawn_failed`: Worker respawn failed

### **Event Loop Metrics**

- `event_loop_long_tick`: Long tick detected (>16ms)
- `event_loop_metrics`: Current event loop metrics snapshot

---

## ✅ Checklist

- [x] **TES-PERF-001.8**: Implement `worker.onerror` handler
- [x] **TES-PERF-001.8**: Implement `worker.on('error')` handler
- [x] **TES-PERF-001.8**: Implement automatic respawn logic
- [x] **TES-PERF-001.8**: Implement exponential backoff for respawns
- [x] **TES-PERF-001.8**: Implement graceful shutdown
- [x] **TES-PERF-001.9**: Implement event loop monitoring using `Bun.nanoseconds()`
- [x] **TES-PERF-001.9**: Detect and log long ticks (>16ms)
- [x] **TES-PERF-001.9**: Track event loop metrics (tick count, long tick count, max/average duration)

---

## 🔗 References

- **MDN Web Workers**: https://developer.mozilla.org/en-US/docs/Web/API/Worker
- **worker.onerror**: https://developer.mozilla.org/en-US/docs/Web/API/Worker/onerror
- **worker.terminate()**: https://developer.mozilla.org/en-US/docs/Web/API/Worker/terminate
- **Bun.peek()**: https://bun.sh/docs/runtime/utils#bunpeek
- **Bun.nanoseconds()**: https://bun.sh/docs/runtime/bun-apis#sleep--timing

