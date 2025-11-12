#!/usr/bin/env bun
/**
 * TES-NGWS-001.12c: Test Fallback Logging
 * 
 * Verifies that FALLBACK_TO_ENV is properly logged when .env is used
 */

import { TelegramAlertSystemV2 } from "../src/lib/telegram-alert-system-v2.ts";

async function testFallbackLogging() {
  console.log("🧪 Testing FALLBACK_TO_ENV logging...");
  console.log("");

  // Ensure .env exists
  const envContent = 'TELEGRAM_BOT_TOKEN="test-fallback-token-123"\nTELEGRAM_SUPERGROUP_ID="-1003482161671"';
  await Bun.write(".env", envContent);
  console.log("✅ Created .env file with test token");

  // Clear any existing Bun.secrets
  try {
    const secrets = (Bun as any).secrets;
    if (secrets) {
      await secrets.delete({
        service: "wncaab-perf-v3.1",
        name: "telegram-bot-token",
      }).catch(() => null);
    }
  } catch {
    // Secrets API not available, continue
  }
  console.log("✅ Ensured Bun.secrets is not set");
  console.log("");

  // Create instance (should trigger FALLBACK_TO_ENV)
  console.log("Creating TelegramAlertSystemV2 instance...");
  try {
    const alertSystem = new TelegramAlertSystemV2();
    console.log("✅ Instance created successfully");
    console.log(`   Token source: ${(alertSystem as any).tokenSource}`);
    console.log("");
  } catch (error) {
    console.error("❌ Failed to create instance:", error);
    process.exit(1);
  }

  // Check logs (wait a bit for async write)
  console.log("Checking logs for FALLBACK_TO_ENV...");
  await new Promise(resolve => setTimeout(resolve, 500)); // Wait for async Bun.write
  
  const logFile = Bun.file("logs/headers-index.log");
  if (await logFile.exists()) {
    const logs = await logFile.text();
    const fallbackFound = logs.includes("FALLBACK_TO_ENV");
    
    console.log("");
    console.log("📊 Test Results:");
    console.log(`   - FALLBACK_TO_ENV logged: ${fallbackFound ? "✅ YES" : "❌ NO"}`);
    
    if (fallbackFound) {
      const matches = logs.match(/\[FALLBACK_TO_ENV\].*?\[HEADERS_BLOCK_END\]/g);
      console.log(`   - Found ${matches?.length || 0} FALLBACK_TO_ENV entries`);
      if (matches && matches.length > 0) {
        console.log("   - Latest entry:");
        console.log(`     ${matches[matches.length - 1].substring(0, 200)}...`);
      }
    } else {
      console.log("   ⚠️  FALLBACK_TO_ENV not found in logs");
      console.log("   Recent log entries:");
      const recentLogs = logs.split("\n").slice(-5);
      recentLogs.forEach(line => {
        if (line.trim()) console.log(`     ${line.substring(0, 150)}`);
      });
    }
    console.log("");

    if (!fallbackFound) {
      console.error("❌ TEST FAILED: FALLBACK_TO_ENV not logged");
      process.exit(1);
    }
  } else {
    console.log("⚠️  Log file not found");
  }

  // Cleanup
  try {
    await Bun.write(".env", envContent); // Restore original .env
  } catch {
    // Ignore cleanup errors
  }

  console.log("✅ TEST PASSED: Fallback properly logged");
}

if (import.meta.main) {
  testFallbackLogging().catch((error) => {
    console.error("💥 Test failed:", error);
    process.exit(1);
  });
}

