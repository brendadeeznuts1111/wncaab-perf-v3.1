/**
 * Worker Lifecycle Integration - TES-NGWS-001.9b
 * 
 * Observer pattern integration for WebSocket lifecycle management.
 * Hooks into existing WebSocket handlers without mutation, preserving modularity.
 * 
 * @module src/lib/worker-lifecycle-integration
 */

import { TesLifecycleManager, LifecyclePhase } from "./tes-lifecycle-manager.ts";
import { logLifecycleEvent } from "./lifecycle-security-audit.ts";

/**
 * WebSocket server interface (Bun.serve() return type)
 */
interface WebSocketServer {
  websocket?: {
    open?: (ws: any) => void;
    message?: (ws: any, message: any) => void;
    close?: (ws: any, code: number, message: string) => void;
  };
  fetch?: (req: Request) => Response | Promise<Response>;
}

/**
 * WebSocket data interface
 */
interface WebSocketData {
  lifecycleID?: string;
  pathname?: string;
  [key: string]: any;
}

/**
 * Global lifecycle manager instance
 */
let lifecycleManager: TesLifecycleManager | null = null;

/**
 * Initialize lifecycle manager
 * 
 * @param kv - Optional KV namespace for persistence
 */
export function initializeLifecycleManager(kv?: any): TesLifecycleManager {
  if (!lifecycleManager) {
    lifecycleManager = new TesLifecycleManager(kv);
  }
  return lifecycleManager;
}

/**
 * Get lifecycle manager instance
 * 
 * @returns Lifecycle manager instance
 */
export function getLifecycleManager(): TesLifecycleManager | null {
  return lifecycleManager;
}

/**
 * Integrate lifecycle hooks into existing WebSocket server
 * 
 * Uses observer pattern to hook into WebSocket handlers without mutation.
 * Preserves existing functionality while adding lifecycle tracking.
 * 
 * @param server - Bun.serve() server instance
 */
export function integrateLifecycle(server: WebSocketServer): void {
  if (!lifecycleManager) {
    lifecycleManager = new TesLifecycleManager();
  }

  const manager = lifecycleManager;

  // Hook into websocket.open
  if (server.websocket?.open) {
    const originalOpen = server.websocket.open;
    server.websocket.open = (ws: any) => {
      // Generate lifecycle ID
      const sessionID = crypto.randomUUID();
      (ws.data as WebSocketData).lifecycleID = sessionID;

      // Transition to INIT phase
      manager.transition(sessionID, LifecyclePhase.INIT, {
        connections: 1,
        latency: 0,
        errorRate: 0,
      }).then((tension) => {
        logLifecycleEvent(LifecyclePhase.INIT, "TRANSITION", {
          sessionID,
          phase: LifecyclePhase.INIT,
          tension: tension.score,
          domain: "nowgoal26.com",
          scope: "LIFECYCLE",
        });
      }).catch((error) => {
        console.error(`[Lifecycle Integration] Failed to transition to INIT:`, error);
      });

      // Call original handler
      originalOpen(ws);
    };
  }

  // Hook into websocket.message
  if (server.websocket?.message) {
    const originalMessage = server.websocket.message;
    server.websocket.message = (ws: any, message: any) => {
      const sessionID = (ws.data as WebSocketData).lifecycleID;
      
      if (sessionID) {
        // Detect renewal opcode (0x01) or renewal message
        let isRenewal = false;
        
        if (message instanceof ArrayBuffer) {
          // Binary message: check first byte for opcode
          const view = new Uint8Array(message);
          if (view.length > 0 && view[0] === 0x01) {
            isRenewal = true;
          }
        } else if (typeof message === 'string') {
          try {
            const data = JSON.parse(message);
            // Check for renewal indicators
            if (data.type === 'renew' || data.opcode === 0x01 || data.renewal) {
              isRenewal = true;
            }
          } catch {
            // Not JSON, ignore
          }
        }

        if (isRenewal) {
          // Transition to RENEW phase
          manager.transition(sessionID, LifecyclePhase.RENEW, {
            renewals: 1,
            latency: 0,
            errorRate: 0,
          }).then((tension) => {
            logLifecycleEvent(LifecyclePhase.RENEW, "TRANSITION", {
              sessionID,
              phase: LifecyclePhase.RENEW,
              tension: tension.score,
              domain: "nowgoal26.com",
              scope: "LIFECYCLE",
            });

            // Check for tension spike
            if (tension.score > 0.7) {
              logLifecycleEvent(LifecyclePhase.RENEW, "TENSION_SPIKE", {
                sessionID,
                phase: LifecyclePhase.RENEW,
                tension: tension.score,
                domain: "nowgoal26.com",
                scope: "LIFECYCLE",
              });
            }

            // Check forecast alert
            if (tension.forecast === "EVICT_IMMINENT") {
              logLifecycleEvent(LifecyclePhase.RENEW, "FORECAST_ALERT", {
                sessionID,
                phase: LifecyclePhase.RENEW,
                tension: tension.score,
                domain: "nowgoal26.com",
                scope: "LIFECYCLE",
              });
            }
          }).catch((error) => {
            console.error(`[Lifecycle Integration] Failed to transition to RENEW:`, error);
          });
        } else {
          // Regular message: ensure ACTIVE phase
          const state = manager.getState(sessionID);
          if (state && state.phase !== LifecyclePhase.ACTIVE) {
            manager.transition(sessionID, LifecyclePhase.ACTIVE, {
              messages: 1,
              latency: 0,
              errorRate: 0,
            }).catch((error) => {
              console.error(`[Lifecycle Integration] Failed to transition to ACTIVE:`, error);
            });
          }
        }
      }

      // Call original handler
      originalMessage(ws, message);
    };
  }

  // Hook into websocket.close
  if (server.websocket?.close) {
    const originalClose = server.websocket.close;
    server.websocket.close = (ws: any, code: number, message: string) => {
      const sessionID = (ws.data as WebSocketData).lifecycleID;
      
      if (sessionID) {
        // Transition to EVICT phase
        manager.transition(sessionID, LifecyclePhase.EVICT, {
          closeCode: code,
          latency: 0,
          errorRate: 0,
        }).then((tension) => {
          logLifecycleEvent(LifecyclePhase.EVICT, "TRANSITION", {
            sessionID,
            phase: LifecyclePhase.EVICT,
            tension: tension.score,
            domain: "nowgoal26.com",
            scope: "LIFECYCLE",
          });

          // Cleanup: remove from state after a delay
          setTimeout(() => {
            manager?.clearExpiredSessions(0); // Immediate cleanup for EVICT
          }, 5000);
        }).catch((error) => {
          console.error(`[Lifecycle Integration] Failed to transition to EVICT:`, error);
        });
      }

      // Call original handler
      originalClose(ws, code, message);
    };
  }

  // Add /api/lifecycle/export endpoint
  if (server.fetch) {
    const originalFetch = server.fetch;
    server.fetch = async (req: Request): Promise<Response> => {
      const url = new URL(req.url);

      // Handle lifecycle export endpoint
      if (url.pathname === '/api/lifecycle/export') {
        const vizData = manager.exportVizData();
        
        return new Response(JSON.stringify({
          data: vizData,
          count: vizData.length,
          timestamp: Date.now(),
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'X-APEX-Component': 'tes-lifecycle-manager',
            'X-APEX-Version': '1.0.0',
          },
        });
      }

      // Chain to original fetch handler
      return originalFetch(req);
    };
  }
}

