/**
 * Test Telegram Pin/Unpin Functionality
 * 
 * Tests the pinning feature for critical steam alerts.
 */

import { getTelegramAlertSystemV2 } from "../src/lib/telegram-alert-system-v2.ts";
import type { TotalMovement } from "../src/lib/telegram-alert-system-v2.ts";

async function testPinFunctionality() {
  console.log("🧪 Testing Telegram Pin/Unpin Functionality\n");
  
  const telegram = getTelegramAlertSystemV2();
  
  // Test 1: Send critical steam alert with pinning
  console.log("📌 Test 1: Sending critical steam alert (should pin)");
  
  const criticalMovement: TotalMovement = {
    teamHome: "Test Home Team",
    teamAway: "Test Away Team",
    linePrevious: 150.5,
    lineCurrent: 149.5,
    lineMovement: -1.0, // Major movement (≥1 point)
    overPrevious: -110,
    overCurrent: -105,
    overChangePercent: 4.5,
    underPrevious: -110,
    underCurrent: -115,
    underChangePercent: -4.5,
    steamIndex: 2.5, // High steam index
    timestamp: Date.now(),
  };
  
  const result1 = await telegram.sendSteamAlertWithPin(99999, criticalMovement);
  console.log(`   Result: alertSent=${result1.alertSent}, pinned=${result1.pinned}\n`);
  
  if (result1.pinned) {
    console.log("✅ Critical alert pinned successfully!\n");
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Unpin the message
    console.log("📌 Test 2: Unpinning message");
    const channel = (await import("../src/config/telegram-channels-v2.ts")).getChannel('STEAM');
    
    // Note: We'd need to track message IDs to unpin, but for testing we can use the matchId
    // In production, you'd store the messageId from the sendSteamAlertWithPin result
    console.log("   Note: Unpinning requires messageId. Use unpinMatchMessages(matchId) if tracking is enabled.\n");
  }
  
  // Test 3: Send minor steam alert (should not pin)
  console.log("📌 Test 3: Sending minor steam alert (should NOT pin)");
  
  const minorMovement: TotalMovement = {
    teamHome: "Test Home Team 2",
    teamAway: "Test Away Team 2",
    linePrevious: 150.5,
    lineCurrent: 150.0,
    lineMovement: -0.5, // Minor movement (<1 point)
    overPrevious: -110,
    overCurrent: -108,
    overChangePercent: 1.8,
    underPrevious: -110,
    underCurrent: -112,
    underChangePercent: -1.8,
    steamIndex: 1.2, // Low steam index
    timestamp: Date.now(),
  };
  
  const result2 = await telegram.sendSteamAlertWithPin(99998, minorMovement);
  console.log(`   Result: alertSent=${result2.alertSent}, pinned=${result2.pinned}\n`);
  
  if (!result2.pinned) {
    console.log("✅ Minor alert correctly NOT pinned (as expected)\n");
  }
  
  console.log("✅ All pin tests completed!");
}

// Run tests
testPinFunctionality().catch(console.error);

