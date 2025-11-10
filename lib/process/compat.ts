/**
 * Process API Compatibility Layer
 * 
 * Provides compatibility shims for Bun's process API to ensure consistent
 * behavior across Bun and Node.js environments.
 * 
 * @module lib/process/compat
 */

const shutdownHandlers: Array<() => void | Promise<void>> = [];
let isShuttingDown = false;

export function registerShutdownHandler(handler: () => void | Promise<void>) {
  shutdownHandlers.push(handler);
  return () => {
    const index = shutdownHandlers.indexOf(handler);
    if (index > -1) {
      shutdownHandlers.splice(index, 1);
    }
  };
}

export function isProcessShuttingDown(): boolean {
  return isShuttingDown;
}

async function handleGracefulShutdown(signal: string) {
  if (isShuttingDown) {
    return;
  }
  
  isShuttingDown = true;
  console.log(`[Process Compat] Received ${signal}, initiating graceful shutdown...`);
  
  for (let i = shutdownHandlers.length - 1; i >= 0; i--) {
    try {
      const handler = shutdownHandlers[i];
      await Promise.resolve(handler());
    } catch (error) {
      console.error(`[Process Compat] Shutdown handler error:`, error);
    }
  }
  
  console.log('[Process Compat] Graceful shutdown complete');
}

export function setupProcessStreams() {
  if (process.stdin && typeof process.stdin.unref === 'function') {
    if (!process.stdin.isTTY) {
      process.stdin.unref();
    } else {
      process.stdin.ref();
    }
  }
  if (process.stdout && typeof process.stdout.unref === 'function') {
    if (!process.stdout.isTTY) {
      process.stdout.unref();
    }
  }
  if (process.stderr && typeof process.stderr.unref === 'function') {
    if (!process.stderr.isTTY) {
      process.stderr.unref();
    }
  }
}

export function refProcess() {
  if (typeof process.ref === 'function') {
    process.ref();
  }
}

export function unrefProcess() {
  if (typeof process.unref === 'function') {
    process.unref();
  }
}

export function setupUnhandledRejectionHandling() {
  let rejectionMode = 'warn';
  if (process.env.NODE_OPTIONS?.includes('--unhandled-rejections')) {
    const match = process.env.NODE_OPTIONS.match(/--unhandled-rejections=(\w+)/);
    if (match) {
      rejectionMode = match[1];
    }
  }
  const rejectionIndex = Bun.argv.findIndex(arg => arg.startsWith('--unhandled-rejections'));
  if (rejectionIndex !== -1) {
    const arg = Bun.argv[rejectionIndex];
    const match = arg.match(/--unhandled-rejections=(\w+)/);
    if (match) {
      rejectionMode = match[1];
    }
  }
  
  /**
   * #REF: process.on('unhandledRejection')
   * https://nodejs.org/api/process.html#event-unhandledrejection
   * 
   * Handles unhandled promise rejections with metadata tagging for resilience monitoring.
   * TES-PERF-001.8: Enhanced logging with [RESILIENCE][TELEMETRY][EVENT-LOOP][ERROR][MONITOR] tags.
   */
  process.on('unhandledRejection', (reason, promise) => {
    // TES-PERF-001.8: Enhanced unhandled rejection logging with metadata tags
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
    
    switch (rejectionMode) {
      case 'throw':
      case 'strict':
        console.error('[Process Compat] Unhandled rejection (strict mode):', reason);
        console.error('[Process Compat] Metadata:', JSON.stringify(errorMetadata, null, 2));
        throw reason;
      case 'warn':
      case 'warn-with-error-code':
        console.error('[Process Compat] Unhandled Promise Rejection:', reason);
        console.error('[Process Compat] Metadata:', JSON.stringify(errorMetadata, null, 2));
        if (rejectionMode === 'warn-with-error-code') {
          process.exitCode = 1;
        }
        break;
      case 'none':
        break;
      default:
        console.error('[Process Compat] Unhandled Promise Rejection:', reason);
        console.error('[Process Compat] Metadata:', JSON.stringify(errorMetadata, null, 2));
    }
    
    // TODO: KV logging for Cloudflare Workers
    // await kv.put(`error:unhandled-rejection:${Date.now()}`, JSON.stringify(errorMetadata));
  });
  
  if (typeof process.on === 'function') {
    process.on('rejectionHandled', (promise) => {
      if (rejectionMode === 'warn' || rejectionMode === 'warn-with-error-code') {
        console.warn('[Process Compat] Promise rejection was handled:', promise);
      }
    });
  }
}

export function setupUncaughtExceptionHandling() {
  /**
   * #REF: process.on('uncaughtException')
   * https://nodejs.org/api/process.html#event-uncaughtexception
   * 
   * Handles uncaught exceptions with graceful shutdown in production.
   * TES-PERF-001.8: Ensures clean worker termination on fatal errors.
   */
  process.on('uncaughtException', (error) => {
    console.error('[Process Compat] Uncaught Exception:', error);
    if (process.env.NODE_ENV === 'production') {
      handleGracefulShutdown('uncaughtException').then(() => {
        process.exit(1);
      }).catch(() => {
        process.exit(1);
      });
    } else {
      throw error;
    }
  });
}

export function setupSignalHandlers() {
  /**
   * #REF: process.on('SIGINT')
   * https://nodejs.org/api/process.html#event-sigint
   * 
   * Handles Ctrl+C (SIGINT) with graceful shutdown.
   * TES-PERF-001.8: Ensures workers are terminated cleanly.
   */
  process.on('SIGINT', async () => {
    await handleGracefulShutdown('SIGINT');
    process.exit(0);
  });
  
  /**
   * #REF: process.on('SIGTERM')
   * https://nodejs.org/api/process.html#event-sigterm
   * 
   * Handles termination signal (SIGTERM) with graceful shutdown.
   * TES-PERF-001.8: Ensures workers are terminated cleanly.
   */
  process.on('SIGTERM', async () => {
    await handleGracefulShutdown('SIGTERM');
    process.exit(0);
  });
  process.on('beforeExit', (code) => {
    if (!isShuttingDown) {
      console.log(`[Process Compat] Event loop empty, exit code: ${code}`);
    }
  });
  process.on('exit', (code) => {
    console.log(`[Process Compat] Process exiting with code: ${code}`);
  });
}

export interface ProcessFeatures {
  typescript: boolean;
  require_module: boolean;
  openssl_is_boringssl: boolean;
  llhttp: boolean;
  workers: boolean;
  websockets: boolean;
  sqlite: boolean;
}

export function getProcessFeatures(): ProcessFeatures {
  const features = (process as any).features || {};
  return {
    typescript: features.typescript ?? true,
    require_module: features.require_module ?? true,
    openssl_is_boringssl: features.openssl_is_boringssl ?? true,
    llhttp: features.llhttp ?? false,
    workers: typeof Worker !== 'undefined',
    websockets: typeof WebSocket !== 'undefined',
    sqlite: typeof Bun !== 'undefined' && 'Database' in Bun,
  };
}

export function getProcessVersions() {
  const versions = { ...process.versions };
  if (typeof Bun !== 'undefined') {
    (versions as any).bun = Bun.version;
    (versions as any).llhttp = (process.versions as any).llhttp || 'unknown';
    try {
      const revision = Bun.revision || 'unknown';
      (versions as any).bun_revision = revision;
    } catch {}
  }
  return versions;
}

export function getProcessEvalCode(): string | null {
  return (process as any)._eval || null;
}

export function emitWorkerEvent(workerId: string, workerType: string) {
  if (typeof process.emit === 'function') {
    try {
      process.emit('worker' as any, { id: workerId, type: workerType, timestamp: Date.now() });
    } catch {}
  }
}

export function getProcessReport(): any {
  if ((process as any).report && typeof (process as any).report.getReport === 'function') {
    try {
      return (process as any).report.getReport();
    } catch (error) {
      return generateFallbackReport();
    }
  }
  return generateFallbackReport();
}

function generateFallbackReport() {
  return {
    header: {
      event: 'process-report',
      trigger: 'manual',
      filename: null,
      dumpEventTime: new Date().toISOString(),
      dumpEventTimeStamp: Date.now(),
    },
    process: {
      pid: process.pid,
      ppid: process.ppid,
      execPath: process.execPath,
      argv: process.argv,
      cwd: process.cwd(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage ? process.cpuUsage() : null,
    },
    versions: getProcessVersions(),
    features: getProcessFeatures(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      platform: process.platform,
      arch: process.arch,
    },
  };
}

export interface ProcessHealth {
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage | null;
  pid: number;
  ppid: number;
  platform: string;
  arch: string;
  versions: ReturnType<typeof getProcessVersions>;
  features: ProcessFeatures;
}

export function getProcessHealth(): ProcessHealth {
  return {
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage ? process.cpuUsage() : null,
    pid: process.pid,
    ppid: process.ppid,
    platform: process.platform,
    arch: process.arch,
    versions: getProcessVersions(),
    features: getProcessFeatures(),
  };
}

export function initializeProcessCompat() {
  setupProcessStreams();
  setupUnhandledRejectionHandling();
  setupUncaughtExceptionHandling();
  setupSignalHandlers();
  
  if (process.env.NODE_ENV !== 'production') {
    const features = getProcessFeatures();
    const versions = getProcessVersions();
    const health = getProcessHealth();
    
    console.log('[Process Compat] ✅ Initialized');
    console.log('[Process Compat] Features:', features);
    console.log('[Process Compat] Versions:', versions);
    console.log('[Process Compat] Health:', {
      uptime: `${health.uptime.toFixed(2)}s`,
      memory: `${(health.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      platform: health.platform,
      arch: health.arch,
    });
    
    const evalCode = getProcessEvalCode();
    if (evalCode) {
      console.log('[Process Compat] Eval code detected');
    }
  }
}

