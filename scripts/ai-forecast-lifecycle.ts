/**
 * AI Forecast Lifecycle - TES-NGWS-001.9
 * 
 * Generates AI forecast for lifecycle sessions and checks for EVICT_IMMINENT predictions.
 * Used in pre-deploy oracle commands to verify system stability.
 * 
 * @module scripts/ai-forecast-lifecycle
 */

import { getLifecycleManager } from "../src/lib/worker-lifecycle-integration.ts";
import { LifecyclePhase } from "../src/lib/tes-lifecycle-manager.ts";

/**
 * Generate forecast report for all active sessions
 */
async function generateForecastReport(): Promise<void> {
  const manager = getLifecycleManager();
  
  if (!manager) {
    console.log("⚠️  Lifecycle manager not initialized");
    process.exit(1);
  }

  const vizData = manager.exportVizData();
  
  if (vizData.length === 0) {
    console.log("✅ No active sessions - system idle");
    return;
  }

  let evictImminentCount = 0;
  let stableCount = 0;
  let totalTension = 0;

  // Simulate forecast for each session
  for (const session of vizData) {
    // Get current state
    const state = manager.getState(session.sessionID);
    
    if (state) {
      // Check forecast
      if (state.tension.forecast === "EVICT_IMMINENT") {
        evictImminentCount++;
        console.log(`🚨 EVICT_IMMINENT: ${session.sessionID} (phase: ${session.phase}, tension: ${session.tension.toFixed(3)})`);
      } else {
        stableCount++;
      }
      
      totalTension += session.tension;
    }
  }

  const avgTension = totalTension / vizData.length;
  
  console.log(`\n📊 Forecast Summary:`);
  console.log(`   Total Sessions: ${vizData.length}`);
  console.log(`   STABLE: ${stableCount}`);
  console.log(`   EVICT_IMMINENT: ${evictImminentCount}`);
  console.log(`   Average Tension: ${avgTension.toFixed(3)}`);
  
  if (evictImminentCount > 0) {
    console.log(`\n⚠️  ALERT: ${evictImminentCount} session(s) predicted for eviction`);
  } else {
    console.log(`\n✅ PASS: All sessions stable`);
  }
}

// Run if executed directly
if (import.meta.main) {
  generateForecastReport().catch((error) => {
    console.error("❌ Forecast generation failed:", error);
    process.exit(1);
  });
}

export { generateForecastReport };

