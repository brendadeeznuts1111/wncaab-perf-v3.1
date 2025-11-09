/**
 * Rules PR Script - PR Enforcement Automation
 * 
 * Auto-generates branch and validates rules before PR
 */

import { validateAllRules } from './rules-validate.js';
import { $ } from 'bun';

/**
 * Create PR branch and validate rules
 */
async function createPRBranch(featureName) {
  if (!featureName) {
    console.error('❌ Feature name required');
    console.error('Usage: bun run scripts/rules-pr.js <FEATURE-NAME>');
    process.exit(1);
  }

  const branchName = `feat/${featureName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;

  try {
    // Check if branch already exists
    const existingBranches = await $`git branch --list ${branchName}`.quiet();
    if (existingBranches.stdout.toString().trim()) {
      console.log(`⚠️  Branch ${branchName} already exists`);
      await $`git checkout ${branchName}`;
    } else {
      // Create and checkout new branch
      await $`git checkout -b ${branchName}`;
      console.log(`✅ Created branch: ${branchName}`);
    }

    // Validate all rules before PR
    console.log('\n🔍 Validating rules...');
    await validateAllRules();

    console.log(`\n✅ Ready for PR: ${branchName}`);
    console.log(`   Run: git push -u origin ${branchName}`);
  } catch (error) {
    console.error('❌ PR preparation failed:', error.message);
    process.exit(1);
  }
}

// CLI entry point
if (import.meta.main) {
  const featureName = Bun.argv[2];
  createPRBranch(featureName).catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

export { createPRBranch };

