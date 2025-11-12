#!/usr/bin/env bun
/**
 * TES-NGWS-001.12c: Compliance Verification Script
 * 
 * Verifies that the false security positive fix is working correctly:
 * - Development: Logs FALLBACK_TO_ENV when .env used
 * - Production: No FALLBACK_TO_ENV logs (only Bun.secrets)
 * - Audit: Clear distinction between sources via rg logs
 */

import { existsSync } from "fs";
import { readFileSync } from "fs";

const LOG_FILE = "logs/headers-index.log";

interface ComplianceCheck {
  name: string;
  passed: boolean;
  message: string;
}

async function verifyCompliance(): Promise<void> {
  console.log("🔍 TES-NGWS-001.12c Compliance Verification");
  console.log("==========================================\n");

  const checks: ComplianceCheck[] = [];

  // Check 1: .env file detection works
  console.log("1️⃣  Checking .env file detection...");
  const envExists = existsSync(".env");
  checks.push({
    name: ".env file detection",
    passed: true, // File check works
    message: envExists ? "✅ .env file exists" : "⚠️  .env file not found"
  });
  console.log(`   ${envExists ? "✅" : "⚠️ "} .env file: ${envExists ? "exists" : "not found"}\n`);

  // Check 2: Log file exists
  console.log("2️⃣  Checking log file...");
  const logExists = existsSync(LOG_FILE);
  if (!logExists) {
    checks.push({
      name: "Log file exists",
      passed: false,
      message: "❌ Log file not found - no entries to verify"
    });
    console.log("   ❌ Log file not found\n");
    console.log("⚠️  Cannot verify compliance - log file missing");
    process.exit(1);
  }
  checks.push({
    name: "Log file exists",
    passed: true,
    message: "✅ Log file exists"
  });
  console.log("   ✅ Log file exists\n");

  // Check 3: Count FALLBACK_TO_ENV entries
  console.log("3️⃣  Analyzing FALLBACK_TO_ENV entries...");
  const logContent = readFileSync(LOG_FILE, "utf-8");
  const fallbackMatches = logContent.match(/\[FALLBACK_TO_ENV\]/g);
  const fallbackCount = fallbackMatches?.length || 0;
  
  const fallbackEntries = logContent
    .split("\n")
    .filter(line => line.includes("FALLBACK_TO_ENV"))
    .map(line => {
      const match = line.match(/bunApi:(\w+)/);
      return {
        source: match ? match[1] : "unknown",
        line: line.substring(0, 200)
      };
    });

  console.log(`   Found ${fallbackCount} FALLBACK_TO_ENV entries`);
  if (fallbackEntries.length > 0) {
    console.log("   Sources:");
    fallbackEntries.forEach((entry, i) => {
      console.log(`     ${i + 1}. ${entry.source}`);
    });
  }
  console.log("");

  // Check 4: Count SECRETS_UPGRADE_V3 entries (Bun.secrets usage)
  console.log("4️⃣  Analyzing SECRETS_UPGRADE_V3 entries (Bun.secrets)...");
  const secretsMatches = logContent.match(/\[SECRETS_UPGRADE_V3\]/g);
  const secretsCount = secretsMatches?.length || 0;
  console.log(`   Found ${secretsCount} SECRETS_UPGRADE_V3 entries\n`);

  // Check 5: Environment detection
  console.log("5️⃣  Checking environment...");
  const isProduction = process.env.NODE_ENV === "production" || 
                       !existsSync("bunfig.development.toml");
  const bunSecretsSet = await checkBunSecrets();
  
  console.log(`   Environment: ${isProduction ? "Production" : "Development"}`);
  console.log(`   Bun.secrets configured: ${bunSecretsSet ? "✅ Yes" : "❌ No"}`);
  console.log(`   .env file exists: ${envExists ? "✅ Yes" : "❌ No"}\n`);

  // Compliance assessment
  console.log("📊 Compliance Assessment");
  console.log("=======================\n");

  if (isProduction) {
    // Production: Should have NO FALLBACK_TO_ENV
    if (fallbackCount === 0 && secretsCount > 0) {
      checks.push({
        name: "Production compliance",
        passed: true,
        message: "✅ Production compliant: No FALLBACK_TO_ENV, using Bun.secrets"
      });
      console.log("✅ PRODUCTION COMPLIANT");
      console.log("   - No FALLBACK_TO_ENV entries (correct)");
      console.log("   - Using Bun.secrets (SECRETS_UPGRADE_V3 found)");
    } else if (fallbackCount > 0) {
      checks.push({
        name: "Production compliance",
        passed: false,
        message: `❌ Production violation: ${fallbackCount} FALLBACK_TO_ENV entries found`
      });
      console.log("❌ PRODUCTION VIOLATION");
      console.log(`   - Found ${fallbackCount} FALLBACK_TO_ENV entries (should be 0)`);
      console.log("   - Action: Configure Bun.secrets and disable .env auto-load");
    } else {
      checks.push({
        name: "Production compliance",
        passed: false,
        message: "⚠️  Production: No token source detected"
      });
      console.log("⚠️  PRODUCTION WARNING");
      console.log("   - No FALLBACK_TO_ENV entries");
      console.log("   - No SECRETS_UPGRADE_V3 entries");
      console.log("   - Token source unclear");
    }
  } else {
    // Development: FALLBACK_TO_ENV is acceptable
    if (fallbackCount > 0) {
      checks.push({
        name: "Development compliance",
        passed: true,
        message: `✅ Development: ${fallbackCount} FALLBACK_TO_ENV entries (expected)`
      });
      console.log("✅ DEVELOPMENT COMPLIANT");
      console.log(`   - ${fallbackCount} FALLBACK_TO_ENV entries (expected in dev)`);
      console.log("   - Source distinction working correctly");
    } else if (secretsCount > 0) {
      checks.push({
        name: "Development compliance",
        passed: true,
        message: "✅ Development: Using Bun.secrets (no fallback needed)"
      });
      console.log("✅ DEVELOPMENT COMPLIANT");
      console.log("   - Using Bun.secrets (no fallback)");
      console.log("   - This is acceptable in development");
    } else {
      checks.push({
        name: "Development compliance",
        passed: false,
        message: "⚠️  Development: No token source detected"
      });
      console.log("⚠️  DEVELOPMENT WARNING");
      console.log("   - No FALLBACK_TO_ENV entries");
      console.log("   - No SECRETS_UPGRADE_V3 entries");
      console.log("   - Token source unclear");
    }
  }

  console.log("");

  // Audit queries
  console.log("🔍 Audit Queries");
  console.log("================\n");
  console.log("Check FALLBACK_TO_ENV entries:");
  console.log(`  rg "\\[FALLBACK_TO_ENV\\]" ${LOG_FILE} | wc -l`);
  console.log(`  Result: ${fallbackCount}\n`);

  console.log("Check Bun.secrets usage:");
  console.log(`  rg "\\[SECRETS_UPGRADE_V3\\]" ${LOG_FILE} | wc -l`);
  console.log(`  Result: ${secretsCount}\n`);

  console.log("Check token source distribution:");
  console.log(`  rg "source:(env_file|process_env|bun_secrets)" ${LOG_FILE} | sort | uniq -c`);
  console.log("");

  // Summary
  const passedChecks = checks.filter(c => c.passed).length;
  const totalChecks = checks.length;

  console.log("📋 Summary");
  console.log("==========\n");
  checks.forEach(check => {
    console.log(`  ${check.passed ? "✅" : "❌"} ${check.name}: ${check.message}`);
  });
  console.log(`\n  Passed: ${passedChecks}/${totalChecks}`);

  if (passedChecks === totalChecks) {
    console.log("\n✅ TES-NGWS-001.12c: COMPLIANT");
    process.exit(0);
  } else {
    console.log("\n⚠️  TES-NGWS-001.12c: REVIEW REQUIRED");
    process.exit(1);
  }
}

async function checkBunSecrets(): Promise<boolean> {
  try {
    const secrets = (Bun as any).secrets;
    if (secrets) {
      const token = await secrets.get({
        service: "wncaab-perf-v3.1",
        name: "telegram-bot-token",
      }).catch(() => null);
      return !!token;
    }
  } catch {
    // Secrets API not available
  }
  return false;
}

if (import.meta.main) {
  verifyCompliance().catch((error) => {
    console.error("💥 Verification failed:", error);
    process.exit(1);
  });
}

