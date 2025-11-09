/**
 * Bun PR Tester - Integration with bunx bun-pr
 * 
 * Tests Bun pull requests using bunx bun-pr CLI tool
 * 
 * Usage:
 *   bun run scripts/bun-pr-test.ts <pr-number>
 *   bun run scripts/bun-pr-test.ts <branch-name>
 *   bun run scripts/bun-pr-test.ts "https://github.com/oven-sh/bun/pull/1234566"
 *   bun run scripts/bun-pr-test.ts --asan <pr-number>  # Linux x64 only
 */

import { $ } from 'bun';

interface PRTestOptions {
  target: string; // PR number, branch name, or URL
  asan?: boolean; // AddressSanitizer (Linux x64 only)
  version?: boolean; // Check version after install
}

async function testBunPR(options: PRTestOptions) {
  const { target, asan = false, version = false } = options;

  console.log(`🔍 Testing Bun PR: ${target}`);
  if (asan) {
    console.log(`⚠️  Using AddressSanitizer (Linux x64 only)`);
  }

  try {
    // Build bunx bun-pr command (matches exact bunx bun-pr syntax)
    const cmd = ['bunx', 'bun-pr'];
    
    // --asan must come before the target (matches bunx bun-pr --asan <pr-number>)
    if (asan) {
      cmd.push('--asan');
    }
    
    cmd.push(target);

    console.log(`\n📦 Installing Bun PR build...`);
    const installResult = await $`${cmd}`.quiet();
    
    if (installResult.exitCode !== 0) {
      throw new Error(`Failed to install Bun PR: ${installResult.stderr.toString()}`);
    }

    console.log(`✅ Bun PR installed successfully`);

    // Extract PR number for binary name
    const prNumber = extractPRNumber(target);
    const binaryName = prNumber ? `bun-${prNumber}` : 'bun-pr';

    if (prNumber) {
      console.log(`\n📦 PR build added to PATH as: ${binaryName}`);
      console.log(`   You can now run: ${binaryName} --version`);
    }

    // Check version if requested
    if (version && prNumber) {
      console.log(`\n🔍 Checking version...`);
      const versionResult = await $`${binaryName} --version`.quiet();
      
      if (versionResult.exitCode === 0) {
        console.log(`✅ Version: ${versionResult.stdout.toString().trim()}`);
      } else {
        console.warn(`⚠️  Could not check version (binary may not be in PATH yet)`);
        console.warn(`   Try running: ${binaryName} --version`);
      }
    }

    console.log(`\n🎉 Bun PR test complete!`);
    console.log(`   PR: ${target}`);
    if (prNumber) {
      console.log(`   Binary: ${binaryName}`);
      console.log(`   Usage: ${binaryName} --version`);
      console.log(`   Usage: ${binaryName} run index:scan`);
    }

  } catch (error) {
    console.error(`❌ Bun PR test failed: ${error.message}`);
    process.exit(1);
  }
}

function extractPRNumber(target: string): string | null {
  // Extract PR number from various formats
  // "1234566" -> "1234566"
  // "https://github.com/oven-sh/bun/pull/1234566" -> "1234566"
  // "feature-branch" -> null
  
  const prMatch = target.match(/(\d+)$/);
  return prMatch ? prMatch[1] : null;
}

// Parse CLI arguments
if (import.meta.main) {
  const args = Bun.argv.slice(2);
  const options: PRTestOptions = {
    target: '',
  };

  // Parse arguments - handle --asan before target (matches bunx bun-pr --asan <pr-number>)
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--asan') {
      options.asan = true;
    } else if (arg === '--version') {
      options.version = true;
    } else if (!options.target && !arg.startsWith('--')) {
      // First non-flag argument is the target
      options.target = arg;
    }
  }

  if (!options.target) {
    console.error('❌ PR target required');
    console.error('\nUsage:');
    console.error('  bun bun:pr <pr-number>');
    console.error('  bun bun:pr <branch-name>');
    console.error('  bun bun:pr "https://github.com/oven-sh/bun/pull/1234566"');
    console.error('  bun bun:pr --asan <pr-number>  # Linux x64 only');
    console.error('  bun bun:pr --version <pr-number>');
    process.exit(1);
  }

  testBunPR(options).catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

export { testBunPR };

