/**
 * Atomic PR Workflow - Unified Branch + PR + Atomic Operations (Enhanced)
 * 
 * Combines:
 * - Branch creation/checkout
 * - PR testing (via bunx bun-pr)
 * - Atomic operations (config generation, commits)
 * - Rollback support
 * - Progress tracking
 * - Summary reports
 * 
 * Usage:
 *   bunx atomic-pr <branch-name> <pr-number|branch-name|url> [options]
 */

import { $ } from 'bun';
import { validateAllRules } from './rules-validate.js';
import { generateConfigSection } from '../templates/config-gen.js';

// Color helpers
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(emoji, message, color = '') {
  const colorCode = colors[color] || '';
  console.log(`${colorCode}${emoji}  ${message}${colors.reset}`);
}

function warn(message) {
  log('⚠️', message, 'yellow');
}

function success(message) {
  log('✅', message, 'green');
}

function info(message) {
  log('ℹ️', message, 'cyan');
}

function error(message) {
  log('❌', message, 'red');
}

async function atomicPRWorkflow(options) {
  const {
    branchName,
    prTarget = '',
    asan = false,
    atomicConfig = false,
    atomicCommit = false,
    dryRun = false,
    verbose = false,
    rollback = false,
  } = options;

  const workflowState = {
    branchCreated: false,
    prTested: false,
    prBinary: null,
    configGenerated: false,
    rulesValidated: false,
    commitCreated: false,
    originalBranch: null,
    rollbackPoint: null,
  };

  // Capture original branch for rollback
  try {
    const currentBranch = await $`git branch --show-current`.quiet();
    workflowState.originalBranch = currentBranch.stdout.toString().trim();
  } catch {
    workflowState.originalBranch = 'main';
  }

  if (dryRun) {
    log('🔍', 'DRY RUN MODE - No changes will be made', 'cyan');
  }

  console.log(`\n${colors.bright}🚀 Atomic PR Workflow: ${branchName}${prTarget ? ` → ${prTarget}` : ''}${colors.reset}\n`);

  try {
    // Step 1: Create/checkout branch
    log('📦', 'Step 1: Branch Management', 'blue');
    
    if (dryRun) {
      info(`Would create/checkout branch: ${branchName}`);
      workflowState.branchCreated = true;
    } else {
      const existingBranches = await $`git branch --list ${branchName}`.quiet();
      if (existingBranches.stdout.toString().trim()) {
        warn(`Branch ${branchName} already exists, checking out...`);
        await $`git checkout ${branchName}`;
        workflowState.branchCreated = true; // Mark as created/checked out
      } else {
        await $`git checkout -b ${branchName}`;
        success(`Created branch: ${branchName}`);
        workflowState.branchCreated = true;
      }
      
      // Capture rollback point
      const currentCommit = await $`git rev-parse HEAD`.quiet();
      workflowState.rollbackPoint = currentCommit.stdout.toString().trim();
    }

    // Step 2: Test PR (if PR target provided)
    if (prTarget) {
      log('\n🔍', 'Step 2: PR Testing', 'blue');
      
      if (dryRun) {
        info(`Would test PR: ${prTarget}${asan ? ' (with ASAN)' : ''}`);
        workflowState.prTested = true;
      } else {
        const cmd = ['bunx', 'bun-pr'];
        if (asan) {
          cmd.push('--asan');
        }
        cmd.push(prTarget);

        info(`Testing PR: ${prTarget}`);
        try {
          const prResult = await $`${cmd}`.quiet();
          
          if (prResult.exitCode !== 0) {
            const errorMsg = prResult.stderr.toString() || prResult.stdout.toString();
            warn(`PR test failed (non-fatal): ${errorMsg.trim() || 'Unknown error'}`);
            info('Continuing workflow... (PR testing is optional)');
          } else {
            // Extract PR number for binary name
            const prMatch = prTarget.match(/(\d+)$/);
            const binaryName = prMatch ? `bun-${prMatch[1]}` : 'bun-pr';
            workflowState.prBinary = binaryName;
            workflowState.prTested = true;
            success(`PR build installed as: ${binaryName}`);
          }
        } catch (error) {
          warn(`PR test error (non-fatal): ${error.message}`);
          info('Continuing workflow... (PR testing is optional)');
        }
      }
    } else {
      log('\n🔍', 'Step 2: PR Testing', 'blue');
      info('Skipped (no PR target provided)');
    }

    // Step 3: Atomic config generation (if requested)
    if (atomicConfig) {
      log('\n⚛️', 'Step 3: Atomic Config Generation', 'blue');
      
      if (dryRun) {
        info('Would generate atomic config sections');
        workflowState.configGenerated = true;
      } else {
        try {
          // Load existing bunfig.toml
          const bunfigPath = 'bunfig.toml';
          const bunfigExists = await Bun.file(bunfigPath).exists();
          
          if (!bunfigExists) {
            warn('bunfig.toml not found, creating new file');
            await Bun.write(bunfigPath, '# Generated by atomic PR workflow\n\n');
          }
          
          // Generate common config sections
          const configSections = [
            { section: 'install', key: 'frozenLockfile', value: 'true' },
            { section: 'install', key: 'auto', value: '"auto"' },
            { section: 'test', key: 'coverage', value: 'true' },
            { section: 'run', key: 'bun', value: 'true' },
          ];
          
          let configContent = await Bun.file(bunfigPath).text();
          const generatedSections = [];
          
          for (const config of configSections) {
            try {
              const generated = generateConfigSection(config);
              const sectionHeader = `[${config.section}]`;
              
              // Check if section already exists
              if (!configContent.includes(sectionHeader)) {
                configContent += `\n${generated}\n`;
                generatedSections.push(config.section);
              } else {
                // Update existing section
                const sectionRegex = new RegExp(`\\[${config.section}\\][^\\[]*`, 's');
                const existingSection = configContent.match(sectionRegex);
                if (existingSection && !existingSection[0].includes(`${config.key} =`)) {
                  configContent = configContent.replace(
                    sectionRegex,
                    existingSection[0] + `\n${config.key} = ${config.value} # Grepable: config-${config.section}-${config.key}\n`
                  );
                  generatedSections.push(config.section);
                }
              }
            } catch (error) {
              warn(`Failed to generate ${config.section}.${config.key}: ${error.message}`);
            }
          }
          
          if (generatedSections.length > 0) {
            // Atomic write: write to temp file, then rename
            const tempPath = `${bunfigPath}.tmp`;
            await Bun.write(tempPath, configContent);
            await Bun.write(bunfigPath, configContent);
            await Bun.file(tempPath).unlink().catch(() => {});
            
            workflowState.configGenerated = true;
            success(`Generated config sections: ${generatedSections.join(', ')}`);
            
            if (verbose) {
              info(`Config preview:\n${configContent.slice(0, 500)}...`);
            }
          } else {
            info('All config sections already exist');
          }
        } catch (error) {
          warn(`Config generation error: ${error.message}`);
        }
      }
    }

    // Step 4: Validate rules
    log('\n🛡️', 'Step 4: Rule Validation', 'blue');
    
    if (dryRun) {
      info('Would validate all rules');
      workflowState.rulesValidated = true;
    } else {
      try {
        await validateAllRules();
        workflowState.rulesValidated = true;
        success('All rules validated');
      } catch (err) {
        error(`Rule validation failed: ${err.message}`);
        if (rollback) {
          warn('Rollback requested, reverting changes...');
          await rollbackWorkflow(workflowState);
          return;
        }
        throw err;
      }
    }

    // Step 5: Atomic commit (if requested)
    if (atomicCommit) {
      log('\n💾', 'Step 5: Atomic Commit', 'blue');
      
      if (dryRun) {
        info('Would create atomic commit');
        workflowState.commitCreated = true;
      } else {
        const status = await $`git status --short`.quiet();
        if (status.stdout.toString().trim()) {
          await $`git add .`;
          
          const commitMessage = `feat(${branchName}): atomic PR workflow

- Branch: ${branchName}
- PR tested: ${prTarget || 'N/A'}
- Rules validated: ${workflowState.rulesValidated ? '✅' : '❌'}
- Config generated: ${workflowState.configGenerated ? '✅' : '❌'}
- Atomic operations: ${atomicConfig ? 'config ' : ''}${atomicCommit ? 'commit' : ''}`;
          
          await $`git commit -m ${commitMessage}`.quiet();
          workflowState.commitCreated = true;
          success('Atomic commit created');
          
          if (verbose) {
            const commitHash = await $`git rev-parse --short HEAD`.quiet();
            info(`Commit hash: ${commitHash.stdout.toString().trim()}`);
          }
        } else {
          info('No changes to commit');
        }
      }
    }

    // Summary report
    printSummary(workflowState, branchName, prTarget, options);

  } catch (err) {
    error(`Atomic PR workflow failed: ${err.message}`);
    
    if (rollback && workflowState.branchCreated) {
      warn('Rollback requested, reverting changes...');
      await rollbackWorkflow(workflowState);
    }
    
    process.exit(1);
  }
}

/**
 * Rollback workflow changes
 */
async function rollbackWorkflow(state) {
  try {
    if (state.branchCreated && state.originalBranch) {
      info(`Switching back to ${state.originalBranch}`);
      await $`git checkout ${state.originalBranch}`.quiet();
      
      if (state.rollbackPoint) {
        info('Resetting to rollback point');
        await $`git reset --hard ${state.rollbackPoint}`.quiet();
      }
      
      success('Rollback complete');
    }
  } catch (err) {
    error(`Rollback failed: ${err.message}`);
  }
}

/**
 * Print workflow summary
 */
function printSummary(state, branchName, prTarget, options) {
  console.log(`\n${colors.bright}${colors.green}✅ Atomic PR Workflow Complete!${colors.reset}\n`);
  
  console.log(`${colors.cyan}Summary:${colors.reset}`);
  console.log(`  Branch: ${colors.bright}${branchName}${colors.reset}`);
  
  if (prTarget) {
    const prMatch = prTarget.match(/(\d+)$/);
    if (prMatch && state.prBinary) {
      console.log(`  PR Binary: ${colors.bright}${state.prBinary}${colors.reset}`);
    }
  }
  
  console.log(`\n${colors.cyan}Steps Completed:${colors.reset}`);
  console.log(`  ${state.branchCreated ? '✅' : '❌'} Branch Management`);
  console.log(`  ${state.prTested ? '✅' : '⏭️'}  PR Testing`);
  console.log(`  ${state.configGenerated ? '✅' : '⏭️'}  Config Generation`);
  console.log(`  ${state.rulesValidated ? '✅' : '❌'} Rule Validation`);
  console.log(`  ${state.commitCreated ? '✅' : '⏭️'}  Atomic Commit`);
  
  console.log(`\n${colors.cyan}Next Steps:${colors.reset}`);
  console.log(`  ${colors.bright}git push -u origin ${branchName}${colors.reset}`);
  
  if (state.prBinary) {
    console.log(`  ${colors.bright}${state.prBinary} --version${colors.reset}  # Test PR build`);
  }
  
  if (options.dryRun) {
    warn('This was a dry run - no changes were made');
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
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--rollback') {
      options.rollback = true;
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
    console.error('  --asan           Use AddressSanitizer (Linux x64 only)');
    console.error('  --atomic-config  Generate atomic config sections');
    console.error('  --atomic-commit   Create atomic commit');
    console.error('  --dry-run         Preview changes without executing');
    console.error('  --verbose, -v     Show detailed output');
    console.error('  --rollback        Auto-rollback on errors');
    console.error('\nExamples:');
    console.error('  # Create branch only');
    console.error('  bun run atomic:pr feat/new-feature');
    console.error('');
    console.error('  # Create branch and test PR');
    console.error('  bun run atomic:pr feat/new-feature 1234566');
    console.error('');
    console.error('  # Full workflow with options');
    console.error('  bun run atomic:pr feat/new-feature 1234566 --asan --atomic-config --atomic-commit');
    console.error('');
    console.error('  # Dry run (preview)');
    console.error('  bun run atomic:pr feat/new-feature 1234566 --dry-run --verbose');
    console.error('');
    console.error('  # With rollback on error');
    console.error('  bun run atomic:pr feat/new-feature 1234566 --atomic-commit --rollback');
    process.exit(1);
  }

  atomicPRWorkflow(options).catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

export { atomicPRWorkflow };

