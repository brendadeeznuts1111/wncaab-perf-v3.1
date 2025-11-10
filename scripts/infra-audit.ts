#!/usr/bin/env bun
/// <reference types="bun-types" />
/**
 * Infrastructure Audit Script
 * 
 * Comprehensive infrastructure audit with detailed report generation.
 * 
 * Usage: bun run scripts/infra-audit.ts
 */

import { $ } from 'bun';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE_URL = process.env.API_URL || 'http://localhost:3002';
const PORTS_TO_CHECK = [3001, 3002, 3003, 3004, 3005, 3006];
const HEALTH_ENDPOINTS = [
  { path: '/health', name: 'Main Health' },
  { path: '/api/tension/health', name: 'Tension Health' },
  { path: '/api/dev/status', name: 'Dev Status' },
];

interface AuditResult {
  category: string;
  checks: Array<{
    name: string;
    passed: boolean;
    message: string;
    details?: string;
    timestamp: string;
  }>;
}

async function auditPorts(): Promise<AuditResult['checks']> {
  const checks: AuditResult['checks'] = [];
  
  for (const port of PORTS_TO_CHECK) {
    try {
      const result = await $`lsof -ti:${port}`.quiet();
      const pid = result.stdout.toString().trim();
      
      checks.push({
        name: `Port ${port}`,
        passed: !pid,
        message: pid ? `⚠️  Port ${port} in use by PID ${pid}` : `✅ Port ${port} available`,
        timestamp: new Date().toISOString(),
      });
    } catch {
      checks.push({
        name: `Port ${port}`,
        passed: true,
        message: `✅ Port ${port} available`,
        timestamp: new Date().toISOString(),
      });
    }
  }
  
  return checks;
}

async function auditApiEndpoints(): Promise<AuditResult['checks']> {
  const checks: AuditResult['checks'] = [];
  
  for (const endpoint of HEALTH_ENDPOINTS) {
    try {
      const url = `${BASE_URL}${endpoint.path}`;
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      
      checks.push({
        name: endpoint.name,
        passed: response.ok,
        message: response.ok 
          ? `✅ ${endpoint.path} returned ${response.status}` 
          : `❌ ${endpoint.path} returned ${response.status}`,
        details: `Status: ${response.status} ${response.statusText}`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      checks.push({
        name: endpoint.name,
        passed: false,
        message: `❌ ${endpoint.path} failed to respond`,
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }
  
  return checks;
}

async function auditRoutes(): Promise<AuditResult['checks']> {
  const checks: AuditResult['checks'] = [];
  
  try {
    const result = await $`bun run scripts/validate-routes.ts`.quiet();
    const output = result.stdout.toString();
    
    checks.push({
      name: 'Route Validation',
      passed: result.exitCode === 0,
      message: result.exitCode === 0 
        ? '✅ Route validation passed' 
        : '❌ Route validation failed',
      details: output,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    checks.push({
      name: 'Route Validation',
      passed: false,
      message: '❌ Route validation script failed',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
  
  return checks;
}

async function auditProcessCompat(): Promise<AuditResult['checks']> {
  const checks: AuditResult['checks'] = [];
  
  try {
    const compatPath = join(process.cwd(), 'lib/process/compat.ts');
    const exists = existsSync(compatPath);
    
    checks.push({
      name: 'Process Compatibility Module',
      passed: exists,
      message: exists 
        ? '✅ Process compatibility module found' 
        : '❌ Process compatibility module not found',
      details: exists ? `Path: ${compatPath}` : 'lib/process/compat.ts does not exist',
      timestamp: new Date().toISOString(),
    });
    
    if (exists) {
      try {
        const { initializeProcessCompat } = await import('../lib/process/compat.ts');
        checks.push({
          name: 'Process Compatibility Function',
          passed: typeof initializeProcessCompat === 'function',
          message: typeof initializeProcessCompat === 'function'
            ? '✅ initializeProcessCompat function available'
            : '❌ initializeProcessCompat function not properly exported',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        checks.push({
          name: 'Process Compatibility Function',
          passed: false,
          message: '❌ Failed to import process compatibility module',
          details: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    checks.push({
      name: 'Process Compatibility',
      passed: false,
      message: '❌ Process compatibility check failed',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
  
  return checks;
}

async function auditBunVersion(): Promise<AuditResult['checks']> {
  const checks: AuditResult['checks'] = [];
  
  try {
    const result = await $`bun --version`.quiet();
    const version = result.stdout.toString().trim();
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
    
    if (match) {
      const major = parseInt(match[1], 10);
      const minor = parseInt(match[2], 10);
      const meetsRequirement = major > 1 || (major === 1 && minor >= 3);
      
      checks.push({
        name: 'Bun Version',
        passed: meetsRequirement,
        message: meetsRequirement
          ? `✅ Bun version ${version} meets requirement (>=1.3.0)`
          : `⚠️  Bun version ${version} may not meet requirement (>=1.3.0)`,
        details: `Required: >=1.3.0, Found: ${version}`,
        timestamp: new Date().toISOString(),
      });
    } else {
      checks.push({
        name: 'Bun Version',
        passed: false,
        message: `⚠️  Could not parse Bun version: ${version}`,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    checks.push({
      name: 'Bun Version',
      passed: false,
      message: '❌ Failed to check Bun version',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
  
  return checks;
}

function generateMarkdownReport(results: AuditResult[]): string {
  const timestamp = new Date().toISOString();
  const version = '3.1.0';
  
  let report = `# Infrastructure Audit Report - v${version}\n\n`;
  report += `**Generated**: ${timestamp}\n\n`;
  report += `---\n\n`;
  
  let totalChecks = 0;
  let passedChecks = 0;
  
  for (const result of results) {
    report += `## ${result.category}\n\n`;
    
    for (const check of result.checks) {
      totalChecks++;
      if (check.passed) passedChecks++;
      
      const icon = check.passed ? '✅' : '❌';
      report += `### ${icon} ${check.name}\n\n`;
      report += `- **Status**: ${check.passed ? 'PASSED' : 'FAILED'}\n`;
      report += `- **Message**: ${check.message}\n`;
      if (check.details) {
        report += `- **Details**: ${check.details}\n`;
      }
      report += `- **Timestamp**: ${check.timestamp}\n\n`;
    }
    
    report += `---\n\n`;
  }
  
  report += `## Summary\n\n`;
  report += `- **Total Checks**: ${totalChecks}\n`;
  report += `- **Passed**: ${passedChecks}\n`;
  report += `- **Failed**: ${totalChecks - passedChecks}\n`;
  report += `- **Pass Rate**: ${((passedChecks / totalChecks) * 100).toFixed(1)}%\n\n`;
  
  if (passedChecks === totalChecks) {
    report += `✅ **All infrastructure checks passed!**\n`;
  } else {
    report += `⚠️  **Some infrastructure checks failed. Review details above.**\n`;
  }
  
  return report;
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🏥 Infrastructure Audit - Phase 4');
  console.log('='.repeat(70) + '\n');

  const results: AuditResult[] = [];

  // Port audit
  console.log('🔍 Auditing ports...');
  const portChecks = await auditPorts();
  results.push({ category: 'Port Availability', checks: portChecks });
  console.log(`   Completed ${portChecks.length} port checks\n`);

  // API endpoint audit
  console.log('🔍 Auditing API endpoints...');
  const endpointChecks = await auditApiEndpoints();
  results.push({ category: 'API Endpoints', checks: endpointChecks });
  console.log(`   Completed ${endpointChecks.length} endpoint checks\n`);

  // Route audit
  console.log('🔍 Auditing routes...');
  const routeChecks = await auditRoutes();
  results.push({ category: 'Route Validation', checks: routeChecks });
  console.log(`   Completed route validation\n`);

  // Process compatibility audit
  console.log('🔍 Auditing process compatibility...');
  const compatChecks = await auditProcessCompat();
  results.push({ category: 'Process Compatibility', checks: compatChecks });
  console.log(`   Completed ${compatChecks.length} compatibility checks\n`);

  // Bun version audit
  console.log('🔍 Auditing Bun version...');
  const bunChecks = await auditBunVersion();
  results.push({ category: 'Bun Version', checks: bunChecks });
  console.log(`   Completed Bun version check\n`);

  // Generate report
  const report = generateMarkdownReport(results);
  const reportPath = join(process.cwd(), `INFRA_AUDIT_v3.1.0.md`);
  writeFileSync(reportPath, report, 'utf-8');
  console.log(`📄 Infrastructure audit report saved to: ${reportPath}\n`);

  // Summary
  const totalChecks = results.reduce((sum, r) => sum + r.checks.length, 0);
  const passedChecks = results.reduce((sum, r) => sum + r.checks.filter(c => c.passed).length, 0);
  const failedChecks = totalChecks - passedChecks;

  console.log('='.repeat(70));
  console.log('📊 Infrastructure Audit Summary');
  console.log('='.repeat(70));
  console.log(`✅ Passed: ${passedChecks}/${totalChecks}`);
  console.log(`❌ Failed: ${failedChecks}/${totalChecks}`);
  console.log(`📄 Report: ${reportPath}`);
  console.log('');

  if (failedChecks > 0) {
    console.log('❌ Some infrastructure checks failed. Review report above.');
    process.exit(1);
  } else {
    console.log('✅ All infrastructure checks passed!');
    console.log('='.repeat(70) + '\n');
    process.exit(0);
  }
}

if (import.meta.main) {
  main().catch(error => {
    console.error('❌ Infrastructure audit failed:', error);
    process.exit(1);
  });
}

