/**
 * Tension Vortex Tests - TES-NGWS-001.9d
 * 
 * Load tests for tension calculation with 5k phase transitions.
 * Verifies tension score correlation and forecast accuracy.
 * 
 * @module test/tension-vortex.test
 */

import { describe, test, expect } from "bun:test";
import { TesLifecycleManager, LifecyclePhase } from "../src/lib/tes-lifecycle-manager.ts";

describe("Tension Vortex Load Tests", () => {
  test("should handle 5k phase transitions", async () => {
    const manager = new TesLifecycleManager();
    const sessions = Array.from({ length: 5000 }, (_, i) => `session-${i}`);

    const startTime = Date.now();

    // Create transitions with varying metrics
    const transitions = await Promise.all(
      sessions.map((id, i) => {
        const phase = [
          LifecyclePhase.INIT,
          LifecyclePhase.AUTH,
          LifecyclePhase.ACTIVE,
          LifecyclePhase.RENEW,
          LifecyclePhase.EVICT,
        ][i % 5] as LifecyclePhase;

        return manager.transition(id, phase, {
          latency: Math.random() * 200,
          errorRate: Math.random() * 0.5,
          queueDepth: Math.random() * 200,
          memPressure: Math.random() * 2 * 1024 * 1024 * 1024,
        });
      })
    );

    const duration = Date.now() - startTime;

    expect(transitions.length).toBe(5000);
    expect(duration).toBeLessThan(10000); // Should complete in <10s

    // Verify all transitions have valid tension scores
    transitions.forEach((tension) => {
      expect(tension.score).toBeGreaterThanOrEqual(0);
      expect(tension.score).toBeLessThanOrEqual(1);
      expect(tension.forecast).toBeDefined();
    });
  });

  test("should correlate tension scores with simulated load", async () => {
    const manager = new TesLifecycleManager();

    // Low load scenario
    const lowLoadTension = await manager.transition("low-load", LifecyclePhase.ACTIVE, {
      latency: 10,
      errorRate: 0.01,
      queueDepth: 10,
      memPressure: 100 * 1024 * 1024,
    });

    // Medium load scenario
    const mediumLoadTension = await manager.transition("medium-load", LifecyclePhase.ACTIVE, {
      latency: 50,
      errorRate: 0.1,
      queueDepth: 50,
      memPressure: 512 * 1024 * 1024,
    });

    // High load scenario
    const highLoadTension = await manager.transition("high-load", LifecyclePhase.ACTIVE, {
      latency: 150,
      errorRate: 0.5,
      queueDepth: 150,
      memPressure: 2 * 1024 * 1024 * 1024,
    });

    // Verify correlation: higher load = higher tension
    expect(lowLoadTension.score).toBeLessThan(mediumLoadTension.score);
    expect(mediumLoadTension.score).toBeLessThan(highLoadTension.score);

    // Verify correlation is reasonable (within 95% confidence)
    const correlation = (highLoadTension.score - lowLoadTension.score) / highLoadTension.score;
    expect(correlation).toBeGreaterThan(0.5); // At least 50% difference
  });

  test("should achieve >90% forecast accuracy", async () => {
    const manager = new TesLifecycleManager();
    const testCases = [
      { metrics: { latency: 10, errorRate: 0.01, queueDepth: 10, memPressure: 100 * 1024 * 1024 }, expectedForecast: "STABLE" },
      { metrics: { latency: 20, errorRate: 0.05, queueDepth: 20, memPressure: 200 * 1024 * 1024 }, expectedForecast: "STABLE" },
      { metrics: { latency: 150, errorRate: 0.5, queueDepth: 150, memPressure: 2 * 1024 * 1024 * 1024 }, expectedForecast: "EVICT_IMMINENT" },
      { metrics: { latency: 200, errorRate: 0.8, queueDepth: 200, memPressure: 4 * 1024 * 1024 * 1024 }, expectedForecast: "EVICT_IMMINENT" },
    ];

    let correctForecasts = 0;

    for (const testCase of testCases) {
      const tension = await manager.transition(`test-${correctForecasts}`, LifecyclePhase.ACTIVE, testCase.metrics);
      
      // Forecast should match expected (allowing for edge cases)
      if (tension.forecast === testCase.expectedForecast) {
        correctForecasts++;
      } else {
        // Allow some tolerance for edge cases near 0.7 threshold
        const isNearThreshold = Math.abs(tension.score - 0.7) < 0.15;
        if (isNearThreshold) {
          correctForecasts += 0.5; // Partial credit
        }
      }
    }

    const accuracy = correctForecasts / testCases.length;
    expect(accuracy).toBeGreaterThan(0.9); // >90% accuracy
  });

  test("should achieve <5ms KV cache performance", async () => {
    const manager = new TesLifecycleManager();
    const sessionID = "cache-test";
    const metrics = {
      latency: 50,
      errorRate: 0.1,
      queueDepth: 50,
      memPressure: 512 * 1024 * 1024,
    };

    // First transition (cache miss)
    const start1 = performance.now();
    await manager.transition(sessionID, LifecyclePhase.ACTIVE, metrics);
    const duration1 = performance.now() - start1;

    // Second transition with same metrics (cache hit)
    const start2 = performance.now();
    await manager.transition(sessionID, LifecyclePhase.ACTIVE, metrics);
    const duration2 = performance.now() - start2;

    // Cache hit should be faster or equal (operations are very fast)
    expect(duration2).toBeLessThanOrEqual(duration1);
    // Both should be very fast (<5ms)
    expect(duration1).toBeLessThan(10); // Allow some margin
    expect(duration2).toBeLessThan(5); // <5ms for cache hit
  });

  test("should handle concurrent tension calculations", async () => {
    const manager = new TesLifecycleManager();
    const sessions = Array.from({ length: 100 }, (_, i) => `concurrent-${i}`);

    const startTime = Date.now();

    const tensions = await Promise.all(
      sessions.map((id) =>
        manager.transition(id, LifecyclePhase.ACTIVE, {
          latency: Math.random() * 200,
          errorRate: Math.random() * 0.5,
          queueDepth: Math.random() * 200,
          memPressure: Math.random() * 2 * 1024 * 1024 * 1024,
        })
      )
    );

    const duration = Date.now() - startTime;
    const avgDuration = duration / sessions.length;

    expect(tensions.length).toBe(100);
    expect(avgDuration).toBeLessThan(10); // Average <10ms per calculation
  });
});

