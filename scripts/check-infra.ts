#!/usr/bin/env bun
/// <reference types="bun-types" />
/**
 * Infrastructure Health Check Script
 * 
 * Checks port conflicts, API endpoint health, route validation,
 * and process compatibility layer verification.
 * 
 * Usage: bun run scripts/check-infra.ts
 */

import { $ } from 'bun';
import { existsSync } from 'fs';
import { join } from 'path';

const BASE_URL = process.env.API_URL || 'http://localhost:3002';
const PORTS_TO_CHECK = [3001, 3002, 3003, 3004, 3005, 3006];
const HEALTH_ENDPOINTS = [
  { path: '/health', name: 'Main Health' },
  { path: '/api/tension/health', name: 'Tension Health' },
  { path: '/api/dev/status', name: 'Dev Status' },
];

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  details?: string;
}

async function checkPortConflicts(): Promise<CheckResult> {
  const conflicts: number[] = [];
  
  for (const port of PORTS_TO_CHECK) {
    try {
      const result = await $`lsof -ti:${port}`.quiet();
      if (result.stdout.toString().trim()) {
        conflicts.push(port);
      }
    } catch {
      // Port not in use
    }
  }
  
  if (conflicts.length === 0) {
    return {
      name: 'Port Conflicts',
      passed: true,
      message: '✅ No port conflicts detected (ports 3001-3006 available)',
    };
  }
  
  return {
    name: 'Port Conflicts',
    passed: false,
    message: `⚠️  Port conflicts detected on: ${conflicts.join(', ')}`,
    details: 'Consider stopping conflicting processes before release',
  };
}

async function checkApiEndpoint(endpoint: { path: string; name: string }): Promise<CheckResult> {
  try {
    const url = `${BASE_URL}${endpoint.path}`;
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.ok) {
      return {
        name: endpoint.name,
        passed: true,
        message: `✅ ${endpoint.path} returned ${response.status}`,
      };
    }
    
    return {
      name: endpoint.name,
      passed: false,
      message: `❌ ${endpoint.path} returned ${response.status}`,
      details: `Expected 200 OK, got ${response.status} ${response.statusText}`,
    };
  } catch (error) {
    return {
      name: endpoint.name,
      passed: false,
      message: `❌ ${endpoint.path} failed to respond`,
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkRouteValidation(): Promise<CheckResult> {
  try {
    const result = await $`bun run scripts/validate-routes.ts`.quiet();
    const output = result.stdout.toString();
    const stderr = result.stderr.toString();
    
    if (result.exitCode === 0) {
      return {
        name: 'Route Validation',
        passed: true,
        message: '✅ Route validation passed',
        details: output,
      };
    }
    
    return {
      name: 'Route Validation',
      passed: false,
      message: '❌ Route validation failed',
      details: stderr || output,
    };
  } catch (error) {
    return {
      name: 'Route Validation',
      passed: false,
      message: '❌ Route validation script failed',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkProcessCompat(): Promise<CheckResult> {
  try {
    // Check if process compatibility module exists and can be imported
    const compatPath = join(process.cwd(), 'lib/process/compat.ts');
    if (!existsSync(compatPath)) {
      return {
        name: 'Process Compatibility',
        passed: false,
        message: '❌ Process compatibility module not found',
        details: 'lib/process/compat.ts does not exist',
      };
    }
    
    // Try to import and initialize
    const { initializeProcessCompat } = await import('../lib/process/compat.ts');
    
    if (typeof initializeProcessCompat === 'function') {
      return {
        name: 'Process Compatibility',
        passed: true,
        message: '✅ Process compatibility layer available',
        details: 'initializeProcessCompat function found',
      };
    }
    
    return {
      name: 'Process Compatibility',
      passed: false,
      message: '❌ Process compatibility layer not properly exported',
    };
  } catch (error) {
    return {
      name: 'Process Compatibility',
      passed: false,
      message: '❌ Process compatibility check failed',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkBunVersion(): Promise<CheckResult> {
  try {
    const result = await $`bun --version`.quiet();
    const version = result.stdout.toString().trim();
    
    // Parse version (e.g., "1.3.2")
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
    if (match) {
      const major = parseInt(match[1], 10);
      const minor = parseInt(match[2], 10);
      
      if (major > 1 || (major === 1 && minor >= 3)) {
        return {
          name: 'Bun Version',
          passed: true,
          message: `✅ Bun version ${version} meets requirement (>=1.3.0)`,
        };
      }
    }
    
    return {
      name: 'Bun Version',
      passed: false,
      message: `⚠️  Bun version ${version} may not meet requirement (>=1.3.0)`,
    };
  } catch (error) {
    return {
      name: 'Bun Version',
      passed: false,
      message: '❌ Failed to check Bun version',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🏥 Infrastructure Health Check');
  console.log('='.repeat(70) + '\n');
  console.log(`📍 Base URL: ${BASE_URL}\n`);

  const results: CheckResult[] = [];

  // Port conflicts
  console.log('🔍 Checking port conflicts...');
  const portCheck = await checkPortConflicts();
  results.push(portCheck);
  console.log(portCheck.message);
  if (portCheck.details) console.log(`   ${portCheck.details}`);
  console.log('');

  // API endpoints
  console.log('🔍 Checking API endpoints...');
  for (const endpoint of HEALTH_ENDPOINTS) {
    const endpointCheck = await checkApiEndpoint(endpoint);
    results.push(endpointCheck);
    console.log(endpointCheck.message);
    if (endpointCheck.details) console.log(`   ${endpointCheck.details}`);
  }
  console.log('');

  // Route validation
  console.log('🔍 Checking route validation...');
  const routeCheck = await checkRouteValidation();
  results.push(routeCheck);
  console.log(routeCheck.message);
  if (routeCheck.details) console.log(`   ${routeCheck.details}`);
  console.log('');

  // Process compatibility
  console.log('🔍 Checking process compatibility layer...');
  const compatCheck = await checkProcessCompat();
  results.push(compatCheck);
  console.log(compatCheck.message);
  if (compatCheck.details) console.log(`   ${compatCheck.details}`);
  console.log('');

  // Bun version
  console.log('🔍 Checking Bun version...');
  const bunCheck = await checkBunVersion();
  results.push(bunCheck);
  console.log(bunCheck.message);
  if (bunCheck.details) console.log(`   ${bunCheck.details}`);
  console.log('');

  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log('='.repeat(70));
  console.log('📊 Infrastructure Check Summary');
  console.log('='.repeat(70));
  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  console.log('');

  if (failed > 0) {
    console.log('❌ Some infrastructure checks failed. Review errors above.');
    process.exit(1);
  } else {
    console.log('✅ All infrastructure checks passed!');
    process.exit(0);
  }
}

if (import.meta.main) {
  main().catch(error => {
    console.error('❌ Infrastructure check failed:', error);
    process.exit(1);
  });
}

