# Process & Worker API References - TES-PERF-001.8

**Status**: ✅ **DOCUMENTED**  
**Version**: v3.1  
**Date**: December 2024

---

## 📚 API Reference Documentation

All process and worker APIs referenced in TES-PERF-001.8 are properly implemented and documented with `#REF` links.

---

## 🔗 Process APIs

### **1. process.on('unhandledRejection')**

**#REF**: https://nodejs.org/api/process.html#event-unhandledrejection

**Implementation**: `lib/process/compat.ts` → `setupUnhandledRejectionHandling()`

**Features**:
- Enhanced logging with metadata tags: `[RESILIENCE][TELEMETRY][EVENT-LOOP][ERROR][MONITOR]`
- Supports multiple rejection modes: `throw`, `strict`, `warn`, `warn-with-error-code`, `none`
- Structured error metadata with stack traces
- KV logging hooks (commented for Cloudflare Workers integration)

**Usage**:
```typescript
process.on('unhandledRejection', (reason, promise) => {
  // Enhanced logging with metadata tags
  const errorMetadata = {
    domain: 'RESILIENCE',
    scope: 'TELEMETRY',
    meta: 'EVENT-LOOP',
    type: 'ERROR',
    api: 'MONITOR',
    tags: ['[ERROR][UNHANDLED-REJECTION]'],
    timestamp: Date.now(),
    reason: reason instanceof Error ? {
      message: reason.message,
      stack: reason.stack,
      name: reason.name,
    } : String(reason),
  };
});
```

---

### **2. process.on('uncaughtException')**

**#REF**: https://nodejs.org/api/process.html#event-uncaughtexception

**Implementation**: `lib/process/compat.ts` → `setupUncaughtExceptionHandling()`

**Features**:
- Graceful shutdown in production mode
- Worker termination via `registerShutdownHandler()`
- Error logging with full stack traces

**Usage**:
```typescript
process.on('uncaughtException', (error) => {
  console.error('[Process Compat] Uncaught Exception:', error);
  if (process.env.NODE_ENV === 'production') {
    handleGracefulShutdown('uncaughtException').then(() => {
      process.exit(1);
    });
  } else {
    throw error;
  }
});
```

---

### **3. process.on('SIGTERM')**

**#REF**: https://nodejs.org/api/process.html#event-sigterm

**Implementation**: `lib/process/compat.ts` → `setupSignalHandlers()`

**Features**:
- Graceful shutdown on termination signal
- Worker pool cleanup via `registerShutdownHandler()`
- Clean process exit

**Usage**:
```typescript
process.on('SIGTERM', async () => {
  await handleGracefulShutdown('SIGTERM');
  process.exit(0);
});
```

---

### **4. process.on('SIGINT')**

**#REF**: https://nodejs.org/api/process.html#event-sigint

**Implementation**: `lib/process/compat.ts` → `setupSignalHandlers()`

**Features**:
- Graceful shutdown on Ctrl+C
- Worker pool cleanup via `registerShutdownHandler()`
- Clean process exit

**Usage**:
```typescript
process.on('SIGINT', async () => {
  await handleGracefulShutdown('SIGINT');
  process.exit(0);
});
```

---

## 🔧 Worker APIs

### **5. worker.terminate()**

**#REF**: https://developer.mozilla.org/en-US/docs/Web/API/Worker/terminate

**Implementation**: `scripts/workers/worker-manager.ts` → `terminateAllWorkers()`

**Features**:
- Graceful termination with cleanup delay (100ms)
- Termination signal sent before forceful termination
- Error handling for already-terminated workers

**Usage**:
```typescript
// Send termination signal
worker.postMessage({ type: 'terminate' });

// Give worker time to clean up
await Bun.sleep(100);

// Terminate worker
worker.terminate();
```

---

### **6. Bun.sleep()**

**#REF**: https://bun.sh/docs/runtime/bun-apis#sleep--timing

**Implementation**: `scripts/workers/worker-manager.ts` → Used in `terminateAllWorkers()` and `respawnWorker()`

**Features**:
- Non-blocking async sleep
- Used for cleanup delays and exponential backoff
- Nanosecond precision timing available via `Bun.nanoseconds()`

**Usage**:
```typescript
// Sleep for 100ms before terminating worker
await Bun.sleep(100);

// Exponential backoff delay
const delay = Math.min(
  respawnInfo.nextRespawnDelay * Math.pow(2, respawnInfo.attemptCount - 1),
  this.maxRespawnDelay
);
setTimeout(async () => {
  await this.respawnWorker(workerId, respawnInfo!);
}, delay);
```

---

## 🔄 Integration Flow

### **Initialization**

```typescript
// lib/process/compat.ts
export function initializeProcessCompat() {
  setupProcessStreams();
  setupUnhandledRejectionHandling();  // process.on('unhandledRejection')
  setupUncaughtExceptionHandling();    // process.on('uncaughtException')
  setupSignalHandlers();               // process.on('SIGTERM', 'SIGINT')
}
```

### **Worker Manager Shutdown**

```typescript
// scripts/workers/worker-manager.ts
private setupGracefulShutdown(): void {
  registerShutdownHandler(async () => {
    await this.terminateAllWorkers();  // Uses worker.terminate() + Bun.sleep()
    
    // Stop event loop monitoring
    if (this.eventLoopMonitorInterval) {
      clearInterval(this.eventLoopMonitorInterval);
    }
  });
}
```

### **Dev Server Integration**

```typescript
// scripts/dev-server.ts
initializeProcessCompat();  // Sets up all process handlers

registerShutdownHandler(async () => {
  await devServer.stop(true);
});

registerShutdownHandler(async () => {
  await terminateAllWorkers();  // Worker pool cleanup
});
```

---

## ✅ Verification Checklist

- [x] **process.on('unhandledRejection')**: ✅ Implemented with metadata tags
- [x] **process.on('uncaughtException')**: ✅ Implemented with graceful shutdown
- [x] **process.on('SIGTERM')**: ✅ Implemented with worker cleanup
- [x] **process.on('SIGINT')**: ✅ Implemented with worker cleanup
- [x] **worker.terminate()**: ✅ Implemented with cleanup delay
- [x] **Bun.sleep()**: ✅ Used for cleanup delays and backoff

---

## 📖 Additional References

- **Node.js Process API**: https://nodejs.org/api/process.html
- **MDN Web Workers API**: https://developer.mozilla.org/en-US/docs/Web/API/Worker
- **Bun Runtime APIs**: https://bun.sh/docs/runtime/bun-apis
- **Bun Sleep & Timing**: https://bun.sh/docs/runtime/bun-apis#sleep--timing

---

## 🎯 TES-PERF-001.8 Compliance

All referenced APIs are:
1. ✅ **Implemented** with proper error handling
2. ✅ **Documented** with `#REF` links
3. ✅ **Integrated** into worker manager and process compat layer
4. ✅ **Tested** via graceful shutdown handlers
5. ✅ **Enhanced** with metadata tagging for resilience monitoring

