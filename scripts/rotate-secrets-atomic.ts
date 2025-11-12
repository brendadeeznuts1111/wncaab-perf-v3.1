#!/usr/bin/env bun
/**
 * TES-NGWS-001.12c: Atomic Secret Rotation
 * 
 * Rotates Telegram bot token atomically to prevent service interruption.
 * Uses atomic operations to ensure zero-downtime rotation.
 */

import { secrets } from "bun";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const SERVICE_NAME = "wncaab-perf-v3.1";
const SECRET_NAME = "telegram-bot-token";
const BACKUP_FILE = join(process.cwd(), "tmp", "secret-backup.json");

interface SecretBackup {
  oldToken: string | null;
  newToken: string | null;
  rotatedAt: string;
  rotatedBy: string;
}

async function rotateSecretAtomic(): Promise<void> {
  console.log("🔄 Starting atomic secret rotation...");
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log("");

  try {
    // Step 1: Get current token
    console.log("1️⃣  Reading current secret...");
    const currentSecret = await secrets.get({
      service: SERVICE_NAME,
      name: SECRET_NAME,
    }).catch(() => null);

    if (!currentSecret) {
      console.error("❌ No existing secret found. Cannot rotate.");
      console.error("   💡 Run: bun run scripts/setup-telegram-secret.ts");
      process.exit(1);
    }

    const currentToken = currentSecret.toString();
    console.log(`   ✅ Current token: ${currentToken.substring(0, 10)}...`);
    console.log("");

    // Step 2: Backup current token
    console.log("2️⃣  Creating backup...");
    const backup: SecretBackup = {
      oldToken: currentToken,
      newToken: null,
      rotatedAt: new Date().toISOString(),
      rotatedBy: process.env.USER || "cron",
    };

    // Ensure tmp directory exists
    const tmpDir = join(process.cwd(), "tmp");
    try {
      await Bun.write(BACKUP_FILE, JSON.stringify(backup, null, 2));
      console.log(`   ✅ Backup saved to: ${BACKUP_FILE}`);
    } catch (error) {
      console.warn(`   ⚠️  Could not create backup file: ${error}`);
    }
    console.log("");

    // Step 3: Prompt for new token (or read from env)
    console.log("3️⃣  Getting new token...");
    const newToken = process.env.NEW_TELEGRAM_BOT_TOKEN || process.argv[2];

    if (!newToken) {
      console.error("❌ New token not provided.");
      console.error("   Usage: NEW_TELEGRAM_BOT_TOKEN=token bun run scripts/rotate-secrets-atomic.ts");
      console.error("   Or:    bun run scripts/rotate-secrets-atomic.ts <new_token>");
      process.exit(1);
    }

    console.log(`   ✅ New token: ${newToken.substring(0, 10)}...`);
    console.log("");

    // Step 4: Atomic update (set new token)
    console.log("4️⃣  Updating secret atomically...");
    await secrets.set({
      service: SERVICE_NAME,
      name: SECRET_NAME,
    }, newToken);

    console.log("   ✅ Secret updated successfully");
    console.log("");

    // Step 5: Update backup with new token
    backup.newToken = newToken;
    try {
      await Bun.write(BACKUP_FILE, JSON.stringify(backup, null, 2));
      console.log("   ✅ Backup updated");
    } catch (error) {
      console.warn(`   ⚠️  Could not update backup: ${error}`);
    }
    console.log("");

    // Step 6: Verify rotation
    console.log("5️⃣  Verifying rotation...");
    const verifySecret = await secrets.get({
      service: SERVICE_NAME,
      name: SECRET_NAME,
    });

    if (verifySecret?.toString() === newToken) {
      console.log("   ✅ Rotation verified successfully");
    } else {
      console.error("   ❌ Verification failed - token mismatch!");
      console.error("   ⚠️  Rolling back to old token...");
      
      // Rollback
      await secrets.set({
        service: SERVICE_NAME,
        name: SECRET_NAME,
      }, currentToken);
      
      console.error("   ✅ Rolled back to previous token");
      process.exit(1);
    }
    console.log("");

    // Step 7: Log rotation event
    console.log("6️⃣  Logging rotation event...");
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: "SECRET_ROTATION",
      service: SERVICE_NAME,
      secret: SECRET_NAME,
      rotatedBy: process.env.USER || "cron",
      oldTokenPreview: currentToken.substring(0, 10),
      newTokenPreview: newToken.substring(0, 10),
    };

    const logFile = join(process.cwd(), "logs", "secret-rotation.log");
    try {
      const logLine = JSON.stringify(logEntry) + "\n";
      await Bun.write(logFile, logLine, { createPath: true, flag: "a" });
      console.log(`   ✅ Logged to: ${logFile}`);
    } catch (error) {
      console.warn(`   ⚠️  Could not write log: ${error}`);
    }
    console.log("");

    console.log("✅ Atomic secret rotation completed successfully!");
    console.log("");
    console.log("⚠️  IMPORTANT: Restart the application to use the new token:");
    console.log("   ./scripts/restart-sentinel.sh");
    console.log("   Or: kill -HUP $(cat tmp/sentinel.pid)");

  } catch (error) {
    console.error("❌ Secret rotation failed:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  rotateSecretAtomic().catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
}

