#!/usr/bin/env bun
/**
 * TES-NGWS-001.5: Cloudflare Workers Secret Setup Script
 * 
 * Sets required secrets for TES-NGWS-001.5 deployment:
 * - VERSION_SIGNING_KEY (required)
 * - VERSION_SIGNING_KEY_V2 (optional, for dual-key rotation)
 * - TES_PROXY_IPS (optional, for proxy IP whitelist)
 * 
 * Usage:
 *   bun run scripts/setup-ngws-001.5-secrets.ts --env=staging
 *   bun run scripts/setup-ngws-001.5-secrets.ts --env=staging --generate-keys
 *   bun run scripts/setup-ngws-001.5-secrets.ts --env=production --interactive
 */

import { parseArgs } from 'util';
import { spawn } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';

const args = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    env: { type: 'string', default: 'staging' },
    'generate-keys': { type: 'boolean', short: 'g', default: false },
    interactive: { type: 'boolean', short: 'i', default: true },
    'skip-existing': { type: 'boolean', short: 's', default: false },
    'dry-run': { type: 'boolean', default: false },
  },
});

const ENV = args.values.env || 'staging';
const GENERATE_KEYS = args.values['generate-keys'] || false;
const INTERACTIVE = args.values.interactive !== false;
const SKIP_EXISTING = args.values['skip-existing'] || false;
const DRY_RUN = args.values['dry-run'] || false;

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

// Check if wrangler CLI is available
async function checkWrangler(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('wrangler', ['--version'], { stdio: 'pipe' });
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });
}

// Check if authenticated
async function checkAuth(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('wrangler', ['whoami'], { stdio: 'pipe' });
    let output = '';
    proc.stdout?.on('data', (data) => { output += data.toString(); });
    proc.on('close', (code) => resolve(code === 0 && output.includes('@')));
    proc.on('error', () => resolve(false));
  });
}

// List existing secrets
async function listSecrets(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const proc = spawn('wrangler', ['secret', 'list', '--env', ENV], { stdio: 'pipe' });
    let output = '';
    proc.stdout?.on('data', (data) => { output += data.toString(); });
    proc.on('close', (code) => {
      if (code === 0) {
        // Parse secret names from output
        const secrets = output
          .split('\n')
          .filter(line => line.trim() && !line.includes('Secret') && !line.includes('---'))
          .map(line => line.split(/\s+/)[0])
          .filter(Boolean);
        resolve(secrets);
      } else {
        reject(new Error(`wrangler secret list failed: ${code}`));
      }
    });
    proc.on('error', reject);
  });
}

// Generate a secure random key (64 hex characters = 32 bytes)
function generateSigningKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Set a secret using wrangler
async function setSecret(name: string, value: string): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('wrangler', ['secret', 'put', name, '--env', ENV], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    
    // Send value to stdin
    proc.stdin?.write(value);
    proc.stdin?.end();
    
    let errorOutput = '';
    proc.stderr?.on('data', (data) => { errorOutput += data.toString(); });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        log(`  ❌ Failed to set ${name}: ${errorOutput}`, colors.red);
        resolve(false);
      }
    });
    
    proc.on('error', () => {
      log(`  ❌ Error setting ${name}`, colors.red);
      resolve(false);
    });
  });
}

// Prompt user for input
async function prompt(question: string, defaultValue?: string): Promise<string> {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    const promptText = defaultValue 
      ? `${question} [${defaultValue}]: `
      : `${question}: `;
    
    rl.question(promptText, (answer: string) => {
      rl.close();
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

// Main function
async function main() {
  log(`\n╔════════════════════════════════════════════════════════════╗`, colors.magenta);
  log(`║  TES-NGWS-001.5: Cloudflare Workers Secret Setup          ║`, colors.magenta);
  log(`╚════════════════════════════════════════════════════════════╝`, colors.magenta);
  log(`\nEnvironment: ${ENV}`, colors.cyan);
  if (DRY_RUN) {
    log(`🔍 DRY RUN MODE - No secrets will be set`, colors.yellow);
  }
  
  // Check prerequisites
  logSection('Pre-flight Checks');
  
  log('Checking wrangler CLI...', colors.blue);
  if (!(await checkWrangler())) {
    log('❌ wrangler CLI not found', colors.red);
    log('Install with: npm install -g wrangler', colors.yellow);
    log('Or use: bunx wrangler', colors.yellow);
    process.exit(1);
  }
  log('✅ wrangler CLI found', colors.green);
  
  log('Checking authentication...', colors.blue);
  if (!(await checkAuth())) {
    log('❌ Not authenticated with Cloudflare', colors.red);
    log('Running: wrangler login', colors.yellow);
    const loginProc = spawn('wrangler', ['login'], { stdio: 'inherit' });
    loginProc.on('close', (code) => {
      if (code !== 0) {
        log('❌ Login failed', colors.red);
        process.exit(1);
      }
      log('✅ Authentication successful', colors.green);
      main(); // Retry after login
    });
    return;
  }
  log('✅ Authenticated with Cloudflare', colors.green);
  
  // List existing secrets
  logSection('Existing Secrets');
  let existingSecrets: string[] = [];
  try {
    existingSecrets = await listSecrets();
    if (existingSecrets.length > 0) {
      log('Found existing secrets:', colors.blue);
      existingSecrets.forEach(secret => {
        log(`  • ${secret}`, colors.green);
      });
    } else {
      log('No existing secrets found', colors.yellow);
    }
  } catch (error) {
    log(`⚠️  Could not list secrets: ${error instanceof Error ? error.message : String(error)}`, colors.yellow);
  }
  
  // Required secrets
  logSection('Required Secrets');
  
  const secretsToSet: Array<{ name: string; required: boolean; description: string; generate?: () => string }> = [
    {
      name: 'VERSION_SIGNING_KEY',
      required: true,
      description: 'Primary signing key (v1) for HMAC-SHA256 version signatures',
      generate: generateSigningKey,
    },
    {
      name: 'VERSION_SIGNING_KEY_V2',
      required: false,
      description: 'Secondary signing key (v2) for zero-downtime key rotation',
      generate: generateSigningKey,
    },
    {
      name: 'TES_PROXY_IPS',
      required: false,
      description: 'Trusted proxy IPs (comma-separated, CIDR supported)',
    },
  ];
  
  const results: Array<{ name: string; success: boolean; skipped: boolean }> = [];
  
  for (const secret of secretsToSet) {
    logSection(`Setting: ${secret.name}`);
    log(`Description: ${secret.description}`, colors.blue);
    
    // Check if already exists
    if (existingSecrets.includes(secret.name)) {
      if (SKIP_EXISTING) {
        log(`⏭️  Skipping ${secret.name} (already exists)`, colors.yellow);
        results.push({ name: secret.name, success: true, skipped: true });
        continue;
      } else {
        log(`⚠️  ${secret.name} already exists`, colors.yellow);
        if (INTERACTIVE) {
          const overwrite = await prompt(`Overwrite? (y/N)`, 'N');
          if (overwrite.toLowerCase() !== 'y') {
            log(`⏭️  Skipping ${secret.name}`, colors.yellow);
            results.push({ name: secret.name, success: true, skipped: true });
            continue;
          }
        } else {
          log(`⏭️  Skipping ${secret.name} (use --skip-existing to auto-skip)`, colors.yellow);
          results.push({ name: secret.name, success: true, skipped: true });
          continue;
        }
      }
    }
    
    // Generate or prompt for value
    let value: string = '';
    
    // In dry-run mode, skip optional secrets
    if (DRY_RUN && !secret.required) {
      log(`⏭️  [DRY RUN] Skipping optional secret ${secret.name}`, colors.yellow);
      results.push({ name: secret.name, success: true, skipped: true });
      continue;
    }
    
    if (GENERATE_KEYS && secret.generate) {
      value = secret.generate();
      log(`Generated key: ${value.substring(0, 16)}...${value.substring(value.length - 8)}`, colors.cyan);
    } else if (INTERACTIVE && !DRY_RUN) {
      if (secret.generate) {
        const generate = await prompt(`Generate new key? (Y/n)`, 'Y');
        if (generate.toLowerCase() !== 'n') {
          value = secret.generate();
          log(`Generated key: ${value.substring(0, 16)}...${value.substring(value.length - 8)}`, colors.cyan);
        } else {
          value = await prompt(`Enter ${secret.name}`, '');
        }
      } else {
        value = await prompt(`Enter ${secret.name}`, '');
      }
    } else {
      if (secret.generate) {
        value = secret.generate();
        log(`Generated key: ${value.substring(0, 16)}...${value.substring(value.length - 8)}`, colors.cyan);
      } else {
        if (DRY_RUN) {
          // In dry-run, use placeholder for non-generatable secrets
          value = `[DRY-RUN-PLACEHOLDER]`;
        } else {
          log(`❌ Cannot set ${secret.name} non-interactively without value`, colors.red);
          if (secret.required) {
            log(`Required secret ${secret.name} not set. Exiting.`, colors.red);
            process.exit(1);
          } else {
            log(`Skipping optional secret ${secret.name}`, colors.yellow);
            results.push({ name: secret.name, success: false, skipped: false });
            continue;
          }
        }
      }
    }
    
    if (!value) {
      if (secret.required) {
        log(`❌ Required secret ${secret.name} not provided`, colors.red);
        process.exit(1);
      } else {
        log(`⏭️  Skipping optional secret ${secret.name}`, colors.yellow);
        results.push({ name: secret.name, success: false, skipped: false });
        continue;
      }
    }
    
    // Validate key format (for signing keys)
    if (secret.name.includes('SIGNING_KEY')) {
      if (!/^[0-9a-f]{64}$/i.test(value)) {
        log(`⚠️  Warning: Key should be 64 hex characters (32 bytes)`, colors.yellow);
        log(`   Current length: ${value.length}`, colors.yellow);
        if (INTERACTIVE) {
          const proceed = await prompt(`Proceed anyway? (y/N)`, 'N');
          if (proceed.toLowerCase() !== 'y') {
            log(`⏭️  Skipping ${secret.name}`, colors.yellow);
            results.push({ name: secret.name, success: false, skipped: false });
            continue;
          }
        }
      }
    }
    
    // Set secret (or dry-run)
    if (DRY_RUN) {
      log(`🔍 [DRY RUN] Would set ${secret.name}`, colors.yellow);
      log(`   Value preview: ${value.substring(0, 16)}...${value.substring(value.length - 8)}`, colors.cyan);
      results.push({ name: secret.name, success: true, skipped: false });
    } else {
      log(`Setting ${secret.name}...`, colors.blue);
      const success = await setSecret(secret.name, value);
      
      if (success) {
        log(`✅ Successfully set ${secret.name}`, colors.green);
        results.push({ name: secret.name, success: true, skipped: false });
      } else {
        log(`❌ Failed to set ${secret.name}`, colors.red);
        if (secret.required) {
          log(`Required secret ${secret.name} failed. Exiting.`, colors.red);
          process.exit(1);
        }
        results.push({ name: secret.name, success: false, skipped: false });
      }
    }
  }
  
  // Summary
  logSection('Summary');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const skipped = results.filter(r => r.skipped).length;
  
  log(`Total secrets: ${results.length}`, colors.blue);
  log(`✅ Successfully set: ${successful}`, colors.green);
  log(`⏭️  Skipped: ${skipped}`, colors.yellow);
  if (failed > 0) {
    log(`❌ Failed: ${failed}`, colors.red);
  }
  
  if (DRY_RUN) {
    log('\n🔍 Dry run complete. To actually set secrets, run without --dry-run:', colors.yellow);
    log(`  bun run scripts/setup-ngws-001.5-secrets.ts --env=${ENV}`, colors.cyan);
  } else {
    log('\nNext steps:', colors.cyan);
    log(`  1. Verify secrets: wrangler secret list --env=${ENV}`, colors.blue);
    log(`  2. Redeploy to activate: bunx wrangler deploy --env=${ENV}`, colors.blue);
    log(`  3. Run security tests: bun run scripts/test-ngws-001.5-security.ts --env=${ENV}`, colors.blue);
  }
  
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  log(`Fatal error: ${error instanceof Error ? error.message : String(error)}`, colors.red);
  process.exit(1);
});

