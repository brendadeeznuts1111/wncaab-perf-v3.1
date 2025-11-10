#!/usr/bin/env bun
/// <reference types="bun-types" />
/**
 * Test Suite Orchestrator
 * 
 * Runs all validation, smoke tests, macro tests, and infrastructure checks.
 * 
 * Usage: bun run scripts/test-suite.ts
 */

import { $ } from 'bun';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  output?: string;
  error?: string;
}

async function runCommand(command: string, name: string): Promise<TestResult> {
  const startTime = performance.now();
  
  try {
    const result = await $`${command}`.quiet();
    const duration = performance.now() - startTime;
    const output = result.stdout.toString();
    const stderr = result.stderr.toString();
    
    return {
      name,
      passed: result.exitCode === 0,
      duration,
      output: output || stderr,
    };
  } catch (error) {
    const duration = performance.now() - startTime;
    return {
      name,
      passed: false,
      duration,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runValidationTests(): Promise<TestResult[]> {
  console.log('🧪 Running validation tests...\n');
  
  const results: TestResult[] = [];
  
  // Run validate:all (routes + colors)
  const validateAll = await runCommand('bun run validate:all', 'Validation Suite (routes + colors)');
  results.push(validateAll);
  
  console.log(`${validateAll.passed ? '✅' : '❌'} ${validateAll.name} (${validateAll.duration.toFixed(2)}ms)`);
  if (!validateAll.passed && validateAll.error) {
    console.log(`   Error: ${validateAll.error}`);
  }
  if (validateAll.output && !validateAll.passed) {
    console.log(`   Output: ${validateAll.output.substring(0, 200)}...`);
  }
  console.log('');
  
  return results;
}

async function runSmokeTests(): Promise<TestResult[]> {
  console.log('💨 Running API smoke tests...\n');
  
  const results: TestResult[] = [];
  
  // Run smoke-test-api.ts
  const smokeTest = await runCommand('bun run scripts/smoke-test-api.ts', 'API Smoke Tests');
  results.push(smokeTest);
  
  console.log(`${smokeTest.passed ? '✅' : '❌'} ${smokeTest.name} (${smokeTest.duration.toFixed(2)}ms)`);
  if (!smokeTest.passed && smokeTest.error) {
    console.log(`   Error: ${smokeTest.error}`);
  }
  if (smokeTest.output && !smokeTest.passed) {
    // Show last few lines of output for context
    const lines = smokeTest.output.split('\n').slice(-5);
    console.log(`   Output: ${lines.join('\n   ')}`);
  }
  console.log('');
  
  return results;
}

async function runMacroTests(): Promise<TestResult[]> {
  console.log('🔬 Running macro tests...\n');
  
  const results: TestResult[] = [];
  
  // Run macro:test
  const macroTest = await runCommand('bun run macro:test', 'Macro Tests');
  results.push(macroTest);
  
  console.log(`${macroTest.passed ? '✅' : '❌'} ${macroTest.name} (${macroTest.duration.toFixed(2)}ms)`);
  if (!macroTest.passed && macroTest.error) {
    console.log(`   Error: ${macroTest.error}`);
  }
  if (macroTest.output && !macroTest.passed) {
    console.log(`   Output: ${macroTest.output.substring(0, 200)}...`);
  }
  console.log('');
  
  return results;
}

async function runInfrastructureChecks(): Promise<TestResult[]> {
  console.log('🏥 Running infrastructure health checks...\n');
  
  const results: TestResult[] = [];
  
  // Run check:infra
  const infraCheck = await runCommand('bun run check:infra', 'Infrastructure Health Checks');
  results.push(infraCheck);
  
  console.log(`${infraCheck.passed ? '✅' : '❌'} ${infraCheck.name} (${infraCheck.duration.toFixed(2)}ms)`);
  if (!infraCheck.passed && infraCheck.error) {
    console.log(`   Error: ${infraCheck.error}`);
  }
  if (infraCheck.output && !infraCheck.passed) {
    // Show last few lines of output for context
    const lines = infraCheck.output.split('\n').slice(-5);
    console.log(`   Output: ${lines.join('\n   ')}`);
  }
  console.log('');
  
  return results;
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 Test Suite - Phase 2');
  console.log('='.repeat(70) + '\n');

  const allResults: TestResult[] = [];

  // Run all test suites sequentially
  const validationResults = await runValidationTests();
  allResults.push(...validationResults);

  const smokeResults = await runSmokeTests();
  allResults.push(...smokeResults);

  const macroResults = await runMacroTests();
  allResults.push(...macroResults);

  const infraResults = await runInfrastructureChecks();
  allResults.push(...infraResults);

  // Summary
  const passed = allResults.filter(r => r.passed).length;
  const failed = allResults.filter(r => !r.passed).length;
  const totalDuration = allResults.reduce((sum, r) => sum + r.duration, 0);

  console.log('='.repeat(70));
  console.log('📊 Test Suite Summary');
  console.log('='.repeat(70));
  console.log(`✅ Passed: ${passed}/${allResults.length}`);
  console.log(`❌ Failed: ${failed}/${allResults.length}`);
  console.log(`⏱️  Total Duration: ${totalDuration.toFixed(2)}ms`);
  console.log('');

  if (failed > 0) {
    console.log('❌ Some tests failed. Review errors above.');
    console.log('');
    console.log('Failed tests:');
    allResults.filter(r => !r.passed).forEach(result => {
      console.log(`   - ${result.name}`);
      if (result.error) console.log(`     Error: ${result.error}`);
    });
    console.log('');
    process.exit(1);
  } else {
    console.log('✅ All tests passed!');
    console.log('='.repeat(70) + '\n');
    process.exit(0);
  }
}

if (import.meta.main) {
  main().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

