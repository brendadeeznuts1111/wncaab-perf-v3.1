/**
 * Worker Manager - TES-PERF-001.8 & TES-PERF-001.9
 * 
 * Enhanced worker management with:
 * - Error handling and automatic respawn with exponential backoff
 * - Graceful shutdown on process exit
 * - Event loop monitoring using Bun.nanoseconds() to detect long ticks
 * 
 * @module scripts/workers/worker-manager
 */

// Worker is a global in Bun, no need to import
// import { Worker } from "bun";
import { registerShutdownHandler } from "../../lib/process/compat.ts";
import { log } from "../../lib/production-utils.ts";

// Type declaration for Worker (Bun global)
declare const Worker: {
  new (scriptURL: string | URL, options?: {
    env?: Record<string, string>;
    name?: string;
  }): Worker;
};

interface Worker {
  onerror: ((error: ErrorEvent) => void) | null;
  addEventListener(type: 'error', listener: (event: ErrorEvent) => void): void;
  postMessage(message: any): void;
  terminate(): void;
}

interface WorkerRespawnInfo {
  workerId: string;
  attemptCount: number;
  lastRespawnTime: number;
  nextRespawnDelay: number;
}

interface EventLoopMetrics {
  tickCount: number;
  longTickCount: number;
  maxTickDuration: number;
  averageTickDuration: number;
  lastTickStart: number;
  lastTickDuration: number;
  health: 'green' | 'yellow' | 'red';
  longTickRatio: number;
}

class ResilientWorkerManager {
  private workers: Map<string, Worker> = new Map();
  private workerStates: Map<string, { status: string; createdAt: number; errorCount: number }> = new Map();
  private respawnInfo: Map<string, WorkerRespawnInfo> = new Map();
  private eventLoopMetrics: EventLoopMetrics = {
    tickCount: 0,
    longTickCount: 0,
    maxTickDuration: 0,
    averageTickDuration: 0,
    lastTickStart: Bun.nanoseconds(),
    lastTickDuration: 0,
    health: 'green',
    longTickRatio: 0,
  };
  
  private eventLoopMonitorInterval?: Timer;
  private eventLoopMonitorActive: boolean = false;
  private workerScriptPath: URL;
  private maxRespawnAttempts: number = 5;
  private initialRespawnDelay: number = 1000; // 1 second
  private maxRespawnDelay: number = 60000; // 60 seconds
  private longTickThreshold: number = 16_000_000; // 16ms in nanoseconds
  
  constructor(workerScriptPath: URL) {
    this.workerScriptPath = workerScriptPath;
    this.startEventLoopMonitoring();
    this.setupGracefulShutdown();
  }
  
  /**
   * Start event loop monitoring using Bun.nanoseconds()
   * 
   * Monitors for "long tick" occurrences that indicate event loop blocking
   * Goal: Reduce long tick occurrences on the main thread
   * 
   * TES-PERF-001.9: Event Loop Monitoring (Bun.peek())
   * Note: Bun.peek() is for promise inspection, not event loop monitoring.
   * We use Bun.nanoseconds() to measure tick durations instead.
   * 
   * Uses setImmediate() recursion to measure actual event loop ticks,
   * not setTimeout intervals which can be delayed.
   */
  private startEventLoopMonitoring(): void {
    let lastTickEnd = Bun.nanoseconds();
    
    const measureTick = () => {
      const tickStart = Bun.nanoseconds();
      const tickDuration = tickStart - lastTickEnd;
      
      // Update metrics
      this.eventLoopMetrics.tickCount++;
      this.eventLoopMetrics.lastTickStart = tickStart;
      this.eventLoopMetrics.lastTickDuration = tickDuration;
      
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
      
      // Update max and average
      if (tickDuration > this.eventLoopMetrics.maxTickDuration) {
        this.eventLoopMetrics.maxTickDuration = tickDuration;
      }
      
      // Rolling average (exponential moving average)
      const alpha = 0.1;
      this.eventLoopMetrics.averageTickDuration = 
        this.eventLoopMetrics.averageTickDuration * (1 - alpha) + tickDuration * alpha;
      
      // Calculate health score: green (<10ms avg), yellow (10-16ms), red (>16ms)
      const avgMs = this.eventLoopMetrics.averageTickDuration / 1_000_000;
      if (avgMs < 10) {
        this.eventLoopMetrics.health = 'green';
      } else if (avgMs < 16) {
        this.eventLoopMetrics.health = 'yellow';
      } else {
        this.eventLoopMetrics.health = 'red';
      }
      
      // Calculate long tick ratio
      this.eventLoopMetrics.longTickRatio = this.eventLoopMetrics.tickCount > 0
        ? this.eventLoopMetrics.longTickCount / this.eventLoopMetrics.tickCount
        : 0;
      
      // KV alert: Trigger AI-alert if long-tick ratio >5% (0.05)
      if (this.eventLoopMetrics.longTickRatio > 0.05) {
        log('warn', 'event_loop_anomaly_detected', {
          longTickRatio: (this.eventLoopMetrics.longTickRatio * 100).toFixed(2) + '%',
          threshold: '5%',
          workerCount: this.workers.size,
          avgDurationMs: avgMs.toFixed(2),
        });
        
        // TODO: KV pub/sub integration for Cloudflare Workers
        // await kv.publish('alert:long-tick', JSON.stringify({
        //   duration: tickDuration,
        //   timestamp: Date.now(),
        //   ratio: this.eventLoopMetrics.longTickRatio,
        // }));
      }
      
      lastTickEnd = Bun.nanoseconds();
      
      // Schedule next measurement using setImmediate (actual event loop tick)
      setImmediate(measureTick);
    };
    
    // Start monitoring
    setImmediate(measureTick);
  }
  
  /**
   * Get current event loop metrics
   */
  getEventLoopMetrics(): EventLoopMetrics {
    return { ...this.eventLoopMetrics };
  }
  
  /**
   * Create a new worker with error handling and respawn logic
   * 
   * TES-PERF-001.8: Implement worker.onerror and worker.on('error') handlers
   */
  createWorker(id: string, env?: Record<string, string>): Worker {
    const worker = new Worker(this.workerScriptPath, {
      env: {
        WORKER_ID: id,
        WORKER_REGISTRY: 'true',
        ...env,
      },
    });
    
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
    
    // Track worker state
    this.workerStates.set(id, {
      status: 'idle',
      createdAt: Date.now(),
      errorCount: 0,
    });
    
    this.workers.set(id, worker);
    
    return worker;
  }
  
  /**
   * Handle worker error with automatic respawn logic
   * 
   * TES-PERF-001.8: Implement logic to respawn crashed workers with exponential backoff
   */
  private async handleWorkerError(workerId: string, error: ErrorEvent): Promise<void> {
    const state = this.workerStates.get(workerId);
    if (!state) return;
    
    state.errorCount++;
    state.status = 'error';
    
    // Get or create respawn info
    let respawnInfo = this.respawnInfo.get(workerId);
    if (!respawnInfo) {
      respawnInfo = {
        workerId,
        attemptCount: 0,
        lastRespawnTime: Date.now(),
        nextRespawnDelay: this.initialRespawnDelay,
      };
    }
    
    respawnInfo.attemptCount++;
    
    // Check if we've exceeded max attempts
    if (respawnInfo.attemptCount > this.maxRespawnAttempts) {
      log('error', 'worker_respawn_exhausted', {
        workerId,
        attempts: respawnInfo.attemptCount,
        maxAttempts: this.maxRespawnAttempts,
      });
      
      // Mark worker as permanently failed
      state.status = 'terminated';
      this.workers.delete(workerId);
      this.respawnInfo.delete(workerId);
      return;
    }
    
    // Calculate exponential backoff delay
    const delay = Math.min(
      respawnInfo.nextRespawnDelay * Math.pow(2, respawnInfo.attemptCount - 1),
      this.maxRespawnDelay
    );
    
    log('warn', 'worker_respawn_scheduled', {
      workerId,
      attempt: respawnInfo.attemptCount,
      delay_ms: delay,
      error: error.message || String(error),
    });
    
    // Schedule respawn with exponential backoff
    setTimeout(async () => {
      await this.respawnWorker(workerId, respawnInfo!);
    }, delay);
    
    // Update respawn info
    respawnInfo.nextRespawnDelay = delay;
    respawnInfo.lastRespawnTime = Date.now();
    this.respawnInfo.set(workerId, respawnInfo);
    
    // Terminate the crashed worker
    const worker = this.workers.get(workerId);
    if (worker) {
      try {
        worker.terminate();
      } catch (e) {
        // Worker may already be terminated
      }
      this.workers.delete(workerId);
    }
  }
  
  /**
   * Respawn a crashed worker
   */
  private async respawnWorker(workerId: string, respawnInfo: WorkerRespawnInfo): Promise<void> {
    log('info', 'worker_respawning', {
      workerId,
      attempt: respawnInfo.attemptCount,
    });
    
    try {
      const newWorker = this.createWorker(workerId);
      
      // Reset respawn info on successful respawn
      respawnInfo.attemptCount = 0;
      respawnInfo.nextRespawnDelay = this.initialRespawnDelay;
      
      const state = this.workerStates.get(workerId);
      if (state) {
        state.status = 'idle';
      }
      
      log('info', 'worker_respawned', {
        workerId,
        attempt: respawnInfo.attemptCount,
      });
    } catch (error) {
      log('error', 'worker_respawn_failed', {
        workerId,
        error: error instanceof Error ? error.message : String(error),
      });
      
      // Will be retried by handleWorkerError if error occurs again
    }
  }
  
  /**
   * TES-PERF-001.8: Graceful shutdown - Ensure workers are terminated on main process exit
   */
  private setupGracefulShutdown(): void {
    registerShutdownHandler(async () => {
      log('info', 'worker_manager_shutdown_start', {
        workerCount: this.workers.size,
      });
      
      await this.terminateAllWorkers();
      
      // Stop event loop monitoring
      if (this.eventLoopMonitorActive) {
        this.eventLoopMonitorActive = false;
      }
      
      log('info', 'worker_manager_shutdown_complete');
    });
  }
  
  /**
   * Terminate all workers gracefully
   * 
   * #REF: worker.terminate()
   * https://developer.mozilla.org/en-US/docs/Web/API/Worker/terminate
   * 
   * TES-PERF-001.8: Graceful shutdown ensures workers are terminated on process exit.
   */
  async terminateAllWorkers(): Promise<void> {
    const terminationPromises: Promise<void>[] = [];
    
    for (const [id, worker] of this.workers.entries()) {
      terminationPromises.push(
        (async () => {
          try {
            // Send termination signal
            worker.postMessage({ type: 'terminate' });
            
            // Give worker time to clean up (100ms)
            // #REF: Bun.sleep()
            // https://bun.sh/docs/runtime/bun-apis#sleep--timing
            await Bun.sleep(100);
            
            // Terminate worker
            worker.terminate();
            
            const state = this.workerStates.get(id);
            if (state) {
              state.status = 'terminated';
            }
            
            log('info', 'worker_terminated', { workerId: id });
          } catch (error) {
            log('error', 'worker_terminate_failed', {
              workerId: id,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        })()
      );
    }
    
    await Promise.all(terminationPromises);
    
    this.workers.clear();
    this.workerStates.clear();
    this.respawnInfo.clear();
  }
  
  /**
   * Get worker registry
   */
  getWorkers(): Map<string, Worker> {
    return new Map(this.workers);
  }
  
  /**
   * Get worker count
   */
  getWorkerCount(): number {
    return this.workers.size;
  }
  
  /**
   * Scale workers to target count
   */
  async scale(targetCount: number): Promise<{ created: number; terminated: number }> {
    const currentCount = this.workers.size;
    let created = 0;
    let terminated = 0;
    
    if (targetCount > currentCount) {
      const toCreate = targetCount - currentCount;
      for (let i = 0; i < toCreate; i++) {
        const id = `w_${Date.now()}_${i}`;
        this.createWorker(id);
        created++;
      }
    } else if (targetCount < currentCount) {
      const toTerminate = currentCount - targetCount;
      const workersToTerminate = Array.from(this.workers.keys()).slice(0, toTerminate);
      
      for (const id of workersToTerminate) {
        const worker = this.workers.get(id);
        if (worker) {
          worker.postMessage({ type: 'terminate' });
          await Bun.sleep(100);
          worker.terminate();
          this.workers.delete(id);
          this.workerStates.delete(id);
          terminated++;
        }
      }
    }
    
    return { created, terminated };
  }
}

// Global worker manager instance
let workerManager: ResilientWorkerManager | null = null;

/**
 * Initialize worker pool
 */
export async function initializeWorkerPool(): Promise<void> {
  if (workerManager) {
    return;
  }
  
  // Default worker script path (can be overridden)
  const workerScriptPath = new URL('./scan-worker.js', import.meta.url);
  
  workerManager = new ResilientWorkerManager(workerScriptPath);
  
  log('info', 'worker_pool_initialized', {
    eventLoopMonitoring: true,
    errorHandling: true,
    gracefulShutdown: true,
  });
}

/**
 * Handle worker scale request
 */
export async function handleWorkerScale(req: Request): Promise<{ created: number; terminated: number }> {
  if (!workerManager) {
    await initializeWorkerPool();
  }
  
  const body = await req.json();
  const targetCount = parseInt(body.count || '0', 10);
  
  if (isNaN(targetCount) || targetCount < 0) {
    throw new Error('Invalid count parameter');
  }
  
  return workerManager!.scale(targetCount);
}

/**
 * Handle worker snapshot request
 */
export async function handleWorkerSnapshot(req: Request, options: { id: string }): Promise<Response> {
  // Stub implementation - implement actual snapshot logic
  return new Response('Worker snapshot not available', { status: 503 });
}

/**
 * Get worker registry
 */
export function getWorkerRegistry(): any {
  if (!workerManager) {
    return { getRegistry: () => ({}) };
  }
  
  return {
    getRegistry: () => {
      const workers = workerManager!.getWorkers();
      const registry: Record<string, any> = {};
      
      for (const [id, worker] of workers.entries()) {
        const state = workerManager!['workerStates'].get(id);
        registry[id] = {
          id,
          status: state?.status || 'unknown',
          createdAt: state?.createdAt || Date.now(),
          errorCount: state?.errorCount || 0,
        };
      }
      
      return registry;
    },
  };
}

/**
 * Terminate all workers
 */
export async function terminateAllWorkers(): Promise<void> {
  if (workerManager) {
    await workerManager.terminateAllWorkers();
    workerManager = null;
  }
}

/**
 * Get worker pool size
 */
export function getWorkerPoolSize(): number {
  return workerManager?.getWorkerCount() || 0;
}

/**
 * Get total workers
 */
export function getTotalWorkers(): number {
  return workerManager?.getWorkerCount() || 0;
}

/**
 * Get event loop metrics
 */
export function getEventLoopMetrics(): EventLoopMetrics | null {
  return workerManager?.getEventLoopMetrics() || null;
}
