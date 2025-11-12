/**
 * Test Steam Alert Script - TES-NGWS-001.12
 * 
 * Test script to verify Telegram alert delivery.
 * 
 * @module scripts/test-steam-alert
 */

import { getTelegramAlertSystem } from "../src/lib/telegram-alert-system.ts";
import { NowGoalTick } from "../src/models/nowgoal-tick.ts";

async function main() {
  console.log("🧪 Testing Telegram Steam Alert...");
  
  const telegram = getTelegramAlertSystem();
  
  if (!telegram) {
    console.error("❌ Telegram not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_SUPERGROUP_ID");
    process.exit(1);
  }
  
  // Create test tick
  const testTick: NowGoalTick = {
    gameId: "TEST-GAME-123",
    bookmakerId: "TEST-BOOK",
    oddsType: "moneyline",
    oldValue: 1.95,
    newValue: 1.75,
    timestamp: Date.now(),
    market: {
      homeTeam: "Test Home Team",
      awayTeam: "Test Away Team",
      league: "WNCAAB"
    }
  };
  
  console.log("📤 Sending test steam alert...");
  console.log(`   Game: ${testTick.market.homeTeam} vs ${testTick.market.awayTeam}`);
  console.log(`   Odds: ${testTick.oldValue} → ${testTick.newValue}`);
  
  try {
    await telegram.sendSteamAlert(testTick);
    console.log("✅ Test alert sent successfully!");
    console.log("📱 Check your Telegram supergroup topic #1 (Steam Alerts)");
  } catch (error) {
    console.error("❌ Failed to send test alert:", error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
}

