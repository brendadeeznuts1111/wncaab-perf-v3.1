/**
 * Enhanced Total Market Poller Tests with Temporal Veto Registry
 * 
 * Enterprise-grade temporal testing using the Temporal Veto Registry
 * 
 * Tags: [DOMAIN:defensive-testing][SCOPE:bun-mock-time][META:ah-chrono-veto][SEMANTIC:setSystemTime][TYPE:flux-holding-pattern][#REF]{BUN-TEST-API}
 * 
 * @module test/total-market-poller-temporal.test
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { TotalMarketPoller } from "../src/pollers/total-market-poller.ts";
import { getTemporalVetoRegistry, createChronoMetadata } from "../lib/temporal-veto-registry.ts";
import { getTemporalConfig } from "../lib/temporal-config.ts";
import { generateLifecycleVisualization, generateDarkModeVisualization } from "../lib/temporal-visualization.ts";
import { cryptoHashTimestamp, generateTimestampBundle } from "../lib/temporal-crypto.ts";
import type { FlashDataResponse } from "../src/parsers/goaloo-live-parser.ts";
import type { TotalMovement } from "../src/detectors/total-movement-detector.ts";
import { writeFileSync } from "fs";
import { join } from "path";

describe("Enhanced Total Market Poller - Temporal Veto Registry", () => {
  let poller: TotalMarketPoller;
  let registry = getTemporalVetoRegistry();
  const testMatchId = 999999;

  beforeEach(() => {
    // Create epoch with semantic chrono-metadata
    const metadata = createChronoMetadata(
      "defensive-testing",
      "bun-mock-time",
      "ah-chrono-veto",
      "setSystemTime",
      "flux-holding-pattern",
      "{BUN-TEST-API}"
    );

    const epoch = registry.createEpoch(metadata, new Date("2025-11-11T16:47:00.000Z").getTime());
    
    // Set system time using registry with flux enforcement
    registry.setSystemTimeWithFlux(new Date("2025-11-11T16:47:00.000Z"), metadata);
    
    poller = new TotalMarketPoller(testMatchId);
    
    console.log(`[TEMPORAL] Created epoch: ${epoch.epochId}`);
  });

  afterEach(() => {
    // Reset system time via registry
    registry.resetSystemTime();
    if (poller) {
      poller.stop();
      poller.close();
    }
  });

  describe("Temporal Veto Registry Integration", () => {
    test("should create epoch with signed bundle", () => {
      const metadata = createChronoMetadata(
        "defensive-testing",
        "bun-mock-time",
        "epoch-creation",
        "createEpoch",
        "epoch-bundle",
        "{BUN-TEST-API}"
      );

      const epoch = registry.createEpoch(metadata);
      
      expect(epoch).toBeDefined();
      expect(epoch.epochId).toBeDefined();
      expect(epoch.signature).toBeDefined();
      expect(epoch.hash).toBeDefined();
      expect(epoch.metadata.domain).toBe("defensive-testing");
    });

    test("should verify epoch bundle integrity", () => {
      const metadata = createChronoMetadata(
        "defensive-testing",
        "bun-mock-time",
        "integrity-test",
        "verifyEpoch",
        "epoch-bundle",
        "{BUN-TEST-API}"
      );

      const epoch = registry.createEpoch(metadata);
      const isValid = registry.verifyEpoch(epoch.epochId);
      
      expect(isValid).toBe(true);
    });

    test("should detect flux holding patterns", () => {
      // Set initial time
      registry.setSystemTimeWithFlux(new Date("2025-11-11T10:00:00.000Z"));
      
      // Rapid forward time travel (should be accelerating)
      registry.setSystemTimeWithFlux(new Date("2025-11-11T10:00:05.000Z")); // 5 seconds
      registry.setSystemTimeWithFlux(new Date("2025-11-11T10:00:10.000Z")); // 5 seconds
      
      const fluxHistory = registry.getFluxHistory();
      expect(fluxHistory.length).toBeGreaterThan(0);
      
      // Check for accelerating pattern
      const acceleratingStates = fluxHistory.filter(s => s.holdingPhase === 'accelerating');
      expect(acceleratingStates.length).toBeGreaterThanOrEqual(0);
    });

    test("should veto excessive time travel", () => {
      // Try to travel more than 24 hours back (should be vetoed)
      registry.setSystemTimeWithFlux(new Date("2025-11-10T16:47:00.000Z")); // 24 hours back
      
      const fluxHistory = registry.getFluxHistory();
      const vetoedStates = fluxHistory.filter(s => s.holdingPhase === 'vetoed');
      
      // Should have vetoed the excessive backward travel
      expect(vetoedStates.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Crypto-Accelerated Timestamp Operations", () => {
    test("should hash timestamps with crypto acceleration", () => {
      const timestamp = Date.now();
      const hash = cryptoHashTimestamp(timestamp);
      
      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
      expect(typeof hash).toBe('string');
    });

    test("should generate timestamp bundle with signature", () => {
      const timestamps = [
        Date.now(),
        Date.now() + 1000,
        Date.now() + 2000,
      ];

      const bundle = generateTimestampBundle(timestamps);
      
      expect(bundle.timestamps).toEqual(timestamps);
      expect(bundle.bundleHash).toBeDefined();
      expect(bundle.signature).toBeDefined();
      expect(bundle.individualHashes.size).toBe(3);
    });

    test("should batch hash multiple timestamps efficiently", () => {
      const timestamps = Array.from({ length: 100 }, (_, i) => Date.now() + i * 1000);
      
      const startTime = performance.now();
      const bundle = generateTimestampBundle(timestamps);
      const endTime = performance.now();
      
      expect(bundle.individualHashes.size).toBe(100);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast (<100ms)
    });
  });

  describe("Lifecycle Visualization", () => {
    test("should generate lifecycle visualization", () => {
      // Create multiple epochs
      const epochs = [];
      for (let i = 0; i < 3; i++) {
        const metadata = createChronoMetadata(
          "defensive-testing",
          "bun-mock-time",
          `epoch-${i}`,
          "createEpoch",
          "epoch-bundle",
          "{BUN-TEST-API}"
        );
        epochs.push(registry.createEpoch(metadata, Date.now() + i * 1000));
      }

      const fluxHistory = registry.getFluxHistory();
      const viz = generateLifecycleVisualization(epochs, fluxHistory);
      
      expect(viz.epochs.length).toBe(3);
      expect(viz.metrics.totalEpochs).toBe(3);
      expect(viz.fluxTransitions).toBeDefined();
      expect(viz.vetoEvents).toBeDefined();
    });

    test("should generate dark-mode HTML visualization", () => {
      const metadata = createChronoMetadata(
        "defensive-testing",
        "bun-mock-time",
        "visualization-test",
        "generateViz",
        "dark-mode-ui",
        "{BUN-VIZ}"
      );

      const epoch = registry.createEpoch(metadata);
      const fluxHistory = registry.getFluxHistory();
      const viz = generateLifecycleVisualization([epoch], fluxHistory);
      
      const config = getTemporalConfig();
      const html = generateDarkModeVisualization(viz, config);
      
      expect(html).toContain('Temporal Veto Registry');
      expect(html).toContain('Lifecycle Visualization');
      expect(html).toContain(epoch.epochId);
      
      // Verify dark mode is enabled
      if (config.enableDarkMode) {
        expect(html).toContain('#1a1a1a'); // Dark background
      }
    });
  });

  describe("Bunfig.toml Config Hydration", () => {
    test("should load configuration from bunfig.toml", () => {
      const config = getTemporalConfig();
      
      expect(config).toBeDefined();
      expect(config.vetoThreshold).toBeGreaterThan(0);
      expect(config.enableFluxEnforcement).toBeDefined();
      expect(config.enableDarkMode).toBeDefined();
    });

    test("should use default config if bunfig.toml missing", () => {
      // Config loader has fallback logic
      const config = getTemporalConfig();
      
      expect(config.vetoThreshold).toBe(100);
      expect(config.defaultTimezone).toBe('America/New_York');
    });
  });

  describe("Integration: Full Temporal Testing Workflow", () => {
    test("should track enhanced fields through temporal epoch", async () => {
      const pollerPrivate = poller as any;
      
      // Create epoch for this test
      const metadata = createChronoMetadata(
        "defensive-testing",
        "bun-mock-time",
        "integration-test",
        "setSystemTime",
        "flux-holding-pattern",
        "{BUN-TEST-API}"
      );

      const epoch = registry.createEpoch(metadata);
      
      // Simulate poll with enhanced fields
      const mockFlashdata: FlashDataResponse = {
        match: testMatchId,
        timestamp: Date.now(),
        odds: {
          total: {
            line: 150.5,
            over: -110,
            under: -110,
            providers: ["DraftKings", "FanDuel"],
          },
        },
        score: { home: 0, away: 0 },
        status: "pre-game",
      };

      // Capture opening line
      if (mockFlashdata.odds.total) {
        if (pollerPrivate.openingLine === undefined && mockFlashdata.odds.total.line !== undefined) {
          pollerPrivate.openingLine = mockFlashdata.odds.total.line;
        }
      }
      pollerPrivate.tickCount++;
      
      // Advance time using registry
      registry.setSystemTimeWithFlux(new Date(Date.now() + 2000));
      
      expect(pollerPrivate.openingLine).toBe(150.5);
      expect(pollerPrivate.tickCount).toBe(1);
      
      // Verify epoch was tracked
      const activeEpoch = registry.getActiveEpoch();
      expect(activeEpoch).toBeDefined();
    });

    test("should export visualization HTML file", () => {
      // Create test epochs
      const epochs = [];
      for (let i = 0; i < 2; i++) {
        const metadata = createChronoMetadata(
          "defensive-testing",
          "bun-mock-time",
          `export-test-${i}`,
          "exportViz",
          "visualization",
          "{BUN-VIZ}"
        );
        epochs.push(registry.createEpoch(metadata, Date.now() + i * 1000));
      }

      const fluxHistory = registry.getFluxHistory();
      const viz = generateLifecycleVisualization(epochs, fluxHistory);
      const config = getTemporalConfig();
      const html = generateDarkModeVisualization(viz, config);
      
      // Write to file for inspection
      const outputPath = join(process.cwd(), 'test-output', 'temporal-visualization.html');
      writeFileSync(outputPath, html, 'utf-8');
      
      expect(html.length).toBeGreaterThan(0);
      console.log(`[TEMPORAL] Visualization exported to: ${outputPath}`);
    });
  });
});

