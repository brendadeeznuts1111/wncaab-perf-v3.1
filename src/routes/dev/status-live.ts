/**
 * @file status-live.ts
 * @description WebSocket handler for live status updates with enhanced error handling
 * @ticket TES-OPS-004.B.8.15
 */

import { logTESError, inspectTESError, type ErrorContext } from '../../lib/tes-error-inspector.ts';
import type { ServerWebSocket } from 'bun';

/**
 * @interface WebSocketData
 * @description WebSocket connection data
 */
interface WebSocketData {
  sessionId?: string;
  pathname?: string;
}

/**
 * @type WebSocketHandler
 * @description Bun WebSocket handler type
 */
type WebSocketHandler = {
  message(ws: ServerWebSocket<WebSocketData>, message: string | Buffer): void | Promise<void>;
  open?(ws: ServerWebSocket<WebSocketData>): void | Promise<void>;
  close?(ws: ServerWebSocket<WebSocketData>): void | Promise<void>;
  error?(ws: ServerWebSocket<WebSocketData>, error: Error): void | Promise<void>;
};

/**
 * @handler statusLiveWebSocketHandler
 * @description WebSocket handler for /api/dev/status/live with enhanced error inspection
 */
export const statusLiveWebSocketHandler: WebSocketHandler = {
  async open(ws) {
    const sessionId = crypto.randomUUID();
    (ws.data as WebSocketData).sessionId = sessionId;
    
    console.log(`[Status-Live] Client connected: ${sessionId}`);
    
    // Send initial status
    try {
      const status = await getStatusSnapshot();
      ws.send(JSON.stringify({
        type: 'status',
        timestamp: Date.now(),
        data: status
      }));
    } catch (error) {
      logTESError(error, {
        route: '/api/dev/status/live',
        sessionId
      });
      
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to get initial status',
        debug: inspectTESError(error, { sessionId })
      }));
    }
  },

  async message(ws, message) {
    const sessionId = (ws.data as WebSocketData).sessionId;
    
    try {
      const data = JSON.parse(message.toString());
      
      // Handle different message types
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        return;
      }
      
      if (data.type === 'subscribe') {
        // Subscribe to specific metrics
        ws.send(JSON.stringify({
          type: 'subscribed',
          metrics: data.metrics || ['all']
        }));
        return;
      }
      
      // Unknown message type
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Unknown message type',
        received: data.type
      }));
      
    } catch (error) {
      // ✅ Enhanced error handling with context
      logTESError(error, {
        route: '/api/dev/status/live',
        sessionId
      });
      
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
        debug: inspectTESError(error, { sessionId })
      }));
    }
  },

  close(ws) {
    const sessionId = (ws.data as WebSocketData).sessionId;
    console.log(`[Status-Live] Client disconnected: ${sessionId}`);
  },

  error(ws, error) {
    const sessionId = (ws.data as WebSocketData).sessionId;
    
    // ✅ Log WebSocket errors with full context
    logTESError(error, {
      route: '/api/dev/status/live',
      sessionId,
      component: 'websocket-handler'
    });
    
    try {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'WebSocket error occurred',
        debug: inspectTESError(error, { sessionId })
      }));
    } catch (sendError) {
      // If we can't send, just log it
      console.error('[Status-Live] Failed to send error message:', sendError);
    }
  }
};

/**
 * @function getStatusSnapshot
 * @description Get current system status snapshot
 * @returns Status data object
 */
async function getStatusSnapshot(): Promise<Record<string, any>> {
  // Import here to avoid circular dependencies
  const { getCpuLoad } = await import('../../lib/status-aggregator.ts');
  
  try {
    const cpu = await getCpuLoad();
    const memUsage = process.memoryUsage();
    
    return {
      cpu,
      memory: {
        heapUsed: memUsage.heapUsed,
        rss: memUsage.rss
      },
      uptime: process.uptime(),
      timestamp: Date.now()
    };
  } catch (error) {
    // If status aggregation fails, return partial data
    logTESError(error, {
      route: '/api/dev/status/live',
      component: 'status-snapshot'
    });
    
    return {
      error: 'Partial status available',
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      timestamp: Date.now()
    };
  }
}

