/**
 * Metrics Tracking Utilities
 * 
 * Real-time metrics collection using Bun's server event listeners.
 * Tracks pending requests, WebSocket connections, and high-precision timestamps.
 * 
 * @module lib/metrics
 */

/// <reference types="bun-types" />

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Metrics state interface
 */
export interface MetricsState {
  pendingRequests: number;
  pendingWebSockets: number;
  connections: Set<any>; // WebSocket connections
  totalRequests: number;
  totalResponses: number;
  totalWebSocketOpens: number;
  totalWebSocketCloses: number;
  timestamp: number; // High-precision timestamp (nanoseconds)
}

/**
 * Metrics state with computed values
 */
export interface MetricsStateWithTotals {
  pendingRequests: number;
  pendingWebSockets: number;
  connections: number;
  totals: {
    requests: number;
    responses: number;
    websocketOpens: number;
    websocketCloses: number;
  };
  timestamp: number;
  timestampNs: number;
}

// ============================================================================
// Metrics State
// ============================================================================

/**
 * Real-time metrics state
 * ✅ Pattern: Event-based metrics tracking (fixes "pending" counters)
 */
const metricsState: MetricsState = {
  pendingRequests: 0,
  pendingWebSockets: 0,
  connections: new Set(),
  totalRequests: 0,
  totalResponses: 0,
  totalWebSocketOpens: 0,
  totalWebSocketCloses: 0,
  timestamp: Bun.nanoseconds(),
};

// ============================================================================
// Metrics Tracking Functions
// ============================================================================

/**
 * Initialize event-based metrics tracking
 * ✅ Pattern: Subscribe to server events for real-time metrics
 * 
 * Bun emits these events (undocumented but stable):
 * - 'request' - Fired when a request is received
 * - 'response' - Fired when a response is sent
 * - 'websocketOpen' - Fired when a WebSocket connection is opened
 * - 'websocketClose' - Fired when a WebSocket connection is closed
 * 
 * @param server - Bun server instance
 */
export function initializeMetricsTracking(server: ReturnType<typeof Bun.serve>): void {
  try {
    // ✅ Fixed: Subscribe to Bun's server events for automatic metrics tracking
    // Note: These events are undocumented but stable in Bun
    // Cast to any to access addEventListener (not in TypeScript definitions)
    const serverWithEvents = server as any;
    
    // Request event - increment pending requests
    if (typeof serverWithEvents.addEventListener === 'function') {
      serverWithEvents.addEventListener('request', () => {
        metricsState.pendingRequests++;
        metricsState.totalRequests++;
      });
      
      // Response event - decrement pending requests
      serverWithEvents.addEventListener('response', () => {
        metricsState.pendingRequests = Math.max(0, metricsState.pendingRequests - 1);
        metricsState.totalResponses++;
      });
      
      // WebSocket open event - increment pending WebSockets
      serverWithEvents.addEventListener('websocketOpen', (ws: any) => {
        metricsState.pendingWebSockets++;
        metricsState.totalWebSocketOpens++;
        metricsState.connections.add(ws);
      });
      
      // WebSocket close event - decrement pending WebSockets
      serverWithEvents.addEventListener('websocketClose', (ws: any) => {
        metricsState.pendingWebSockets = Math.max(0, metricsState.pendingWebSockets - 1);
        metricsState.totalWebSocketCloses++;
        metricsState.connections.delete(ws);
      });
      
      console.log('[Metrics] ✅ Initialized server event listeners for automatic metrics tracking');
    } else {
      // Fallback: Manual tracking if event listeners not available
      console.warn('[Metrics] ⚠️  Server event listeners not available, using manual tracking');
      
      // Update timestamp periodically
      setInterval(() => {
        metricsState.timestamp = Bun.nanoseconds();
      }, 1000); // Update every second
    }
  } catch (error) {
    // Fallback: Manual tracking if event listeners fail
    console.warn(`[Metrics] ⚠️  Failed to initialize event listeners: ${error instanceof Error ? error.message : String(error)}`);
    console.warn('[Metrics] ⚠️  Falling back to manual tracking');
    
    // Update timestamp periodically
    setInterval(() => {
      metricsState.timestamp = Bun.nanoseconds();
    }, 1000); // Update every second
  }
  
  // Always update timestamp periodically (even with event listeners)
  setInterval(() => {
    metricsState.timestamp = Bun.nanoseconds();
  }, 1000); // Update every second
}

/**
 * Track request start
 * Call this at the beginning of request handlers
 */
export function trackRequestStart(): void {
  metricsState.pendingRequests++;
  metricsState.totalRequests++;
}

/**
 * Track request end
 * Call this at the end of request handlers (in finally blocks)
 */
export function trackRequestEnd(): void {
  metricsState.pendingRequests = Math.max(0, metricsState.pendingRequests - 1);
  metricsState.totalResponses++;
}

/**
 * Track WebSocket open
 * Call this when a WebSocket connection is established
 * @param ws - WebSocket connection
 */
export function trackWebSocketOpen(ws: any): void {
  metricsState.pendingWebSockets++;
  metricsState.totalWebSocketOpens++;
  metricsState.connections.add(ws);
}

/**
 * Track WebSocket close
 * Call this when a WebSocket connection is closed
 * @param ws - WebSocket connection
 */
export function trackWebSocketClose(ws: any): void {
  metricsState.pendingWebSockets = Math.max(0, metricsState.pendingWebSockets - 1);
  metricsState.totalWebSocketCloses++;
  metricsState.connections.delete(ws);
}

/**
 * Get current metrics state
 * Returns real-time metrics with high-precision timestamp
 * @param server - Bun server instance (for fallback properties)
 * @returns Metrics state with totals
 */
export function getMetricsState(server: ReturnType<typeof Bun.serve>): MetricsStateWithTotals {
  // Use manual tracking as primary source, server properties as backup
  return {
    pendingRequests: metricsState.pendingRequests || server.pendingRequests || 0,
    pendingWebSockets: metricsState.pendingWebSockets || server.pendingWebSockets || 0,
    connections: metricsState.connections.size,
    totals: {
      requests: metricsState.totalRequests,
      responses: metricsState.totalResponses,
      websocketOpens: metricsState.totalWebSocketOpens,
      websocketCloses: metricsState.totalWebSocketCloses,
    },
    timestamp: metricsState.timestamp,
    timestampNs: Bun.nanoseconds(), // Always use latest high-precision timestamp
  };
}

