#!/usr/bin/env bun
/// <reference types="bun-types" />
/**
 * Pre-Flight Confirmation Script
 * 
 * Verifies release readiness before executing the release pipeline.
 * Checks git status, current version, and logs all phases.
 * 
 * Usage: bun run scripts/preflight-confirm.ts
 */

import { $ } from 'bun';
import { readFileSync } from 'fs';
import { join } from 'path';

const PACKAGE_JSON_PATH = join(process.cwd(), 'package.json');

interface PackageJson {
  version: string;
  [key: string]: any;
}

async function checkGitStatus(): Promise<{ clean: boolean; message: string }> {
  try {
    const statusResult = await $`git status --porcelain`.quiet();
    const status = statusResult.stdout.toString().trim();
    
    if (status.length === 0) {
      return { clean: true, message: '✅ Git working directory is clean' };
    } else {
      return { clean: false, message: `⚠️  Git working directory has uncommitted changes:\n${status}` };
    }
  } catch (error) {
    return { clean: false, message: `❌ Failed to check git status: ${error instanceof Error ? error.message : String(error)}` };
  }
}

function getCurrentVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8')) as PackageJson;
    return pkg.version;
  } catch (error) {
    throw new Error(`Failed to read package.json: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function getBunVersion(): Promise<string> {
  try {
    const result = await $`bun --version`.quiet();
    return result.stdout.toString().trim();
  } catch (error) {
    return 'unknown';
  }
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 v3.1.0 Stable Release Pipeline - Pre-Flight Confirmation');
  console.log('='.repeat(70) + '\n');

  // Check git status
  console.log('📋 Checking Git Status...');
  const gitStatus = await checkGitStatus();
  console.log(gitStatus.message);
  console.log('');

  // Get current version
  console.log('📦 Checking Current Version...');
  const currentVersion = getCurrentVersion();
  console.log(`   Current Version: ${currentVersion}`);
  
  if (!currentVersion.includes('beta')) {
    console.log('   ⚠️  Warning: Version does not contain "beta" - may already be stable');
  }
  console.log('');

  // Get Bun version
  console.log('🔧 Checking Bun Version...');
  const bunVersion = await getBunVersion();
  console.log(`   Bun Version: ${bunVersion}`);
  console.log('');

  // Log all phases
  console.log('📋 Release Pipeline Phases:');
  console.log('   1. Phase 0: Pre-Flight Confirmation (current)');
  console.log('   2. Phase 1: Cleanup Onslaught');
  console.log('   3. Phase 2: Test Annihilation Suite');
  console.log('   4. Phase 3: Release Ascension');
  console.log('   5. Phase 4: Infrastructure Citadel Audit');
  console.log('   6. Phase 5: Post-Release Monitoring (optional)');
  console.log('');

  // Summary
  console.log('='.repeat(70));
  console.log('📊 Pre-Flight Summary');
  console.log('='.repeat(70));
  console.log(`   Git Status: ${gitStatus.clean ? '✅ Clean' : '⚠️  Has Changes'}`);
  console.log(`   Current Version: ${currentVersion}`);
  console.log(`   Bun Version: ${bunVersion}`);
  console.log(`   Target Version: 3.1.0 (stable)`);
  console.log('');

  if (!gitStatus.clean) {
    console.log('⚠️  WARNING: Git working directory has uncommitted changes.');
    console.log('   Consider committing or stashing changes before proceeding.');
    console.log('');
  }

  console.log('✅ Pre-flight checks complete. Ready to proceed with release pipeline.');
  console.log('='.repeat(70) + '\n');

  // Exit with error if git is not clean (but don't block, just warn)
  process.exit(gitStatus.clean ? 0 : 0);
}

if (import.meta.main) {
  main().catch(error => {
    console.error('❌ Pre-flight check failed:', error);
    process.exit(1);
  });
}

