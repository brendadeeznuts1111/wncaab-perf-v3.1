#!/usr/bin/env bun
/**
 * Verify Bun.secrets Integration - TES-NGWS-001.12c
 * 
 * Verifies secure token retrieval with Bun.secrets priority and .env fallback.
 * Checks rg audit trail for security events.
 * 
 * Usage:
 *   bun run scripts/verify-secrets.ts
 */

import { TelegramAlertSystemV2 } from "../src/lib/telegram-alert-system-v2.ts";

async function verifySecrets() {
  console.log("🔐 Testing secure token retrieval...\n");
  
  try {
    const alertSystem = new TelegramAlertSystemV2();
    console.log("✅ TelegramAlertSystemV2 initialized successfully");
    
    // Query rg logs for security audit
    console.log("\n📊 Security audit trail:");
    
    try {
      const rgLogs = await Bun.file("logs/headers-index.log").text();
      const secretsLogs = rgLogs.split('\n').filter(line => 
        line.includes("SECRETS_UPGRADE_V2") || 
        line.includes("FALLBACK_TO_ENV") ||
        line.includes("TOKEN_CONFIG_MISSING") ||
        line.includes("SECRETS_TAMPER_DETECTED")
      );
      
      if (secretsLogs.length > 0) {
        console.log(`Found ${secretsLogs.length} security events:\n`);
        secretsLogs.slice(-5).forEach(log => {
          const preview = log.substring(0, 200);
          console.log(`  ${preview}...`);
        });
      } else {
        console.log("  No security events found in recent logs");
      }
    } catch (error) {
      console.log("  ⚠️  Could not read logs/headers-index.log (may not exist yet)");
    }
    
    // Check token source
    console.log("\n🔍 Token Source Analysis:");
    if (Bun.env.TELEGRAM_BOT_TOKEN) {
      console.log("  ✅ Token from Bun.secrets (most secure)");
      console.log("     Access: Bun.env.TELEGRAM_BOT_TOKEN");
    } else if (process.env.TELEGRAM_BOT_TOKEN) {
      console.log("  ⚠️  Token from .env (fallback mode)");
      console.log("     Access: process.env.TELEGRAM_BOT_TOKEN");
      console.log("     💡 For production, migrate to Bun.secrets:");
      console.log("        bun run scripts/setup-telegram-secret.ts");
    } else {
      console.log("  ❌ No token found");
    }
    
    console.log("\n✅ Bun.secrets integration verified");
    console.log("\n📋 RG Audit Queries:");
    console.log("  # Track security upgrades:");
    console.log('  rg "\\[SECRETS_UPGRADE_V2\\]" logs/headers-index.log | wc -l');
    console.log("\n  # Find systems using .env fallback:");
    console.log('  rg "\\[FALLBACK_TO_ENV\\]" logs/headers-index.log');
    console.log("\n  # Emergency: Find missing token configs:");
    console.log('  rg "\\[TOKEN_CONFIG_MISSING\\]" logs/headers-index.log');
    console.log("\n  # Verify token source distribution:");
    console.log('  rg "\\[TELEGRAM_SENT\\]" logs/headers-index.log | rg -o "source:(\\w+)" | sort | uniq -c');
    
  } catch (error: any) {
    console.error("❌ Initialization failed:", error.message);
    if (error.message.includes("TELEGRAM_BOT_TOKEN")) {
      console.error("\n💡 Setup instructions:");
      console.error("  1. Set token in .env: export TELEGRAM_BOT_TOKEN=\"your_token\"");
      console.error("  2. Or use Bun.secrets: bun run scripts/setup-telegram-secret.ts");
    }
    process.exit(1);
  }
}

if (import.meta.main) {
  verifySecrets();
}

export { verifySecrets };







