#!/usr/bin/env bun
/**
 * TES-DEPLOY-001: Full Interactive Worker & Secrets Deployment
 * DRI Mode: Dry-Run Recursive Interactive
 * Entry Point: main()
 * 
 * Orchestrates complete TES deployment workflow with:
 * - Global error boundary
 * - Dry-run detection and propagation
 * - Interactive environment selection
 * - Audit trail logging
 * - Recursive dry-run support
 */

import { logTESEvent } from '../lib/production-utils.ts';
import { mainDeployFlow, promptForEnvironment } from './tes-deploy-modules.ts';

/**
 * Main orchestrator for TES deployment
 * Implements global error boundary and dry-run detection
 */
async function main() {
  // IMMEDIATE: Parse execution mode before any operations
  const isDryRun = Bun.argv.includes('--dry-run');
  let targetEnv: string | undefined;

  // MARK: Script initialization in audit trail
  await logTESEvent('[DEPLOY][INIT]', { DRY_RUN: isDryRun.toString() });

  try {
    // Phase 1: Environment Resolution
    const envFlagIndex = Bun.argv.findIndex(arg => arg.startsWith('--env='));
    if (envFlagIndex !== -1) {
      targetEnv = Bun.argv[envFlagIndex].split('=')[1];
      await logTESEvent('[DEPLOY][ENV_FLAG]', { ENV: targetEnv });
    } else {
      // Interactive fallback - prompts user with validation
      targetEnv = await promptForEnvironment();
      await logTESEvent('[DEPLOY][ENV_SELECTED]', { 
        ENV: targetEnv, 
        INTERACTIVE: 'true' 
      });
    }

    // Phase 2: Execute Core Deployment Logic
    await logTESEvent('[DEPLOY][FLOW_START]', { 
      ENV: targetEnv, 
      DRY_RUN: isDryRun.toString() 
    });
    await mainDeployFlow(targetEnv, { isDryRun });

    // Phase 3: Success Path - Clean, informative exit
    const executionMode = isDryRun ? 'DRY RUN' : 'DEPLOYMENT';
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ ${executionMode} SUCCESS`);
    console.log(`   Environment: ${targetEnv}`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);
    console.log(`\n📋 Audit Command: rg "DEPLOY.*${targetEnv}" logs/worker-events.log`);
    console.log(`${'='.repeat(60)}\n`);

    await logTESEvent('[DEPLOY][FINAL_STATUS]', {
      ENV: targetEnv,
      STATUS: 'SUCCESS',
      DRY_RUN: isDryRun.toString(),
    });

    process.exit(0);

  } catch (error) {
    // Phase 4: Error Path - Controlled failure with diagnostics
    const errorMessage = error instanceof Error ? error.message : String(error);
    const envContext = targetEnv || 'unknown';

    // Immediate stderr output for operator visibility
    console.error('\n' + '❌'.repeat(10) + ' DEPLOYMENT FAILURE ' + '❌'.repeat(10));
    console.error(`Error Type: ${error instanceof Error ? error.name : 'Unknown'}`);
    console.error(`Message: ${errorMessage}`);
    console.error('\n🔍 Immediate Actions:');
    console.error('   1. Check audit trail: rg "UNEXPECTED_ERROR" logs/worker-events.log');
    console.error('   2. Verify Wrangler auth: wrangler whoami');
    console.error('   3. Validate wrangler.toml: wrangler deploy --dry-run');
    console.error('   4. Check Cloudflare status: https://www.cloudflarestatus.com/');
    console.error('❌'.repeat(40) + '\n');

    // Detailed audit logging for post-mortem
    await logTESEvent('[DEPLOY][UNEXPECTED_ERROR]', {
      ENV: envContext,
      ERROR_MESSAGE: errorMessage,
      DRY_RUN: isDryRun.toString(),
    });

    // Include stack trace in audit log for deep debugging
    if (error instanceof Error && error.stack) {
      await logTESEvent('[DEPLOY][ERROR_STACK]', {
        ENV: envContext,
        STACK: error.stack.replace(/\n/g, ' -> '),
      });
    }

    process.exit(1);
  }
}

// Execute on script load
if (import.meta.main) {
  main();
}

export { main };

