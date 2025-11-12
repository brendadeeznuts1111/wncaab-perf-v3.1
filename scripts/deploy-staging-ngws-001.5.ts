#!/usr/bin/env bun
/**
 * TES-NGWS-001.5: Staging Deployment Script (TypeScript)
 * Deploys TES-NGWS-001.5 security-hardened WebSocket foundation to Cloudflare Workers staging
 * 
 * Usage:
 *   bun run scripts/deploy-staging-ngws-001.5.ts --env=staging
 *   bun run scripts/deploy-staging-ngws-001.5.ts --env=staging --dry-run
 */

import { spawn } from 'child_process';
import { promisify } from 'util';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  log(`\n${'═'.repeat(60)}`, colors.cyan);
  log(`  ${title}`, colors.cyan);
  log(`${'═'.repeat(60)}`, colors.cyan);
}

// Check for global --dry-run flag
const DRY_RUN = Bun.argv.includes('--dry-run');

// Parse environment from args
const envArgIndex = Bun.argv.findIndex(arg => arg === '--env');
const ENV = envArgIndex !== -1 && Bun.argv[envArgIndex + 1] 
  ? Bun.argv[envArgIndex + 1] 
  : 'staging';

const WORKER_NAME = `tes-ngws-001-flux-veto-${ENV}`;

// Helper functions
async function execCommand(command: string, args: string[]): Promise<{ success: boolean; output: string; error?: string }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { stdio: 'pipe' });
    let output = '';
    let errorOutput = '';
    
    proc.stdout?.on('data', (data) => { output += data.toString(); });
    proc.stderr?.on('data', (data) => { errorOutput += data.toString(); });
    
    proc.on('close', (code) => {
      resolve({
        success: code === 0,
        output: output.trim(),
        error: errorOutput.trim() || undefined,
      });
    });
    
    proc.on('error', (err) => {
      resolve({
        success: false,
        output: '',
        error: err.message,
      });
    });
  });
}

async function checkWrangler(): Promise<boolean> {
  const result = await execCommand('wrangler', ['--version']);
  return result.success;
}

async function checkAuth(): Promise<boolean> {
  const result = await execCommand('wrangler', ['whoami']);
  return result.success && result.output.includes('@');
}

async function listSecrets(): Promise<string[]> {
  const result = await execCommand('wrangler', ['secret', 'list', '--env', ENV]);
  if (!result.success) {
    return [];
  }
  
  // Parse secret names from output
  return result.output
    .split('\n')
    .filter(line => line.trim() && !line.includes('Secret') && !line.includes('---'))
    .map(line => line.split(/\s+/)[0])
    .filter(Boolean);
}

/**
 * Main deployment flow
 */
async function mainDeployFlow(): Promise<void> {
  log(`\n╔════════════════════════════════════════════════════════════╗`, colors.cyan);
  log(`║  TES-NGWS-001.5: Staging Deployment                    ║`, colors.cyan);
  log(`╚════════════════════════════════════════════════════════════╝`, colors.cyan);
  
  if (DRY_RUN) {
    log(`\n🔍 DRY RUN MODE - No actual deployment will occur`, colors.yellow);
  }
  
  log(`\nEnvironment: ${ENV}`, colors.cyan);
  log(`Worker: ${WORKER_NAME}`, colors.cyan);
  
  // Step 1: Pre-flight checks
  logSection('Pre-flight Checks');
  
  log('Checking wrangler CLI...', colors.blue);
  if (!(await checkWrangler())) {
    log('❌ wrangler CLI not found. Install with: npm install -g wrangler', colors.red);
    throw new Error('Wrangler CLI not found');
  }
  log('✅ wrangler CLI found', colors.green);
  
  log('Checking authentication...', colors.blue);
  if (!(await checkAuth())) {
    log('❌ Not authenticated. Please run: wrangler login', colors.red);
    throw new Error('Not authenticated with Cloudflare');
  }
  log('✅ Authenticated with Cloudflare', colors.green);
  
  // Verify wrangler.toml exists
  const wranglerToml = Bun.file('wrangler.toml');
  if (!(await wranglerToml.exists())) {
    log('❌ wrangler.toml not found', colors.red);
    throw new Error('wrangler.toml not found');
  }
  log('✅ wrangler.toml found', colors.green);
  
  // Step 2: Verify secrets
  logSection('Verifying Secrets');
  
  const existingSecrets = await listSecrets();
  let secretsOk = true;
  
  // Check VERSION_SIGNING_KEY
  if (!existingSecrets.includes('VERSION_SIGNING_KEY')) {
    log(`⚠️  VERSION_SIGNING_KEY not set for ${ENV}`, colors.yellow);
    log(`   Set with: wrangler secret put VERSION_SIGNING_KEY --env=${ENV}`, colors.cyan);
    secretsOk = false;
  } else {
    log('✅ VERSION_SIGNING_KEY configured', colors.green);
  }
  
  // Check VERSION_SIGNING_KEY_V2 (optional)
  if (!existingSecrets.includes('VERSION_SIGNING_KEY_V2')) {
    log(`⚠️  VERSION_SIGNING_KEY_V2 not set (optional for dual-key rotation)`, colors.yellow);
  } else {
    log('✅ VERSION_SIGNING_KEY_V2 configured', colors.green);
  }
  
  // Check TES_PROXY_IPS (optional)
  if (!existingSecrets.includes('TES_PROXY_IPS')) {
    log(`⚠️  TES_PROXY_IPS not set (optional for proxy IP whitelist)`, colors.yellow);
  } else {
    log('✅ TES_PROXY_IPS configured', colors.green);
  }
  
  if (!secretsOk && !DRY_RUN) {
    log('❌ Some required secrets are missing', colors.red);
    // In non-interactive mode, we'll continue anyway for dry-run
    throw new Error('Required secrets missing');
  }
  
  // Step 3: Build verification
  logSection('Build Verification');
  
  const workerFile = Bun.file('src/workers/flux-veto-worker.ts');
  if (!(await workerFile.exists())) {
    log('❌ Worker entry point not found: src/workers/flux-veto-worker.ts', colors.red);
    throw new Error('Worker entry point not found');
  }
  log('✅ Worker entry point found', colors.green);
  
  const doFile = Bun.file('src/version-management-do.ts');
  if (!(await doFile.exists())) {
    log('❌ VersionManagementDO not found: src/version-management-do.ts', colors.red);
    throw new Error('VersionManagementDO not found');
  }
  log('✅ VersionManagementDO found', colors.green);
  
  // Step 4: Type check (optional)
  logSection('Type Check');
  const bunCheck = await execCommand('bun', ['--bun', 'tsc', '--noEmit', '--skipLibCheck', 'src/workers/flux-veto-worker.ts', 'src/version-management-do.ts']);
  if (bunCheck.success) {
    log('✅ Type check passed', colors.green);
  } else {
    log('⚠️  Type check warnings (continuing...)', colors.yellow);
  }
  
  // Step 5: Deploy to staging
  logSection('Deployment');
  log(`Worker: ${WORKER_NAME}`, colors.cyan);
  log(`Environment: ${ENV}`, colors.cyan);
  
  if (DRY_RUN) {
    log('🔍 [DRY RUN] Would deploy with: wrangler deploy --env=' + ENV, colors.yellow);
    log('🔍 [DRY RUN] Skipping actual deployment', colors.yellow);
  } else {
    log('Deploying to Cloudflare Workers...', colors.blue);
    const deployResult = await execCommand('wrangler', ['deploy', '--env', ENV]);
    
    if (!deployResult.success) {
      log('❌ Deployment failed', colors.red);
      if (deployResult.error) {
        log(`Error: ${deployResult.error}`, colors.red);
      }
      throw new Error('Deployment failed');
    }
    log('✅ Deployment successful', colors.green);
    if (deployResult.output) {
      // Extract URL from output if available
      const urlMatch = deployResult.output.match(/https:\/\/[^\s]+/);
      if (urlMatch) {
        log(`Deployment URL: ${urlMatch[0]}`, colors.cyan);
      }
    }
  }
  
  // Step 6: Health check (skip in dry-run)
  if (!DRY_RUN) {
    logSection('Health Check');
    const healthUrl = `https://${WORKER_NAME}.workers.dev/health`;
    log(`Checking: ${healthUrl}`, colors.cyan);
    
    try {
      const response = await fetch(healthUrl);
      if (response.ok) {
        const data = await response.json();
        log('✅ Health check passed', colors.green);
        log(`Response: ${JSON.stringify(data)}`, colors.cyan);
      } else {
        log(`⚠️  Health check returned HTTP ${response.status}`, colors.yellow);
      }
    } catch (error) {
      log(`⚠️  Health check failed: ${error instanceof Error ? error.message : String(error)}`, colors.yellow);
      log('Worker may still be initializing...', colors.yellow);
    }
  }
  
  // Summary
  logSection('Deployment Summary');
  log(`✅ ${DRY_RUN ? 'Dry run' : 'Staging deployment'} complete`, colors.green);
  log(`Environment: ${ENV}`, colors.cyan);
  
  if (!DRY_RUN) {
    log('\nNext steps:', colors.yellow);
    log(`  1. Run security validation tests:`, colors.blue);
    log(`     bun run scripts/test-ngws-001.5-security.ts --env=${ENV}`, colors.cyan);
    log(`  2. Monitor logs:`, colors.blue);
    log(`     wrangler tail --env=${ENV}`, colors.cyan);
  }
}

/**
 * Main function with error handling
 */
async function main(): Promise<void> {
  try {
    await mainDeployFlow();
    
    // Success logging
    const status = DRY_RUN ? 'DRY_RUN_SUCCESS' : 'SUCCESS';
    console.log(`\n[DEPLOY][FINAL_STATUS][ENV:${ENV}][STATUS:${status}][DRY_RUN:${DRY_RUN}]`);
    
    log('\n✅ Deployment process completed successfully!', colors.green);
    process.exit(0);
  } catch (error) {
    // Error logging
    console.error(`\n[DEPLOY][UNEXPECTED_ERROR][ENV:${ENV}][DRY_RUN:${DRY_RUN}]`);
    console.error(`[DEPLOY][ERROR_MESSAGE] ${error instanceof Error ? error.message : String(error)}`);
    
    if (error instanceof Error && error.stack) {
      console.error(`[DEPLOY][ERROR_STACK] ${error.stack}`);
    }
    
    log('\n❌ Deployment failed', colors.red);
    log(`Error: ${error instanceof Error ? error.message : String(error)}`, colors.red);
    
    process.exit(1);
  }
}

// Call main() at the end
if (import.meta.main) {
  main();
}

export { mainDeployFlow, main };

