#!/usr/bin/env bun
/// <reference types="bun-types" />
/**
 * Comprehensive Cleanup Script
 * 
 * Stops all Bun servers, removes build artifacts, cleans temp files,
 * and performs git cleanup.
 * 
 * Usage: bun run scripts/cleanup-full.ts
 */

import { $ } from 'bun';
import { existsSync, rmSync, statSync } from 'fs';
import { join } from 'path';

const PORTS_TO_CLEAN = [3001, 3002, 3003, 3004, 3005, 3006];
const BUILD_ARTIFACTS = ['dist', 'build', '.bun-cache'];
const TEMP_FILES = [
  '.scan.index',
  '.remote.index',
  '.config.index',
  '.immunity.index',
  '.ai-immunity.index',
  'node_modules/.cache',
  'logs',
];

async function stopServerOnPort(port: number): Promise<boolean> {
  try {
    const pidResult = await $`lsof -ti:${port}`.quiet();
    const pid = pidResult.stdout.toString().trim();
    
    if (!pid) {
      return false; // No process running
    }

    console.log(`   🔪 Stopping process ${pid} on port ${port}...`);
    await $`kill ${pid}`.quiet();
    
    // Wait a moment and verify
    await new Promise(resolve => setTimeout(resolve, 500));
    const verifyResult = await $`lsof -ti:${port}`.quiet();
    const stillRunning = verifyResult.stdout.toString().trim();
    
    if (stillRunning) {
      console.log(`   ⚠️  Process still running, force killing...`);
      await $`kill -9 ${pid}`.quiet();
    }
    
    return true;
  } catch (error) {
    // Port not in use or lsof not available
    return false;
  }
}

async function stopAllServers(): Promise<void> {
  console.log('🛑 Stopping all Bun servers...');
  let stoppedCount = 0;
  
  for (const port of PORTS_TO_CLEAN) {
    const stopped = await stopServerOnPort(port);
    if (stopped) {
      stoppedCount++;
    }
  }
  
  if (stoppedCount === 0) {
    console.log('   ✅ No servers running on ports 3001-3006');
  } else {
    console.log(`   ✅ Stopped ${stoppedCount} server(s)`);
  }
  console.log('');
}

function removeBuildArtifacts(): void {
  console.log('🗑️  Removing build artifacts...');
  let removedCount = 0;
  
  for (const artifact of BUILD_ARTIFACTS) {
    const path = join(process.cwd(), artifact);
    if (existsSync(path)) {
      try {
        const stats = statSync(path);
        const size = stats.isDirectory() ? 'directory' : `${(stats.size / 1024).toFixed(2)}KB`;
        rmSync(path, { recursive: true, force: true });
        console.log(`   ✅ Removed ${artifact} (${size})`);
        removedCount++;
      } catch (error) {
        console.log(`   ⚠️  Failed to remove ${artifact}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  
  if (removedCount === 0) {
    console.log('   ✅ No build artifacts found');
  }
  console.log('');
}

async function removeTempFiles(): Promise<void> {
  console.log('🧹 Cleaning temporary files...');
  let removedCount = 0;
  
  for (const tempFile of TEMP_FILES) {
    const path = join(process.cwd(), tempFile);
    if (existsSync(path)) {
      try {
        const stats = statSync(path);
        const size = stats.isDirectory() ? 'directory' : `${(stats.size / 1024).toFixed(2)}KB`;
        rmSync(path, { recursive: true, force: true });
        console.log(`   ✅ Removed ${tempFile} (${size})`);
        removedCount++;
      } catch (error) {
        console.log(`   ⚠️  Failed to remove ${tempFile}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  
  // Remove all .tmp files
  try {
    const tmpFiles = await $`find . -name "*.tmp" -type f`.quiet();
    const tmpFileList = tmpFiles.stdout.toString().trim().split('\n').filter(Boolean);
    for (const tmpFile of tmpFileList) {
      try {
        rmSync(tmpFile, { force: true });
        removedCount++;
      } catch {}
    }
    if (tmpFileList.length > 0) {
      console.log(`   ✅ Removed ${tmpFileList.length} .tmp file(s)`);
    }
  } catch (error) {
    // find command may not be available or no .tmp files found
  }
  
  if (removedCount === 0) {
    console.log('   ✅ No temporary files found');
  }
  console.log('');
}

async function gitClean(): Promise<void> {
  console.log('🧹 Cleaning git untracked files...');
  
  try {
    // Dry run first
    const dryRunResult = await $`git clean -fdx --dry-run`.quiet();
    const filesToRemove = dryRunResult.stdout.toString().trim();
    
    if (!filesToRemove) {
      console.log('   ✅ No untracked files to clean');
      console.log('');
      return;
    }
    
    console.log('   Files to be removed:');
    filesToRemove.split('\n').forEach(line => {
      if (line.trim()) {
        console.log(`      ${line.replace(/^Would remove /, '')}`);
      }
    });
    console.log('');
    
    // Actual clean
    await $`git clean -fdx`;
    console.log('   ✅ Git clean completed');
  } catch (error) {
    console.log(`   ⚠️  Git clean failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  console.log('');
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🧹 Comprehensive Cleanup - Phase 1');
  console.log('='.repeat(70) + '\n');

  await stopAllServers();
  removeBuildArtifacts();
  await removeTempFiles();
  await gitClean();

  console.log('='.repeat(70));
  console.log('✅ Cleanup complete!');
  console.log('='.repeat(70) + '\n');
}

if (import.meta.main) {
  main().catch(error => {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  });
}

