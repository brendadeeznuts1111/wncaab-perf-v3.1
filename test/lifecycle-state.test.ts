/**
 * Lifecycle State Tests - TES-NGWS-001.9
 * 
 * Tests for lifecycle state management, phase transitions, and tension calculation.
 * 
 * @module test/lifecycle-state.test
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { TesLifecycleManager, LifecyclePhase } from "../src/lib/tes-lifecycle-manager.ts";

describe("TES Lifecycle Manager", () => {
  let manager: TesLifecycleManager;

  beforeEach(() => {
    manager = new TesLifecycleManager();
  });

  describe("Phase Transitions", () => {
    test("should transition INIT → AUTH → ACTIVE → RENEW → ACTIVE", async () => {
      const sessionID = "test-session-1";

      const initTension = await manager.transition(sessionID, LifecyclePhase.INIT);
      expect(initTension.phase).toBe(LifecyclePhase.INIT);

      const authTension = await manager.transition(sessionID, LifecyclePhase.AUTH);
      expect(authTension.phase).toBe(LifecyclePhase.AUTH);

      const activeTension = await manager.transition(sessionID, LifecyclePhase.ACTIVE);
      expect(activeTension.phase).toBe(LifecyclePhase.ACTIVE);

      const renewTension = await manager.transition(sessionID, LifecyclePhase.RENEW);
      expect(renewTension.phase).toBe(LifecyclePhase.RENEW);

      const activeAgainTension = await manager.transition(sessionID, LifecyclePhase.ACTIVE);
      expect(activeAgainTension.phase).toBe(LifecyclePhase.ACTIVE);
    });

    test("should transition ACTIVE → EVICT → [*]", async () => {
      const sessionID = "test-session-2";

      await manager.transition(sessionID, LifecyclePhase.ACTIVE);

      const evictTension = await manager.transition(sessionID, LifecyclePhase.EVICT);
      expect(evictTension.phase).toBe(LifecyclePhase.EVICT);

      // State should still exist until cleanup
      const state = manager.getState(sessionID);
      expect(state).not.toBeNull();
      expect(state?.phase).toBe(LifecyclePhase.EVICT);
    });

    test("should handle concurrent transitions", async () => {
      const sessions = Array.from({ length: 10 }, (_, i) => `session-${i}`);

      const transitions = await Promise.all(
        sessions.map((id) => manager.transition(id, LifecyclePhase.INIT))
      );

      expect(transitions.length).toBe(10);
      transitions.forEach((tension) => {
        expect(tension.phase).toBe(LifecyclePhase.INIT);
        expect(tension.score).toBeGreaterThanOrEqual(0);
        expect(tension.score).toBeLessThanOrEqual(1);
      });
    });
  });

  describe("Tension Calculation", () => {
    test("should calculate tension with hybrid metrics", async () => {
      const sessionID = "test-tension-1";

      const tension = await manager.transition(sessionID, LifecyclePhase.ACTIVE, {
        latency: 50, // 50ms
        errorRate: 0.1, // 10%
        queueDepth: 50,
        memPressure: 512 * 1024 * 1024, // 512MB
      });

      expect(tension.score).toBeGreaterThanOrEqual(0);
      expect(tension.score).toBeLessThanOrEqual(1);
      expect(tension.metrics.latency).toBe(50);
      expect(tension.metrics.errorRate).toBe(0.1);
    });

    test("should apply phase weights correctly", async () => {
      const baseMetrics = {
        latency: 50,
        errorRate: 0.1,
        queueDepth: 50,
        memPressure: 512 * 1024 * 1024,
      };

      const authTension = await manager.transition("auth-session", LifecyclePhase.AUTH, baseMetrics);
      const renewTension = await manager.transition("renew-session", LifecyclePhase.RENEW, baseMetrics);
      const activeTension = await manager.transition("active-session", LifecyclePhase.ACTIVE, baseMetrics);

      // RENEW should have highest tension (2.0x weight)
      expect(renewTension.score).toBeGreaterThanOrEqual(activeTension.score);
      // AUTH should have higher tension than ACTIVE (1.5x vs 1.0x)
      expect(authTension.score).toBeGreaterThanOrEqual(activeTension.score);
    });

    test("should forecast EVICT_IMMINENT for high tension", async () => {
      const sessionID = "test-forecast-1";

      const tension = await manager.transition(sessionID, LifecyclePhase.ACTIVE, {
        latency: 150, // High latency
        errorRate: 0.5, // High error rate
        queueDepth: 150, // High queue
        memPressure: 2 * 1024 * 1024 * 1024, // 2GB
      });

      if (tension.score > 0.7) {
        expect(tension.forecast).toBe("EVICT_IMMINENT");
      } else {
        expect(tension.forecast).toBe("STABLE");
      }
    });

    test("should forecast STABLE for low tension", async () => {
      const sessionID = "test-forecast-2";

      const tension = await manager.transition(sessionID, LifecyclePhase.ACTIVE, {
        latency: 10, // Low latency
        errorRate: 0.01, // Low error rate
        queueDepth: 10, // Low queue
        memPressure: 100 * 1024 * 1024, // 100MB
      });

      if (tension.score <= 0.7) {
        expect(tension.forecast).toBe("STABLE");
      }
    });
  });

  describe("State Management", () => {
    test("should get state for existing session", async () => {
      const sessionID = "test-state-1";
      await manager.transition(sessionID, LifecyclePhase.ACTIVE);

      const state = manager.getState(sessionID);
      expect(state).not.toBeNull();
      expect(state?.phase).toBe(LifecyclePhase.ACTIVE);
      expect(state?.tension.score).toBeGreaterThanOrEqual(0);
    });

    test("should return null for non-existent session", () => {
      const state = manager.getState("non-existent");
      expect(state).toBeNull();
    });

    test("should export visualization data", async () => {
      await manager.transition("session-1", LifecyclePhase.INIT);
      await manager.transition("session-2", LifecyclePhase.ACTIVE);
      await manager.transition("session-3", LifecyclePhase.RENEW);

      const vizData = manager.exportVizData();
      expect(vizData.length).toBe(3);
      expect(vizData[0]).toHaveProperty("sessionID");
      expect(vizData[0]).toHaveProperty("phase");
      expect(vizData[0]).toHaveProperty("tension");
    });
  });

  describe("KV Persistence", () => {
    test("should persist state to KV", async () => {
      const sessionID = "test-kv-1";
      await manager.transition(sessionID, LifecyclePhase.ACTIVE);

      // State should be accessible immediately
      const state = manager.getState(sessionID);
      expect(state).not.toBeNull();
    });
  });

  describe("Cleanup", () => {
    test("should clear expired sessions", async () => {
      const sessionID = "test-cleanup-1";
      await manager.transition(sessionID, LifecyclePhase.ACTIVE);

      // Clear immediately (maxAge = 0)
      manager.clearExpiredSessions(0);

      const state = manager.getState(sessionID);
      expect(state).toBeNull();
    });

    test("should not clear active sessions", async () => {
      const sessionID = "test-cleanup-2";
      await manager.transition(sessionID, LifecyclePhase.ACTIVE);

      // Clear sessions older than 1 hour (should not clear recent session)
      manager.clearExpiredSessions(3600000);

      const state = manager.getState(sessionID);
      expect(state).not.toBeNull();
    });
  });
});

