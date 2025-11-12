#!/usr/bin/env bun
/**
 * @script validate-worktrees.ts
 * @description Validates worktree isolation (ports, logs, sessions)
 * @ticket TES-OPS-004.B.8.16
 */

// Load worktree configuration
let WORKTREE_CONFIG;
try {
  WORKTREE_CONFIG = await Bun.file('.cursor/worktrees.json').json();
} catch (error) {
  console.error('❌ Failed to load .cursor/worktrees.json:', error);
  console.error('💡 Ensure you are in the repository root directory');
  process.exit(1);
}

const WORKTREES = WORKTREE_CONFIG.worktrees;

if (!WORKTREES || WORKTREES.length === 0) {
  console.error('❌ No worktrees defined in configuration');
  process.exit(1);
}

console.log('🔍 Validating TES worktrees...\n');

let allValid = true;

for (const wt of WORKTREES) {
  console.log(`🌳 ${wt.name}:`);
  console.log(`   Path: ${wt.path}`);
  console.log(`   Branch: ${wt.branch}`);
  
  const expandedPath = wt.path.replace('~', process.env.HOME || process.env.USERPROFILE || '~');
  const logDir = `${expandedPath}/.tes/logs/${wt.name}`;
  
  // ✅ Check log directory isolation
  try {
    await Bun.$`mkdir -p ${logDir}`.quiet();
    console.log(`   ✅ Log dir: ${logDir}`);
  } catch (error) {
    console.error(`   ❌ Failed to create log dir: ${error}`);
    allValid = false;
  }
  
  // ✅ Check port availability
  const port = parseInt(wt.environment?.DEV_SERVER_PORT || '3002', 10);
  
  try {
    // Try to bind to the port to check availability
    const server = Bun.listen({
      port,
      hostname: 'localhost',
    });
    
    server.stop();
    console.log(`   ✅ Port ${port} available`);
  } catch (error: any) {
    if (error.code === 'EADDRINUSE') {
      console.log(`   ⚠️  Port ${port} in use (may be running)`);
    } else {
      console.error(`   ❌ Port ${port} check failed: ${error.message}`);
      allValid = false;
    }
  }
  
  // ✅ Validate WORKER_API_PORT is +1
  const workerPort = parseInt(wt.environment?.WORKER_API_PORT || String(port + 1), 10);
  if (workerPort !== port + 1) {
    console.error(`   ❌ Invalid WORKER_API_PORT: expected ${port + 1}, got ${workerPort}`);
    allValid = false;
  } else {
    console.log(`   ✅ Worker API port ${workerPort} (+1 offset)`);
  }
  
  // ✅ Check branch exists (if git repo)
  try {
    const branchCheck = await Bun.$`git -C ${expandedPath} rev-parse --verify ${wt.branch}`.quiet();
    console.log(`   ✅ Branch ${wt.branch} valid`);
  } catch {
    console.log(`   ⚠️  Branch ${wt.branch} not found (may not be checked out)`);
  }
  
  // ✅ Check tmux session naming
  const expectedSession = `tes-dev-${wt.name}`;
  try {
    const sessionCheck = await Bun.$`tmux has-session -t ${expectedSession}`.quiet();
    console.log(`   ✅ Tmux session exists: ${expectedSession}`);
  } catch {
    console.log(`   ⚠️  Tmux session not found: ${expectedSession}`);
  }
  
  console.log('');
}

if (allValid) {
  console.log('🎉 All worktrees validated successfully!');
  console.log('\n💡 Next steps:');
  console.log('   1. Run setup: bun run scripts/setup-worktree.ts <worktree-name>');
  console.log('   2. Start services: bun run scripts/tmux-tes-dev.ts start');
  process.exit(0);
} else {
  console.log('❌ Validation failed - see errors above');
  process.exit(1);
}

