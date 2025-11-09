/**
 * AI PR Script - PR Prophecy with AI Validation
 * 
 * Auto-generates branch and validates with AI before PR
 */

import { validateAiImmunity } from './validate-ai-immunity.js';
import { $ } from 'bun';

async function createAiPRBranch(featureName) {
  if (!featureName) {
    console.error('❌ Feature name required');
    console.error('Usage: bun run scripts/ai-pr.js <FEATURE-NAME>');
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

    // Validate with AI before PR
    console.log('\n🔮 Validating with AI...');
    await validateAiImmunity();

    console.log(`\n✅ Ready for AI-PR: ${branchName}`);
    console.log(`   Run: git push -u origin ${branchName}`);
  } catch (error) {
    console.error('❌ AI-PR preparation failed:', error.message);
    process.exit(1);
  }
}

// CLI entry point
if (import.meta.main) {
  const featureName = Bun.argv[2];
  createAiPRBranch(featureName).catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

export { createAiPRBranch };

