/**
 * TES Lifecycle Manager - TES-NGWS-001.9a
 * 
 * Zero-npm, enterprise-grade state orchestration system for WebSocket lifecycle management.
 * Tracks session phases, calculates tension scores, and provides visualization data export.
 * 
 * @module src/lib/tes-lifecycle-manager
 */

import { logSecurityEvent } from "./security-audit.ts";

/**
 * Lifecycle phases for WebSocket sessions
 */
export enum LifecyclePhase {
  INIT = "INIT",      // WS upgrade pending
  AUTH = "AUTH",      // JWT validated
  ACTIVE = "ACTIVE",  // Streaming + heartbeats
  RENEW = "RENEW",    // Subprotocol rotation
  EVICT = "EVICT"     // Graceful close
}

/**
 * Tension score with phase and metrics
 */
export interface TensionScore {
  phase: LifecyclePhase;
  score: number; // 0.0 to 1.0
  metrics: Record<string, number>;
  forecast?: "STABLE" | "EVICT_IMMINENT";
}

/**
 * Session state tracking
 */
interface SessionState {
  phase: LifecyclePhase;
  ts: number; // timestamp
  tension: TensionScore;
}

/**
 * KV namespace shim for Cloudflare Workers KV
 * Local dev: In-memory Map fallback
 * Production: Cloudflare Workers KV
 */
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

/**
 * In-memory KV shim for local development
 */
class InMemoryKV implements KVNamespace {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    
    return entry.value;
  }

  async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
    const expiresAt = options?.expirationTtl 
      ? Date.now() + (options.expirationTtl * 1000)
      : undefined;
    
    this.store.set(key, { value, expiresAt });
  }
}

/**
 * TES Lifecycle Manager
 * 
 * Manages WebSocket session lifecycle states with tension forecasting
 */
export class TesLifecycleManager {
  private state: Map<string, SessionState> = new Map();
  private kvVault: KVNamespace;
  private tensionCache: Map<string, { score: TensionScore; cachedAt: number }> = new Map();
  private readonly TENSION_CACHE_TTL = 5000; // 5 seconds

  constructor(kv?: KVNamespace) {
    // Use provided KV or fallback to in-memory shim
    this.kvVault = kv || new InMemoryKV();
  }

  /**
   * Transition session to a new phase
   * 
   * @param sessionID - Unique session identifier
   * @param toPhase - Target lifecycle phase
   * @param metrics - Optional performance metrics
   * @returns Calculated tension score
   */
  async transition(
    sessionID: string,
    toPhase: LifecyclePhase,
    metrics?: Record<string, number>
  ): Promise<TensionScore> {
    const now = Date.now();
    const prev = this.state.get(sessionID);
    
    // Calculate tension with hybrid metrics
    const tension = this.calculateTension(toPhase, {
      ...metrics,
      duration: now - (prev?.ts || now),
    });

    // Update state
    this.state.set(sessionID, {
      phase: toPhase,
      ts: now,
      tension,
    });

    // Persist to KV (durable storage)
    try {
      await this.kvVault.put(
        `tes:lifecycle:${sessionID}`,
        JSON.stringify({
          phase: toPhase,
          tension,
          ts: now,
        }),
        { expirationTtl: 3600 } // 1 hour TTL
      );
    } catch (error) {
      console.warn(`[TES Lifecycle] KV persistence failed for ${sessionID}:`, error);
    }

    // Log security event
    logSecurityEvent("LIFECYCLE_TRANSITION", {
      domain: "nowgoal26.com",
      type: "LIFECYCLE",
      protocol: "WebSocket",
      api: "Bun.WebSocket",
      ref: "https://bun.sh/docs/api/websocket",
      sessionID,
      phase: toPhase,
      tension: tension.score.toString(),
    });

    return tension;
  }

  /**
   * Get current state for a session
   * 
   * @param sessionID - Unique session identifier
   * @returns Session state or null if not found
   */
  getState(sessionID: string): { phase: LifecyclePhase; tension: TensionScore } | null {
    const state = this.state.get(sessionID);
    if (!state) return null;

    return {
      phase: state.phase,
      tension: state.tension,
    };
  }

  /**
   * Export visualization data
   * Returns array of session states for dashboard rendering
   * 
   * @returns Array of session visualization data
   */
  exportVizData(): Array<{ sessionID: string; phase: LifecyclePhase; tension: number }> {
    return Array.from(this.state.entries()).map(([sessionID, state]) => ({
      sessionID,
      phase: state.phase,
      tension: state.tension.score,
    }));
  }

  /**
   * Calculate tension score with hybrid metrics
   * 
   * Hybrid metrics fusion:
   * - Base metrics (60%): latency, errorRate
   * - Advanced metrics (40%): queueDepth, memPressure
   * - Phase weights: AUTH=1.5, RENEW=2.0, default=1.0
   * 
   * @param phase - Current lifecycle phase
   * @param metrics - Performance metrics
   * @returns Calculated tension score
   */
  private calculateTension(
    phase: LifecyclePhase,
    metrics: Record<string, number>
  ): TensionScore {
    // Check cache first
    const cacheKey = `${phase}:${JSON.stringify(metrics)}`;
    const cached = this.tensionCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < this.TENSION_CACHE_TTL) {
      return cached.score;
    }

    // Base metrics: latency (normalized 0-1) + errorRate (0-1)
    const latency = (metrics.latency || 0) / 100; // Normalize: 100ms = 1.0
    const errorRate = metrics.errorRate || 0; // Already 0-1
    const base = Math.min(1, latency + errorRate);

    // Advanced metrics: queueDepth + memPressure
    const queueDepth = (metrics.queueDepth || 0) / 100; // Normalize: 100 = 1.0
    const memPressureMB = (metrics.memPressure || 0) / (1024 * 1024); // Convert bytes to MB, normalize
    const memPressure = Math.min(1, memPressureMB / 1024); // 1GB = 1.0
    const advanced = Math.min(1, queueDepth + memPressure);

    // Weighted combination: base * 0.6 + advanced * 0.4
    const combined = base * 0.6 + advanced * 0.4;

    // Phase weights
    const phaseWeights: Record<LifecyclePhase, number> = {
      [LifecyclePhase.AUTH]: 1.5,
      [LifecyclePhase.RENEW]: 2.0,
      [LifecyclePhase.INIT]: 1.0,
      [LifecyclePhase.ACTIVE]: 1.0,
      [LifecyclePhase.EVICT]: 1.0,
    };

    const phaseWeight = phaseWeights[phase] || 1.0;
    const score = Math.min(1, combined * phaseWeight);

    // AI forecast stub: simple linear prediction
    const forecast: "STABLE" | "EVICT_IMMINENT" = score > 0.7 ? "EVICT_IMMINENT" : "STABLE";

    // Get runtime memory metrics via Bun introspection
    let runtimeMemPressure = 0;
    try {
      // Bun.inspect.process.memoryUsage() returns memory stats
      const memUsage = (Bun as any).inspect?.process?.memoryUsage?.();
      if (memUsage) {
        runtimeMemPressure = memUsage.heapUsed / (1024 * 1024); // MB
      }
    } catch (error) {
      // Fallback if introspection not available
      runtimeMemPressure = metrics.memPressure || 0;
    }

    // Enrich metrics with runtime data
    const enrichedMetrics: Record<string, number> = {
      ...metrics,
      latency: metrics.latency || 0,
      errorRate: metrics.errorRate || 0,
      queueDepth: metrics.queueDepth || this.state.size, // Active sessions as proxy
      memPressure: runtimeMemPressure,
      baseScore: base,
      advancedScore: advanced,
      combinedScore: combined,
      phaseWeight,
    };

    const tensionScore: TensionScore = {
      phase,
      score,
      metrics: enrichedMetrics,
      forecast,
    };

    // Cache the result
    this.tensionCache.set(cacheKey, {
      score: tensionScore,
      cachedAt: Date.now(),
    });

    return tensionScore;
  }

  /**
   * Get all active sessions count
   * 
   * @returns Number of active sessions
   */
  getActiveSessionsCount(): number {
    return this.state.size;
  }

  /**
   * Clear expired sessions (cleanup)
   * 
   * @param maxAge - Maximum age in milliseconds (default: 1 hour)
   */
  clearExpiredSessions(maxAge: number = 3600000): void {
    const now = Date.now();
    for (const [sessionID, state] of this.state.entries()) {
      // If maxAge is 0, clear all sessions immediately
      if (maxAge === 0 || now - state.ts > maxAge) {
        this.state.delete(sessionID);
      }
    }
  }
}

