/**
 * Worker Telemetry API Server - v14.3 Worker Monitoring
 * 
 * Provides REST API and WebSocket endpoints for worker monitoring:
 * - GET  /api/workers/registry      → Live worker state
 * - POST /api/workers/scale         → Manual override
 * - WS   /ws/workers/telemetry      → Live RSS + queue
 * - GET  /api/workers/snapshot/:id → Download .heapsnapshot
 */

import { Worker } from 'bun';

interface WorkerState {
  id: string;
  status: 'idle' | 'working' | 'error' | 'terminated';
  created_at: number;
  messages_processed: number;
  errors: number;
  last_error?: string;
  current_job?: {
    id: string;
    type: string;
    files: number;
    started_at: number;
  };
  resource_usage: {
    rss_mb: number;
    heap_used_mb: number;
    heap_total_mb: number;
    external_mb: number;
  };
  queue_depth: number;
}

class WorkerRegistry {
  private workers: Map<string, WorkerState> = new Map();
  private workerInstances: Map<string, Worker> = new Map();
  private telemetryClients: Set<WebSocket> = new Set();
  private telemetryInterval?: Timer;

  /**
   * Register a new worker
   */
  register(worker: Worker, id: string): void {
    const state: WorkerState = {
      id,
      status: 'idle',
      created_at: Date.now(),
      messages_processed: 0,
      errors: 0,
      resource_usage: {
        rss_mb: 0,
        heap_used_mb: 0,
        heap_total_mb: 0,
        external_mb: 0,
      },
      queue_depth: 0,
    };

    this.workers.set(id, state);
    this.workerInstances.set(id, worker);

    // Listen for worker messages
    worker.onmessage = (event) => {
      const data = event.data;
      if (data.type === 'telemetry') {
        this.updateTelemetry(id, data);
      } else if (data.type === 'job_start') {
        this.updateJob(id, data.job, 'working');
      } else if (data.type === 'job_complete') {
        this.updateJob(id, undefined, 'idle');
        const state = this.workers.get(id);
        if (state) state.messages_processed++;
      } else if (data.type === 'error') {
        this.recordError(id, data.error);
      }
    };

    worker.onerror = (error) => {
      this.recordError(id, error.message);
    };
  }

  /**
   * Update worker telemetry
   */
  private updateTelemetry(id: string, data: any): void {
    const state = this.workers.get(id);
    if (!state) return;

    state.resource_usage = {
      rss_mb: data.rss_mb || 0,
      heap_used_mb: data.heap_used_mb || 0,
      heap_total_mb: data.heap_total_mb || 0,
      external_mb: data.external_mb || 0,
    };
    state.queue_depth = data.queue_depth || 0;
  }

  /**
   * Update worker job state
   */
  private updateJob(id: string, job: any, status: 'idle' | 'working'): void {
    const state = this.workers.get(id);
    if (!state) return;

    state.status = status;
    state.current_job = job ? {
      id: job.id || 'unknown',
      type: job.type || 'scan',
      files: job.files || 0,
      started_at: job.started_at || Date.now(),
    } : undefined;
  }

  /**
   * Record worker error
   */
  private recordError(id: string, error: string): void {
    const state = this.workers.get(id);
    if (!state) return;

    state.errors++;
    state.last_error = error;
    state.status = 'error';
  }

  /**
   * Get all worker states
   */
  getRegistry(): Record<string, WorkerState> {
    return Object.fromEntries(this.workers);
  }

  /**
   * Get worker state by ID
   */
  getWorker(id: string): WorkerState | undefined {
    return this.workers.get(id);
  }

  /**
   * Scale workers (manual override)
   */
  async scale(targetCount: number): Promise<{ created: number; terminated: number }> {
    const currentCount = this.workers.size;
    let created = 0;
    let terminated = 0;

    if (targetCount > currentCount) {
      // Create new workers
      const toCreate = targetCount - currentCount;
      for (let i = 0; i < toCreate; i++) {
        const id = `w_${Date.now()}_${i}`;
        const worker = new Worker(new URL('./scan-worker.js', import.meta.url), {
          env: { WORKER_ID: id },
        });
        this.register(worker, id);
        created++;
      }
    } else if (targetCount < currentCount) {
      // Terminate excess workers
      const toTerminate = currentCount - targetCount;
      const workersToTerminate = Array.from(this.workers.keys()).slice(0, toTerminate);
      
      for (const id of workersToTerminate) {
        const worker = this.workerInstances.get(id);
        if (worker) {
          worker.terminate();
          const state = this.workers.get(id);
          if (state) state.status = 'terminated';
          this.workers.delete(id);
          this.workerInstances.delete(id);
          terminated++;
        }
      }
    }

    return { created, terminated };
  }

  /**
   * Generate heap snapshot (placeholder - requires Bun.debug API)
   */
  async generateSnapshot(id: string): Promise<Buffer | null> {
    const state = this.workers.get(id);
    if (!state || state.status === 'terminated') {
      return null;
    }

    // Note: Bun.debug API for heap snapshots may not be available yet
    // This is a placeholder for future implementation
    const snapshot = {
      worker_id: id,
      timestamp: Date.now(),
      resource_usage: state.resource_usage,
      status: state.status,
      note: 'Heap snapshot generation requires Bun.debug API',
    };

    return Buffer.from(JSON.stringify(snapshot, null, 2));
  }

  /**
   * Add telemetry WebSocket client
   */
  addTelemetryClient(ws: WebSocket): void {
    this.telemetryClients.add(ws);
    
    // Start telemetry broadcast if first client
    if (this.telemetryClients.size === 1) {
      this.startTelemetryBroadcast();
    }

    ws.onclose = () => {
      this.telemetryClients.delete(ws);
      if (this.telemetryClients.size === 0) {
        this.stopTelemetryBroadcast();
      }
    };
  }

  /**
   * Start telemetry broadcast
   */
  private startTelemetryBroadcast(): void {
    this.telemetryInterval = setInterval(() => {
      const registry = this.getRegistry();
      const telemetry = {
        timestamp: Date.now(),
        workers: registry,
        summary: {
          total: Object.keys(registry).length,
          idle: Object.values(registry).filter(w => w.status === 'idle').length,
          working: Object.values(registry).filter(w => w.status === 'working').length,
          error: Object.values(registry).filter(w => w.status === 'error').length,
          total_queue_depth: Object.values(registry).reduce((sum, w) => sum + w.queue_depth, 0),
        },
      };

      const message = JSON.stringify(telemetry);
      for (const client of this.telemetryClients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      }
    }, 1000); // Broadcast every 1 second
  }

  /**
   * Stop telemetry broadcast
   */
  private stopTelemetryBroadcast(): void {
    if (this.telemetryInterval) {
      clearInterval(this.telemetryInterval);
      this.telemetryInterval = undefined;
    }
  }
}

// Global registry instance
const registry = new WorkerRegistry();

// API Server
const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    // CORS headers
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers, status: 204 });
    }

    // WebSocket upgrade for telemetry
    if (url.pathname === '/ws/workers/telemetry') {
      if (server.upgrade(req)) {
        return; // Upgrade successful
      }
      return new Response('WebSocket upgrade failed', { status: 500 });
    }

    // GET /api/workers/registry
    if (req.method === 'GET' && url.pathname === '/api/workers/registry') {
      return new Response(JSON.stringify(registry.getRegistry(), null, 2), { headers });
    }

    // POST /api/workers/scale
    if (req.method === 'POST' && url.pathname === '/api/workers/scale') {
      const body = await req.json();
      const targetCount = parseInt(body.count || '0', 10);
      
      if (isNaN(targetCount) || targetCount < 0) {
        return new Response(
          JSON.stringify({ error: 'Invalid count parameter' }),
          { headers, status: 400 }
        );
      }

      const result = await registry.scale(targetCount);
      return new Response(JSON.stringify(result, null, 2), { headers });
    }

    // GET /api/workers/snapshot/:id
    if (req.method === 'GET' && url.pathname.startsWith('/api/workers/snapshot/')) {
      const id = url.pathname.split('/').pop();
      if (!id) {
        return new Response(
          JSON.stringify({ error: 'Worker ID required' }),
          { headers, status: 400 }
        );
      }

      const snapshot = await registry.generateSnapshot(id);
      if (!snapshot) {
        return new Response(
          JSON.stringify({ error: 'Worker not found or terminated' }),
          { headers, status: 404 }
        );
      }

      return new Response(snapshot, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="worker-${id}-${Date.now()}.heapsnapshot"`,
        },
      });
    }

    return new Response('Not Found', { status: 404 });
  },

  websocket: {
    message(ws, message) {
      // Handle WebSocket messages if needed
    },
    open(ws) {
      registry.addTelemetryClient(ws);
    },
    close(ws) {
      // Cleanup handled in registry
    },
  },
});

console.log(`🚀 Worker Telemetry API Server running on http://localhost:${server.port}`);
console.log(`📊 GET  /api/workers/registry      → Live worker state`);
console.log(`⚙️  POST /api/workers/scale         → Manual override`);
console.log(`📡 WS   /ws/workers/telemetry        → Live RSS + queue`);
console.log(`💾 GET  /api/workers/snapshot/:id   → Download .heapsnapshot`);

export { registry };

