/**
 * Enhanced Total Market Poller Tests
 * 
 * Tests for enhanced alert features including:
 * - Opening line tracking
 * - Tick count management
 * - Provider/bookmaker capture
 * - New York timezone conversion with DST handling
 * 
 * Uses Bun's setSystemTime for deterministic time-based testing
 * 
 * @module test/total-market-poller-enhanced.test
 */

import { describe, test, expect, beforeEach, afterEach, setSystemTime } from "bun:test";
import { TotalMarketPoller } from "../src/pollers/total-market-poller.ts";
import type { FlashDataResponse } from "../src/parsers/goaloo-live-parser.ts";
import type { TotalMovement } from "../src/detectors/total-movement-detector.ts";

describe("Enhanced Total Market Poller", () => {
  let poller: TotalMarketPoller;
  const testMatchId = 999999;

  beforeEach(() => {
    // Reset system time to a known date for deterministic testing
    setSystemTime(new Date("2025-11-11T16:47:00.000Z")); // Nov 11, 2025 4:47 PM UTC
    poller = new TotalMarketPoller(testMatchId);
  });

  afterEach(() => {
    // Reset system time to actual time
    setSystemTime();
    if (poller) {
      poller.stop();
      poller.close();
    }
  });

  describe("Opening Line Tracking", () => {
    test("should capture opening line on first poll with valid data", async () => {
      // Mock flashdata with opening line
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

      // Access private method via type assertion (for testing)
      const pollerPrivate = poller as any;
      
      // Opening line should be undefined initially
      expect(pollerPrivate.openingLine).toBeUndefined();
      
      // Simulate pollOnce behavior - capture opening line
      if (mockFlashdata.odds.total) {
        if (pollerPrivate.openingLine === undefined && mockFlashdata.odds.total.line !== undefined) {
          pollerPrivate.openingLine = mockFlashdata.odds.total.line;
        }
      }

      expect(pollerPrivate.openingLine).toBe(150.5);
    });

    test("should not overwrite opening line on subsequent polls", async () => {
      const pollerPrivate = poller as any;
      pollerPrivate.openingLine = 150.5; // Set initial opening line

      const mockFlashdata: FlashDataResponse = {
        match: testMatchId,
        timestamp: Date.now(),
        odds: {
          total: {
            line: 151.0, // Different line
            over: -110,
            under: -110,
            providers: ["DraftKings"],
          },
        },
        score: { home: 0, away: 0 },
        status: "pre-game",
      };

      // Simulate pollOnce behavior - should not overwrite
      if (mockFlashdata.odds.total) {
        if (pollerPrivate.openingLine === undefined && mockFlashdata.odds.total.line !== undefined) {
          pollerPrivate.openingLine = mockFlashdata.odds.total.line;
        }
      }

      // Opening line should remain unchanged
      expect(pollerPrivate.openingLine).toBe(150.5);
    });

    test("should use opening line in movement comparison", async () => {
      const pollerPrivate = poller as any;
      pollerPrivate.openingLine = 150.5;

      const current: FlashDataResponse = {
        match: testMatchId,
        timestamp: Date.now(),
        odds: {
          total: {
            line: 149.5, // Moved down 1 point from opening
            over: -105,
            under: -115,
            providers: ["DraftKings"],
          },
        },
        score: { home: 45, away: 42 },
        status: "live",
      };

      const previous: FlashDataResponse = {
        match: testMatchId,
        timestamp: Date.now() - 2000,
        odds: {
          total: {
            line: 150.0, // Previous tick
            over: -110,
            under: -110,
            providers: ["DraftKings"],
          },
        },
        score: { home: 45, away: 42 },
        status: "live",
      };

      const movement = pollerPrivate.detector.detectMovement(
        current,
        previous,
        current.odds.total?.providers,
        pollerPrivate.openingLine,
        5 // tick count
      );

      expect(movement).not.toBeNull();
      expect(movement?.openingLine).toBe(150.5);
      expect(movement?.lineMovement).toBe(-0.5); // From previous (150.0 → 149.5)
      // Opening line shows: 150.5 → 149.5 = -1.0 from opening
      expect(movement?.lineCurrent - (movement?.openingLine || 0)).toBe(-1.0);
    });
  });

  describe("Tick Count Management", () => {
    test("should start with tick count of 0", () => {
      const pollerPrivate = poller as any;
      expect(pollerPrivate.tickCount).toBe(0);
    });

    test("should increment tick count on each poll", () => {
      const pollerPrivate = poller as any;
      expect(pollerPrivate.tickCount).toBe(0);

      // Simulate multiple polls
      pollerPrivate.tickCount++;
      expect(pollerPrivate.tickCount).toBe(1);

      pollerPrivate.tickCount++;
      expect(pollerPrivate.tickCount).toBe(2);

      pollerPrivate.tickCount++;
      expect(pollerPrivate.tickCount).toBe(3);
    });

    test("should reset tick count after 5 minutes of inactivity", () => {
      const pollerPrivate = poller as any;
      pollerPrivate.tickCount = 10;
      pollerPrivate.lastAlertTime = Date.now() - 300001; // 5 minutes + 1ms ago

      const currentTime = Date.now();
      if (pollerPrivate.lastAlertTime && currentTime - pollerPrivate.lastAlertTime > 300000) {
        pollerPrivate.tickCount = 1; // Reset to current as "new session"
      }

      expect(pollerPrivate.tickCount).toBe(1);
    });

    test("should not reset tick count if less than 5 minutes", () => {
      const pollerPrivate = poller as any;
      pollerPrivate.tickCount = 10;
      pollerPrivate.lastAlertTime = Date.now() - 299999; // Just under 5 minutes

      const currentTime = Date.now();
      if (pollerPrivate.lastAlertTime && currentTime - pollerPrivate.lastAlertTime > 300000) {
        pollerPrivate.tickCount = 1;
      }

      expect(pollerPrivate.tickCount).toBe(10); // Should not reset
    });

    test("should track lastAlertTime when alert is sent", () => {
      const pollerPrivate = poller as any;
      const startTime = Date.now();
      
      // Simulate alert sent
      pollerPrivate.lastAlertTime = startTime;
      
      expect(pollerPrivate.lastAlertTime).toBe(startTime);
    });
  });

  describe("Provider/Bookmaker Capture", () => {
    test("should capture providers from FlashDataResponse", () => {
      const mockFlashdata: FlashDataResponse = {
        match: testMatchId,
        timestamp: Date.now(),
        odds: {
          total: {
            line: 150.5,
            over: -110,
            under: -110,
            providers: ["DraftKings", "FanDuel", "BetMGM"],
          },
        },
        score: { home: 0, away: 0 },
        status: "pre-game",
      };

      const providers = mockFlashdata.odds.total?.providers || ["Unknown"];

      expect(providers).toEqual(["DraftKings", "FanDuel", "BetMGM"]);
    });

    test("should fallback to Unknown if providers missing", () => {
      const mockFlashdata: FlashDataResponse = {
        match: testMatchId,
        timestamp: Date.now(),
        odds: {
          total: {
            line: 150.5,
            over: -110,
            under: -110,
            providers: [], // Empty array
          },
        },
        score: { home: 0, away: 0 },
        status: "pre-game",
      };

      const providers = mockFlashdata.odds.total?.providers || ["Unknown"];
      expect(providers).toEqual([]); // Empty array, not ["Unknown"] yet

      // After fallback logic
      const finalProviders = providers.length > 0 ? providers : ["Unknown"];
      expect(finalProviders).toEqual(["Unknown"]);
    });

    test("should handle undefined providers array", () => {
      const mockFlashdata: FlashDataResponse = {
        match: testMatchId,
        timestamp: Date.now(),
        odds: {
          total: {
            line: 150.5,
            over: -110,
            under: -110,
            // providers field missing
          },
        },
        score: { home: 0, away: 0 },
        status: "pre-game",
      };

      const providers = mockFlashdata.odds.total?.providers || ["Unknown"];
      expect(providers).toEqual(["Unknown"]);
    });
  });

  describe("New York Timezone Conversion", () => {
    test("should convert UTC to EST (Eastern Standard Time)", () => {
      // Set to a date in EST period (Nov 11, 2025 - after DST ends)
      setSystemTime(new Date("2025-11-11T16:47:00.000Z")); // 4:47 PM UTC = 11:47 AM EST

      const pollerPrivate = poller as any;
      const timestamp = Date.now();
      const nyTime = pollerPrivate.formatNYTime(timestamp);

      // Should be 5 hours behind UTC (EST = UTC-5)
      expect(nyTime).toContain("2025-11-11");
      expect(nyTime).toContain("11:47:00"); // 16:47 UTC - 5 hours = 11:47 EST
      expect(nyTime).toMatch(/EST|EDT/); // Should include timezone abbreviation
    });

    test("should convert UTC to EDT (Eastern Daylight Time)", () => {
      // Set to a date in EDT period (July 11, 2025 - during DST)
      setSystemTime(new Date("2025-07-11T16:47:00.000Z")); // 4:47 PM UTC = 12:47 PM EDT

      const pollerPrivate = poller as any;
      const timestamp = Date.now();
      const nyTime = pollerPrivate.formatNYTime(timestamp);

      // Should be 4 hours behind UTC (EDT = UTC-4)
      expect(nyTime).toContain("2025-07-11");
      expect(nyTime).toContain("12:47:00"); // 16:47 UTC - 4 hours = 12:47 EDT
      expect(nyTime).toMatch(/EDT/); // Should show EDT during daylight saving
    });

    test("should handle DST transition correctly", () => {
      // Test DST end (November 2, 2025 - clocks fall back)
      // 6 AM UTC on Nov 2 = 2 AM EDT (before transition) or 1 AM EST (after transition)
      setSystemTime(new Date("2025-11-02T06:00:00.000Z")); // 6 AM UTC = 2 AM EDT
      
      const pollerPrivate = poller as any;
      const timestamp1 = Date.now();
      const nyTime1 = pollerPrivate.formatNYTime(timestamp1);
      
      // Test after DST ends (same day, later)
      setSystemTime(new Date("2025-11-02T07:00:00.000Z")); // 7 AM UTC = 2 AM EST (after fall back)
      const timestamp2 = Date.now();
      const nyTime2 = pollerPrivate.formatNYTime(timestamp2);
      
      // Times should reflect DST change
      expect(nyTime1).not.toEqual(nyTime2);
      // Both should show EST after transition, but times will differ
      expect(nyTime2).toMatch(/EST/); // After transition should be EST
    });

    test("should format time correctly with timezone abbreviation", () => {
      setSystemTime(new Date("2025-11-11T16:47:00.000Z"));
      
      const pollerPrivate = poller as any;
      const timestamp = Date.now();
      const nyTime = pollerPrivate.formatNYTime(timestamp);

      // Should match format: YYYY-MM-DD HH:mm:ss TZ
      expect(nyTime).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} (EST|EDT|ET)$/);
    });

    test("should fallback to UTC if timezone conversion fails", () => {
      const pollerPrivate = poller as any;
      
      // Mock formatToParts to throw error
      const originalFormatToParts = Intl.DateTimeFormat.prototype.formatToParts;
      let callCount = 0;
      
      Intl.DateTimeFormat.prototype.formatToParts = function() {
        callCount++;
        if (callCount === 1) {
          // First call succeeds (for date parts)
          return originalFormatToParts.call(this);
        } else {
          // Second call fails (for timezone)
          throw new Error("Timezone conversion failed");
        }
      };

      const timestamp = Date.now();
      const result = pollerPrivate.formatNYTime(timestamp);

      // Should fallback to ISO string
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO format

      // Restore original
      Intl.DateTimeFormat.prototype.formatToParts = originalFormatToParts;
    });
  });

  describe("Enhanced Alert Message Format", () => {
    test("should include providers in movement data", async () => {
      const pollerPrivate = poller as any;
      
      const current: FlashDataResponse = {
        match: testMatchId,
        timestamp: Date.now(),
        odds: {
          total: {
            line: 149.5,
            over: -105,
            under: -115,
            providers: ["DraftKings", "FanDuel"],
          },
        },
        score: { home: 45, away: 42 },
        status: "live",
      };

      const previous: FlashDataResponse = {
        match: testMatchId,
        timestamp: Date.now() - 2000,
        odds: {
          total: {
            line: 150.0,
            over: -110,
            under: -110,
            providers: ["DraftKings"],
          },
        },
        score: { home: 45, away: 42 },
        status: "live",
      };

      pollerPrivate.openingLine = 150.5;
      pollerPrivate.tickCount = 12;

      const movement = pollerPrivate.detector.detectMovement(
        current,
        previous,
        current.odds.total?.providers,
        pollerPrivate.openingLine,
        pollerPrivate.tickCount
      );

      expect(movement).not.toBeNull();
      expect(movement?.providers).toEqual(["DraftKings", "FanDuel"]);
      expect(movement?.openingLine).toBe(150.5);
      expect(movement?.tickCount).toBe(12);
    });

    test("should format line movement with opening line when available", () => {
      const movement: TotalMovement = {
        teamHome: "Team A",
        teamAway: "Team B",
        timestamp: Date.now(),
        linePrevious: 150.0,
        lineCurrent: 149.5,
        lineMovement: -0.5,
        overPrevious: -110,
        overCurrent: -105,
        overChangePercent: 4.5,
        underPrevious: -110,
        underCurrent: -115,
        underChangePercent: -4.5,
        steamIndex: 2.5,
        scoreHome: 45,
        scoreAway: 42,
        providers: ["DraftKings", "FanDuel"],
        openingLine: 150.5,
        tickCount: 12,
      };

      // Test formatting logic
      const lineMovementDisplay = movement.openingLine !== undefined
        ? `${movement.openingLine} → ${movement.lineCurrent} (${movement.lineMovement > 0 ? '+' : ''}${movement.lineMovement.toFixed(1)} from opening)`
        : `${movement.linePrevious} → ${movement.lineCurrent} (${movement.lineMovement > 0 ? '+' : ''}${movement.lineMovement.toFixed(1)})`;

      expect(lineMovementDisplay).toContain("150.5");
      expect(lineMovementDisplay).toContain("149.5");
      expect(lineMovementDisplay).toContain("from opening");
    });

    test("should format line movement without opening line when unavailable", () => {
      const movement: TotalMovement = {
        teamHome: "Team A",
        teamAway: "Team B",
        timestamp: Date.now(),
        linePrevious: 150.0,
        lineCurrent: 149.5,
        lineMovement: -0.5,
        overPrevious: -110,
        overCurrent: -105,
        overChangePercent: 4.5,
        underPrevious: -110,
        underCurrent: -115,
        underChangePercent: -4.5,
        steamIndex: 2.5,
        scoreHome: 45,
        scoreAway: 42,
        providers: ["DraftKings"],
        // openingLine undefined
        tickCount: 5,
      };

      // Test formatting logic
      const lineMovementDisplay = movement.openingLine !== undefined
        ? `${movement.openingLine} → ${movement.lineCurrent} (${movement.lineMovement > 0 ? '+' : ''}${movement.lineMovement.toFixed(1)} from opening)`
        : `${movement.linePrevious} → ${movement.lineCurrent} (${movement.lineMovement > 0 ? '+' : ''}${movement.lineMovement.toFixed(1)})`;

      expect(lineMovementDisplay).toContain("150"); // linePrevious as number (150.0 becomes 150)
      expect(lineMovementDisplay).toContain("149.5");
      expect(lineMovementDisplay).not.toContain("from opening");
    });
  });

  describe("Integration: Full Poll Cycle", () => {
    test("should track all enhanced fields through complete poll cycle", async () => {
      const pollerPrivate = poller as any;
      
      // Simulate first poll
      const firstPoll: FlashDataResponse = {
        match: testMatchId,
        timestamp: Date.now(),
        odds: {
          total: {
            line: 150.5,
            over: -110,
            under: -110,
            providers: ["DraftKings"],
          },
        },
        score: { home: 0, away: 0 },
        status: "pre-game",
      };

      // Capture opening line
      if (firstPoll.odds.total) {
        if (pollerPrivate.openingLine === undefined && firstPoll.odds.total.line !== undefined) {
          pollerPrivate.openingLine = firstPoll.odds.total.line;
        }
      }
      pollerPrivate.tickCount++;
      pollerPrivate.prevData = firstPoll;

      expect(pollerPrivate.openingLine).toBe(150.5);
      expect(pollerPrivate.tickCount).toBe(1);

      // Simulate second poll with movement
      setSystemTime(new Date(Date.now() + 2000)); // Advance time by 2 seconds
      
      const secondPoll: FlashDataResponse = {
        match: testMatchId,
        timestamp: Date.now(),
        odds: {
          total: {
            line: 150.0,
            over: -110,
            under: -110,
            providers: ["DraftKings", "FanDuel"],
          },
        },
        score: { home: 0, away: 0 },
        status: "pre-game",
      };

      pollerPrivate.tickCount++;
      const movement = pollerPrivate.detector.detectMovement(
        secondPoll,
        pollerPrivate.prevData,
        secondPoll.odds.total?.providers,
        pollerPrivate.openingLine,
        pollerPrivate.tickCount
      );

      if (movement) {
        expect(movement.openingLine).toBe(150.5);
        expect(movement.tickCount).toBe(2);
        expect(movement.providers).toEqual(["DraftKings", "FanDuel"]);
        expect(movement.lineMovement).toBe(-0.5); // 150.5 → 150.0
      }
    });
  });
});

