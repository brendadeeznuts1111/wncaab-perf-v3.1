/**
 * Atomic PR Workflow - Unified Branch + PR + Atomic Operations
 * 
 * Combines:
 * - Branch creation/checkout
 * - PR testing (via bunx bun-pr)
 * - Atomic operations (config generation, commits)
 * 
 * Usage:
 *   bunx atomic-pr <branch-name> <pr-number|branch-name|url> [--asan] [--atomic-config] [--atomic-commit]
 */

import { $ } from 'bun';
import { validateAllRules } from './rules-validate.js';

async function atomicPRWorkflow(options) {
  const { branchName, prTarget = '', asan = false, atomicConfig = false, atomicCommit = false } = options;

  console.log(`🚀 Atomic PR Workflow: ${branchName}${prTarget ? ` → ${prTarget}` : ''}\n`);

  try {
    // Step 1: Create/checkout branch
    console.log('📦 Step 1: Branch Management');
    const existingBranches = await $`git branch --list ${branchName}`.quiet();
    if (existingBranches.stdout.toString().trim()) {
      console.log(`   ⚠️  Branch ${branchName} already exists, checking out...`);
      await $`git checkout ${branchName}`;
    } else {
      await $`git checkout -b ${branchName}`;
      console.log(`   ✅ Created branch: ${branchName}`);
    }

    // Step 2: Test PR (if PR target provided)
    if (prTarget) {
      console.log('\n🔍 Step 2: PR Testing');
      const cmd = ['bunx', 'bun-pr'];
      if (asan) {
        cmd.push('--asan');
      }
      cmd.push(prTarget);

      console.log(`   Testing PR: ${prTarget}`);
      try {
        const prResult = await $`${cmd}`.quiet();
        
        if (prResult.exitCode !== 0) {
          const errorMsg = prResult.stderr.toString() || prResult.stdout.toString();
          console.warn(`   ⚠️  PR test failed (non-fatal): ${errorMsg.trim() || 'Unknown error'}`);
          console.log(`   💡 Continuing workflow... (PR testing is optional)`);
        } else {
          // Extract PR number for binary name
          const prMatch = prTarget.match(/(\d+)$/);
          const binaryName = prMatch ? `bun-${prMatch[1]}` : 'bun-pr';
          console.log(`   ✅ PR build installed as: ${binaryName}`);
        }
      } catch (error) {
        console.warn(`   ⚠️  PR test error (non-fatal): ${error.message}`);
        console.log(`   💡 Continuing workflow... (PR testing is optional)`);
      }
    } else {
      console.log('\n🔍 Step 2: PR Testing');
      console.log('   ⏭️  Skipped (no PR target provided)');
    }

    // Step 3: Atomic config generation (if requested)
    if (atomicConfig) {
      console.log('\n⚛️  Step 3: Atomic Config Generation');
      // Atomic config would be implemented here
      console.log('   ⚠️  Atomic config generation not yet implemented');
      console.log('   💡 Use: bun run templates/config-gen.js');
    }

    // Step 4: Validate rules
    console.log('\n🛡️  Step 4: Rule Validation');
    await validateAllRules();
    console.log('   ✅ All rules validated');

    // Step 5: Atomic commit (if requested)
    if (atomicCommit) {
      console.log('\n💾 Step 5: Atomic Commit');
      const status = await $`git status --short`.quiet();
      if (status.stdout.toString().trim()) {
        await $`git add .`;
        await $`git commit -m "feat(${branchName}): atomic PR workflow

- Branch: ${branchName}
- PR tested: ${prTarget}
- Rules validated: ✅
- Atomic operations: ${atomicConfig ? 'config' : ''} ${atomicCommit ? 'commit' : ''}"`;
        console.log('   ✅ Atomic commit created');
      } else {
        console.log('   ℹ️  No changes to commit');
      }
    }

    console.log(`\n✅ Atomic PR Workflow Complete!`);
    console.log(`   Branch: ${branchName}`);
    if (prTarget) {
      const prMatch = prTarget.match(/(\d+)$/);
      if (prMatch) {
        console.log(`   PR Binary: bun-${prMatch[1]}`);
      }
    }
    console.log(`   Next: git push -u origin ${branchName}`);
    if (atomicCommit) {
      console.log(`   💡 Changes committed atomically`);
    }

  } catch (error) {
    console.error(`\n❌ Atomic PR workflow failed: ${error.message}`);
    process.exit(1);
  }
}

// Parse CLI arguments
if (import.meta.main) {
  const args = Bun.argv.slice(2);
  const options = {
    branchName: '',
    prTarget: '',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--asan') {
      options.asan = true;
    } else if (arg === '--atomic-config') {
      options.atomicConfig = true;
    } else if (arg === '--atomic-commit') {
      options.atomicCommit = true;
    } else if (!options.branchName) {
      options.branchName = arg;
    } else if (!options.prTarget) {
      options.prTarget = arg;
    }
  }

  if (!options.branchName) {
    console.error('❌ Branch name required');
    console.error('\nUsage:');
    console.error('  bun run atomic:pr <branch-name> [pr-number|branch-name|url] [options]');
    console.error('\nOptions:');
    console.error('  --asan          Use AddressSanitizer (Linux x64 only)');
    console.error('  --atomic-config  Generate atomic config (future)');
    console.error('  --atomic-commit  Create atomic commit');
    console.error('\nExamples:');
    console.error('  # Create branch only');
    console.error('  bun run atomic:pr feat/new-feature');
    console.error('');
    console.error('  # Create branch and test PR');
    console.error('  bun run atomic:pr feat/new-feature 1234566');
    console.error('');
    console.error('  # Full workflow with options');
    console.error('  bun run atomic:pr feat/new-feature 1234566 --asan --atomic-commit');
    process.exit(1);
  }

  atomicPRWorkflow(options).catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

export { atomicPRWorkflow };

