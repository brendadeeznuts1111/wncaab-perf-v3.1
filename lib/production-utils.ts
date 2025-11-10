/**
 * Production Utils - Stub Implementation
 * 
 * Minimal stub to allow dev-server.ts to compile.
 * TODO: Implement full production utilities
 */

export function createRequestTimeout(signal: AbortSignal | null, ms: number): AbortSignal {
  if (signal?.aborted) {
    return signal;
  }
  return AbortSignal.timeout(ms);
}

export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  maxRequests: number = 100,
  windowMs: number = 60000
): T {
  return handler;
}

export function log(level: 'info' | 'error' | 'warn', message: string, meta?: Record<string, any>) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, meta || '');
}

export interface Metrics {
  [key: string]: any;
}

let metrics: Metrics = {};

export function getMetrics(): Metrics {
  return { ...metrics };
}

export function updateMetrics(updates: Partial<Metrics>) {
  metrics = { ...metrics, ...updates };
}

export function incrementMetric(key: string, value: number = 1) {
  metrics[key] = (metrics[key] || 0) + value;
}

