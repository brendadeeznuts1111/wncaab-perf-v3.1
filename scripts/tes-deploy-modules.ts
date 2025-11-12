/**
 * TES-DEPLOY-001: Deployment Modules
 * 
 * Modular deployment functions for TES worker deployment
 * Supports dry-run mode and interactive prompts
 */

import { spawn } from 'child_process';
import { logTESEvent } from '../lib/production-utils.ts';

export interface DeployOptions {
  isDryRun: boolean;
}

/**
 * Prompt user for environment selection
 */
export async function promptForEnvironment(): Promise<string> {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    console.log('\n⚠️  No --env flag detected. Initiating interactive selection...\n');
    console.log('Select deployment environment:');
    console.log('  [1] staging    - Test environment, safe for experiments');
    console.log('  [2] production - Live environment, affects real users');
    console.log('');

    rl.question('Enter choice [1-2]: ', (answer) => {
      rl.close();
      const choice = answer.trim();
      if (choice === '1' || choice.toLowerCase() === 'staging') {
        resolve('staging');
      } else if (choice === '2' || choice.toLowerCase() === 'production') {
        resolve('production');
      } else {
        console.error('❌ Invalid choice. Defaulting to staging.');
        resolve('staging');
      }
    });
  });
}

/**
 * Execute command and return result
 */
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

/**
 * Main deployment flow
 * Orchestrates all deployment steps
 */
export async function mainDeployFlow(env: string, options: DeployOptions): Promise<void> {
  const { isDryRun } = options;
  const workerName = `tes-ngws-001-flux-veto-${env}`;

  await logTESEvent('[DEPLOY][FLOW_START]', {
    ENV: env,
    WORKER: workerName,
    DRY_RUN: isDryRun.toString(),
  });

  // Step 1: Pre-flight checks
  await logTESEvent('[DEPLOY][PREFLIGHT_START]', { ENV: env });

  // Check wrangler CLI
  const wranglerCheck = await execCommand('wrangler', ['--version']);
  if (!wranglerCheck.success) {
    throw new Error('Wrangler CLI not found. Install with: npm install -g wrangler');
  }

  // Check authentication
  const authCheck = await execCommand('wrangler', ['whoami']);
  if (!authCheck.success) {
    throw new Error('Not authenticated with Cloudflare. Run: wrangler login');
  }

  // Verify wrangler.toml
  const wranglerToml = Bun.file('wrangler.toml');
  if (!(await wranglerToml.exists())) {
    throw new Error('wrangler.toml not found');
  }

  await logTESEvent('[DEPLOY][PREFLIGHT_SUCCESS]', { ENV: env });

  // Step 2: Verify secrets
  await logTESEvent('[DEPLOY][SECRETS_CHECK_START]', { ENV: env });

  const secretsList = await execCommand('wrangler', ['secret', 'list', '--env', env]);
  const hasSigningKey = secretsList.output.includes('VERSION_SIGNING_KEY');

  if (!hasSigningKey && !isDryRun) {
    await logTESEvent('[DEPLOY][SECRETS_MISSING]', { ENV: env });
    throw new Error('VERSION_SIGNING_KEY not set. Run: bun run scripts/setup-ngws-001.5-secrets.ts --env=' + env);
  }

  await logTESEvent('[DEPLOY][SECRETS_CHECK_SUCCESS]', { ENV: env });

  // Step 3: Build verification
  await logTESEvent('[DEPLOY][BUILD_CHECK_START]', { ENV: env });

  const workerFile = Bun.file('src/workers/flux-veto-worker.ts');
  const doFile = Bun.file('src/version-management-do.ts');

  if (!(await workerFile.exists())) {
    throw new Error('Worker entry point not found: src/workers/flux-veto-worker.ts');
  }

  if (!(await doFile.exists())) {
    throw new Error('VersionManagementDO not found: src/version-management-do.ts');
  }

  await logTESEvent('[DEPLOY][BUILD_CHECK_SUCCESS]', { ENV: env });

  // Step 4: Deploy
  await logTESEvent('[DEPLOY][DEPLOY_START]', { ENV: env, DRY_RUN: isDryRun.toString() });

  if (isDryRun) {
    // Dry-run deployment check
    const dryRunResult = await execCommand('wrangler', ['deploy', '--env', env, '--dry-run']);
    if (!dryRunResult.success) {
      throw new Error(`Dry-run validation failed: ${dryRunResult.error || 'Unknown error'}`);
    }
    await logTESEvent('[DEPLOY][DEPLOY_DRY_RUN_SUCCESS]', { ENV: env });
  } else {
    // Actual deployment
    const deployResult = await execCommand('wrangler', ['deploy', '--env', env]);
    if (!deployResult.success) {
      throw new Error(`Deployment failed: ${deployResult.error || 'Unknown error'}`);
    }
    await logTESEvent('[DEPLOY][DEPLOY_SUCCESS]', { ENV: env });
  }

  // Step 5: Health check (skip in dry-run)
  if (!isDryRun) {
    await logTESEvent('[DEPLOY][HEALTH_CHECK_START]', { ENV: env });
    try {
      const healthUrl = `https://${workerName}.workers.dev/health`;
      const response = await fetch(healthUrl);
      if (response.ok) {
        await logTESEvent('[DEPLOY][HEALTH_CHECK_SUCCESS]', { ENV: env, URL: healthUrl });
      } else {
        await logTESEvent('[DEPLOY][HEALTH_CHECK_WARNING]', { 
          ENV: env, 
          STATUS: response.status.toString() 
        });
      }
    } catch (error) {
      await logTESEvent('[DEPLOY][HEALTH_CHECK_ERROR]', { 
        ENV: env, 
        ERROR: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  await logTESEvent('[DEPLOY][FLOW_COMPLETE]', { ENV: env, DRY_RUN: isDryRun.toString() });
}

