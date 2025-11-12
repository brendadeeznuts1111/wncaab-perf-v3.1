#!/usr/bin/env bun
/**
 * TES-DEPLOY-001: Endpoint Verification Script
 * 
 * Verifies all critical endpoints after deployment
 */

import { parseArgs } from 'util';

const args = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    env: { type: 'string', default: 'staging' },
    url: { type: 'string', default: '' },
  },
});

const ENV = args.values.env || 'staging';
const BASE_URL = args.values.url || `https://tes-ngws-001-flux-veto-${ENV}.workers.dev`;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function verifyEndpoint(name: string, url: string, expectedStatus: number = 200): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'GET' });
    const passed = response.status === expectedStatus;
    
    if (passed) {
      log(`✅ ${name}: ${response.status}`, colors.green);
      if (response.headers.get('content-type')?.includes('json')) {
        const data = await response.json().catch(() => ({}));
        log(`   Response: ${JSON.stringify(data).substring(0, 100)}...`, colors.cyan);
      }
    } else {
      log(`❌ ${name}: Expected ${expectedStatus}, got ${response.status}`, colors.red);
    }
    
    return passed;
  } catch (error) {
    log(`❌ ${name}: ${error instanceof Error ? error.message : String(error)}`, colors.red);
    return false;
  }
}

async function main() {
  log(`\n🔍 TES-NGWS-001.5 Endpoint Verification`, colors.cyan);
  log(`Environment: ${ENV}`, colors.cyan);
  log(`Base URL: ${BASE_URL}\n`, colors.cyan);
  
  const results: boolean[] = [];
  
  // Health check
  results.push(await verifyEndpoint('Health Check', `${BASE_URL}/health`));
  
  // Version registry (if available)
  results.push(await verifyEndpoint('Version Registry', `${BASE_URL}/version/registry`, 200));
  
  // Flux endpoints
  results.push(await verifyEndpoint('Flux Monitor', `${BASE_URL}/monitor`, 200));
  
  // Summary
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  log(`\n📊 Summary: ${passed}/${total} endpoints verified`, passed === total ? colors.green : colors.yellow);
  
  if (passed === total) {
    log(`\n✅ All endpoints verified successfully!`, colors.green);
    process.exit(0);
  } else {
    log(`\n⚠️  Some endpoints failed verification`, colors.yellow);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export { verifyEndpoint };

