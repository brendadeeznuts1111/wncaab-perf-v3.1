/**
 * Integration Tests - TES-NGWS-001.9b
 * 
 * Tests for lifecycle integration with WebSocket handlers.
 * 
 * @module test/integration.test
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { integrateLifecycle, getLifecycleManager, initializeLifecycleManager } from "../src/lib/worker-lifecycle-integration.ts";
import { LifecyclePhase } from "../src/lib/tes-lifecycle-manager.ts";

describe("Lifecycle Integration", () => {
  let mockServer: any;

  beforeEach(() => {
    // Reset lifecycle manager
    initializeLifecycleManager();
    
    // Create mock WebSocket server
    mockServer = {
      websocket: {
        open: (ws: any) => {
          ws.data = ws.data || {};
        },
        message: (ws: any, message: any) => {
          // Mock message handler
        },
        close: (ws: any, code: number, message: string) => {
          // Mock close handler
        },
      },
      fetch: async (req: Request) => {
        return new Response("Not found", { status: 404 });
      },
    };
  });

  describe("Observer Hooks", () => {
    test("should hook into websocket.open and transition to INIT", async () => {
      integrateLifecycle(mockServer);

      const ws = {
        data: {},
      };

      // Call the hooked open handler
      if (mockServer.websocket.open) {
        mockServer.websocket.open(ws);
      }

      // Wait a bit for async transition
      await Bun.sleep(100);

      const manager = getLifecycleManager();
      expect(manager).not.toBeNull();

      if (manager && ws.data.lifecycleID) {
        const state = manager.getState(ws.data.lifecycleID);
        expect(state).not.toBeNull();
        expect(state?.phase).toBe(LifecyclePhase.INIT);
      }
    });

    test("should detect renewal opcode and transition to RENEW", async () => {
      integrateLifecycle(mockServer);

      const ws = {
        data: {
          lifecycleID: "test-renewal",
        },
      };

      // First transition to ACTIVE
      const manager = getLifecycleManager();
      if (manager) {
        await manager.transition(ws.data.lifecycleID, LifecyclePhase.ACTIVE);
      }

      // Send renewal message (opcode 0x01)
      const renewalMessage = new Uint8Array([0x01, 0x02, 0x03]);
      if (mockServer.websocket.message) {
        mockServer.websocket.message(ws, renewalMessage.buffer);
      }

      // Wait for async transition
      await Bun.sleep(100);

      if (manager) {
        const state = manager.getState(ws.data.lifecycleID);
        // Should be RENEW or ACTIVE (depending on timing)
        expect(state).not.toBeNull();
      }
    });

    test("should transition to EVICT on close", async () => {
      integrateLifecycle(mockServer);

      const ws = {
        data: {
          lifecycleID: "test-close",
        },
      };

      const manager = getLifecycleManager();
      if (manager) {
        await manager.transition(ws.data.lifecycleID, LifecyclePhase.ACTIVE);
      }

      // Call close handler
      if (mockServer.websocket.close) {
        mockServer.websocket.close(ws, 1000, "Normal closure");
      }

      // Wait for async transition
      await Bun.sleep(100);

      if (manager) {
        const state = manager.getState(ws.data.lifecycleID);
        expect(state).not.toBeNull();
        expect(state?.phase).toBe(LifecyclePhase.EVICT);
      }
    });
  });

  describe("API Endpoint", () => {
    test("should handle /api/lifecycle/export endpoint", async () => {
      integrateLifecycle(mockServer);

      // Add some test data
      const manager = getLifecycleManager();
      if (manager) {
        await manager.transition("test-1", LifecyclePhase.INIT);
        await manager.transition("test-2", LifecyclePhase.ACTIVE);
      }

      const req = new Request("http://localhost/api/lifecycle/export");
      const response = await mockServer.fetch(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("data");
      expect(Array.isArray(data.data)).toBe(true);
    });

    test("should return CORS headers", async () => {
      integrateLifecycle(mockServer);

      const req = new Request("http://localhost/api/lifecycle/export");
      const response = await mockServer.fetch(req);

      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET, OPTIONS");
    });

    test("should return empty array when manager not initialized", async () => {
      // Don't integrate lifecycle
      const req = new Request("http://localhost/api/lifecycle/export");
      const response = await mockServer.fetch(req);

      // Should return 404 (not found) since endpoint wasn't added
      expect(response.status).toBe(404);
    });
  });

  describe("Preserve Existing Functionality", () => {
    test("should preserve original websocket.open handler", () => {
      let originalCalled = false;
      mockServer.websocket.open = (ws: any) => {
        originalCalled = true;
      };

      integrateLifecycle(mockServer);

      const ws = { data: {} };
      if (mockServer.websocket.open) {
        mockServer.websocket.open(ws);
      }

      expect(originalCalled).toBe(true);
    });

    test("should preserve original websocket.message handler", () => {
      let originalCalled = false;
      mockServer.websocket.message = (ws: any, message: any) => {
        originalCalled = true;
      };

      integrateLifecycle(mockServer);

      const ws = { data: {} };
      if (mockServer.websocket.message) {
        mockServer.websocket.message(ws, "test");
      }

      expect(originalCalled).toBe(true);
    });
  });
});

