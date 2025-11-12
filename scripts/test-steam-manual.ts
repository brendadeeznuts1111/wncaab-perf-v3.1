#!/usr/bin/env bun
/**
 * Manual Steam Detection Test - TES-NGWS-001.11b
 * 
 * Tests steam detection algorithm with simulated rapid odds movements.
 * 
 * Usage:
 *   bun run scripts/test-steam-manual.ts
 */

import { NowGoalTick } from "../src/models/nowgoal-tick.ts";
import { SteamPatternAnalyzer } from "../src/lib/steam-pattern-analyzer.ts";

const analyzer = new SteamPatternAnalyzer();

console.log('🧪 Testing Steam Detection Algorithm\n');

// Simulate rapid odds movement (>3%, <1.5s window)
const testTicks: NowGoalTick[] = [
  {
    gameId: "663637",
    bookmakerId: "Bet365",
    oddsType: "moneyline",
    oldValue: 1.95,
    newValue: 1.88,  // -3.6% change
    timestamp: Date.now(),
    market: { 
      homeTeam: "Team A", 
      awayTeam: "Team B", 
      league: "WNCAAB" 
    }
  },
  {
    gameId: "663637",
    bookmakerId: "Bet365",
    oddsType: "moneyline",
    oldValue: 1.88,
    newValue: 1.82,  // -3.2% change (within 1.5s)
    timestamp: Date.now() + 200,
    market: { 
      homeTeam: "Team A", 
      awayTeam: "Team B", 
      league: "WNCAAB" 
    }
  },
  {
    gameId: "663637",
    bookmakerId: "Bet365",
    oddsType: "moneyline",
    oldValue: 1.82,
    newValue: 1.75,  // -3.8% change (within 1.5s) - should trigger!
    timestamp: Date.now() + 400,
    market: { 
      homeTeam: "Team A", 
      awayTeam: "Team B", 
      league: "WNCAAB" 
    }
  }
];

console.log('Test Case 1: Multiple Rapid Changes (WNCAAB)');
console.log('Expected: Should detect steam on 3rd tick (2+ rapid changes >3%)\n');

let detectionCount = 0;
testTicks.forEach((tick, index) => {
  const velocity = Math.abs(tick.newValue - tick.oldValue);
  const velocityPercent = (velocity / tick.oldValue * 100).toFixed(2);
  
  console.log(`Tick ${index + 1}: ${tick.oldValue} → ${tick.newValue} (${velocityPercent}% change)`);
  
  if (analyzer.detectSteam(tick)) {
    detectionCount++;
    console.log(`✅ STEAM DETECTED! (Detection #${detectionCount})\n`);
  } else {
    console.log(`⏳ No steam yet...\n`);
  }
});

console.log(`\n📊 Results: ${detectionCount} detection(s) out of ${testTicks.length} ticks`);

// Test Case 2: Large single move (≥10%)
console.log('\n' + '='.repeat(50));
console.log('Test Case 2: Large Single Move (≥10%)');
console.log('Expected: Should detect steam immediately\n');

const largeMoveTick: NowGoalTick = {
  gameId: "663637",
  bookmakerId: "Bet365",
  oddsType: "moneyline",
  oldValue: 2.00,
  newValue: 1.75,  // -12.5% change - should trigger immediately!
  timestamp: Date.now(),
  market: { 
    homeTeam: "Team A", 
    awayTeam: "Team B", 
    league: "WNCAAB" 
  }
};

const velocity = Math.abs(largeMoveTick.newValue - largeMoveTick.oldValue);
const velocityPercent = (velocity / largeMoveTick.oldValue * 100).toFixed(2);
console.log(`Large Move: ${largeMoveTick.oldValue} → ${largeMoveTick.newValue} (${velocityPercent}% change)`);

if (analyzer.detectSteam(largeMoveTick)) {
  console.log(`✅ STEAM DETECTED! (Large single move)\n`);
} else {
  console.log(`❌ FAILED: Should have detected large move\n`);
}

// Test Case 3: Small changes (should not trigger)
console.log('\n' + '='.repeat(50));
console.log('Test Case 3: Small Changes (<3%)');
console.log('Expected: Should NOT detect steam\n');

const smallTicks: NowGoalTick[] = [
  {
    gameId: "663638",
    bookmakerId: "Bet365",
    oddsType: "moneyline",
    oldValue: 1.95,
    newValue: 1.93,  // -1.0% change (too small)
    timestamp: Date.now(),
    market: { 
      homeTeam: "Team C", 
      awayTeam: "Team D", 
      league: "WNCAAB" 
    }
  },
  {
    gameId: "663638",
    bookmakerId: "Bet365",
    oddsType: "moneyline",
    oldValue: 1.93,
    newValue: 1.91,  // -1.0% change (too small)
    timestamp: Date.now() + 200,
    market: { 
      homeTeam: "Team C", 
      awayTeam: "Team D", 
      league: "WNCAAB" 
    }
  }
];

let smallDetectionCount = 0;
smallTicks.forEach((tick, index) => {
  const velocity = Math.abs(tick.newValue - tick.oldValue);
  const velocityPercent = (velocity / tick.oldValue * 100).toFixed(2);
  
  console.log(`Tick ${index + 1}: ${tick.oldValue} → ${tick.newValue} (${velocityPercent}% change)`);
  
  if (analyzer.detectSteam(tick)) {
    smallDetectionCount++;
    console.log(`⚠️  Unexpected detection!`);
  } else {
    console.log(`✅ Correctly ignored (too small)`);
  }
});

console.log(`\n📊 Results: ${smallDetectionCount} unexpected detection(s)`);

console.log('\n' + '='.repeat(50));
console.log('✅ Test Complete!');
console.log('='.repeat(50));

