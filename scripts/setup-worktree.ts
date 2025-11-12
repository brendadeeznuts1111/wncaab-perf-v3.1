#!/usr/bin/env bun
/**
 * @script setup-worktree.ts
 * @description Runs worktree-specific setup commands
 * @ticket TES-OPS-004.B.8.16
 */

const worktreeName = process.argv[2] || 'tes-repo';

// Load worktree configuration
let config;
try {
  const configFile = await Bun.file('.cursor/worktrees.json').json();
  config = configFile;
} catch (error) {
  console.error(`❌ Failed to load .cursor/worktrees.json:`, error);
  process.exit(1);
}

const worktree = config.worktrees.find((w: any) => w.name === worktreeName);

if (!worktree) {
  console.error(`❌ Worktree "${worktreeName}" not found in config`);
  console.error(`Available worktrees: ${config.worktrees.map((w: any) => w.name).join(', ')}`);
  process.exit(1);
}

console.log(`⚙️  Setting up worktree: ${worktree.name}`);
console.log(`📂 Path: ${worktree.path}`);
console.log(`🌿 Branch: ${worktree.branch}`);
console.log(`🌐 Dev Port: ${worktree.environment.DEV_SERVER_PORT}`);
console.log(`📡 Worker Port: ${worktree.environment.WORKER_API_PORT}\n`);

// Expand path
const expandedPath = worktree.path.replace('~', process.env.HOME || process.env.USERPROFILE || '~');

// Change to worktree directory
process.chdir(expandedPath);

// ✅ Create .env.worktree file if it doesn't exist
const envWorktreePath = `${expandedPath}/.env.worktree`;
const envExamplePath = `${process.cwd()}/.env.worktree.${worktree.name}.example`;

try {
  const envFile = Bun.file(envWorktreePath);
  await envFile.text(); // Check if exists
  console.log(`✅ .env.worktree already exists`);
} catch {
  // File doesn't exist, try to copy from example
  try {
    const exampleFile = Bun.file(envExamplePath);
    const exampleContent = await exampleFile.text();
    await Bun.write(envWorktreePath, exampleContent);
    console.log(`✅ Created .env.worktree from template`);
  } catch {
    // No template, create basic one
    const envContent = Object.entries(worktree.environment || {})
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    await Bun.write(envWorktreePath, `# TES Worktree Environment\n# Worktree: ${worktree.name}\n\n${envContent}\n`);
    console.log(`✅ Created .env.worktree with environment variables`);
  }
}

// Run setup commands
const setupCommands = worktree['setup-worktree'] || [];

if (setupCommands.length === 0) {
  console.log(`⚠️  No setup commands defined for ${worktree.name}`);
  console.log(`✅ Worktree ${worktree.name} setup complete!`);
  process.exit(0);
}

for (const cmd of setupCommands) {
  console.log(`▶️  Running: ${cmd}`);
  
  // Parse command (simple split - doesn't handle quoted args)
  const parts = cmd.split(' ');
  const command = parts[0];
  const args = parts.slice(1);
  
  const proc = Bun.spawn([command, ...args], {
    cwd: expandedPath,
    stdio: 'inherit',
    env: {
      ...process.env,
      ...worktree.environment
    }
  });
  
  await proc.exited;
  
  if (proc.exitCode !== 0) {
    console.error(`❌ Setup command failed: ${cmd}`);
    console.error(`   Exit code: ${proc.exitCode}`);
    process.exit(proc.exitCode || 1);
  }
  
  console.log(`✅ Completed: ${cmd}\n`);
}

console.log(`✅ Worktree ${worktree.name} setup complete!`);
console.log(`🚀 Start with: ${worktree.scripts?.start || 'bun run scripts/dev-server.ts'}`);

