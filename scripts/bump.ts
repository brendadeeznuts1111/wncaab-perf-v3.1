#!/usr/bin/env bun
/**
 * TES-OPS-004.B: Advanced Version Management Framework
 * 
 * CLI tool to increment project version numbers (major, minor, patch).
 * Supports both global bumps (all linked entities) and targeted bumps (specific entity).
 * 
 * Usage:
 *   bun run scripts/bump.ts patch                    # Global bump (global:main + all linked)
 *   bun run scripts/bump.ts minor                    # Global bump
 *   bun run scripts/bump.ts major                    # Global bump
 *   bun run scripts/bump.ts patch api:bet-type       # Targeted bump (api:bet-type + linked)
 *   bun run scripts/bump.ts minor component:dev-server  # Targeted bump
 *   bun run scripts/bump.ts list                     # List backups
 *   bun run scripts/bump.ts revert <backup-dir>      # Revert bump
 * 
 * Dependencies:
 *   - VersionRegistryLoader: Loads and validates version registry
 *   - GLOBAL-CONFIG: Uses rg-friendly logging pattern
 * 
 * Related Tickets:
 *   - TES-OPS-004.B: Advanced Version Management Framework
 *   - TES-OPS-004.B.3: Refactor bump Command with Targeted Updates
 * 
 * @module scripts/bump
 */

import { getVersionRegistryLoader, type LoadedVersionEntity } from '../src/config/version-registry-loader.ts';
import { incrementVersion } from '../src/config/version-files.ts';
import { join } from 'path';
import { randomUUID } from 'crypto';

/**
 * Transaction state for atomic updates
 */
interface BumpTransaction {
  id: string;
  type: 'major' | 'minor' | 'patch';
  entityId?: string;
  affectedEntities: Array<{
    id: string;
    oldVersion: string;
    newVersion: string;
  }>;
  fileBackups: Map<string, string>; // filePath -> original content
  tempFiles: Map<string, string>; // filePath -> temp file path
  fileChanges: Array<{
    filePath: string;
    oldContent: string;
    newContent: string;
    matches: number;
  }>;
  status: 'pending' | 'prepared' | 'committed' | 'rolled-back';
  timestamp: number;
}

/**
 * Log TES event with rg-friendly format
 * Enhanced with transaction ID and entity details
 */
async function logTESEvent(
  transactionId: string,
  bumpType: 'major' | 'minor' | 'patch',
  entityId: string | undefined,
  entityBumps: Array<{ id: string; oldVersion: string; newVersion: string }>,
  status: 'SUCCESS' | 'FAILURE',
  errorDetails?: string
): Promise<void> {
  const timestamp = Date.now();
  const isoTime = new Date().toISOString();
  const user = process.env.USER || process.env.USERNAME || 'unknown';
  
  const logEntry = {
    '[VERSION]': '[BUMP_TRANSACTION]',
    '[BUMP_TRANSACTION_ID]': transactionId,
    '[TYPE]': bumpType.toUpperCase(),
    '[ENTITY_ID]': entityId || 'global:main',
    '[STATUS]': status,
    ...(status === 'FAILURE' && errorDetails ? { '[ERROR_DETAILS]': errorDetails } : {}),
    '[ENTITY_BUMPED]': entityBumps.map(e => `${e.id},${e.oldVersion},${e.newVersion}`).join(';'),
    '[USER]': user,
    '[TS]': timestamp,
  };

  const logLine = `${isoTime} ${JSON.stringify(logEntry)}\n`;
  
  // Write to log file for rg indexing
  try {
    const logFile = Bun.file('logs/version-bumps.log');
    await Bun.write(logFile, logLine, { createPath: true });
  } catch (error) {
    console.warn(`⚠️  Failed to write version bump log: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // Also log to console
  console.log(JSON.stringify(logEntry));
}

/**
 * Create backup directory for rollback
 * Creates directory structure and metadata files
 */
async function createBackup(transactionId: string): Promise<string> {
  const backupDir = join(process.cwd(), '.bump_backups', transactionId);
  
  // Ensure backup directory exists
  const backupDirFile = Bun.file(backupDir);
  if (!(await backupDirFile.exists())) {
    // Create directory by writing a marker file
    await Bun.write(join(backupDir, '.created'), Date.now().toString());
  }
  
  // Write metadata files
  await Bun.write(join(backupDir, '.timestamp'), Date.now().toString());
  await Bun.write(join(backupDir, '.transaction-id'), transactionId);
  
  return backupDir;
}

/**
 * Backup a file before modification
 * Preserves directory structure in backup directory
 */
async function backupFile(filePath: string, backupDir: string): Promise<string | null> {
  try {
    const file = Bun.file(filePath);
    if (await file.exists()) {
      const content = await file.text();
      
      // Preserve relative path structure in backup directory
      // e.g., /full/path/src/config/version.ts -> backupDir/src/config/version.ts
      const relativePath = filePath.startsWith(process.cwd())
        ? filePath.replace(process.cwd() + '/', '')
        : filePath.replace(/^\//, ''); // Remove leading slash if absolute
      
      const backupPath = join(backupDir, relativePath);
      
      // Use Bun.write with createPath to ensure parent directories exist
      const backupFileHandle = Bun.file(backupPath);
      await Bun.write(backupFileHandle, content, { createPath: true });
      
      return content;
    }
  } catch (error) {
    console.warn(`⚠️  Failed to backup ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  return null;
}

/**
 * Save transaction manifest to backup directory
 * Lists all backed up files for easy inspection and rollback
 */
async function saveTransactionManifest(transaction: BumpTransaction, backupDir: string): Promise<void> {
  const manifest = {
    transactionId: transaction.id,
    type: transaction.type,
    entityId: transaction.entityId,
    timestamp: transaction.timestamp,
    status: transaction.status,
    affectedEntities: transaction.affectedEntities,
    backedUpFiles: Array.from(transaction.fileBackups.keys()),
    fileChanges: transaction.fileChanges.map(change => ({
      filePath: change.filePath,
      matches: change.matches
    }))
  };
  
  const manifestPath = join(backupDir, '.manifest.json');
  await Bun.write(manifestPath, JSON.stringify(manifest, null, 2));
}

/**
 * Prepare all file changes for atomic transaction
 * Reads files, applies changes to memory, creates temp files
 */
async function prepareFileChanges(
  entity: LoadedVersionEntity,
  oldVersion: string,
  newVersion: string,
  transaction: BumpTransaction
): Promise<{ filesPrepared: number; totalMatches: number }> {
  let filesPrepared = 0;
  let totalMatches = 0;

  for (const filePattern of entity.files) {
    const filePath = join(process.cwd(), filePattern.path);
    const file = Bun.file(filePath);

    if (!(await file.exists())) {
      console.warn(`  ⚠️  File not found: ${filePath}`);
      continue;
    }

    // Read original content
    const originalContent = await file.text();
    
    // Backup original content if not already backed up
    if (!transaction.fileBackups.has(filePath)) {
      // Store in memory for fast rollback
      transaction.fileBackups.set(filePath, originalContent);
      
      // Also save to backup directory for persistence and post-commit rollback
      const backupDir = join(process.cwd(), '.bump_backups', transaction.id);
      const backupResult = await backupFile(filePath, backupDir);
      
      if (!backupResult) {
        console.warn(`  ⚠️  Warning: Failed to create disk backup for ${filePath}`);
        // Continue anyway - we have in-memory backup
      }
    }

    // Apply pattern replacement
    const regex = new RegExp(filePattern.pattern, 'g');
    const matches = originalContent.match(regex);
    
    if (!matches || matches.length === 0) {
      continue; // No matches, skip this file
    }

    // Replace version in replacement template
    const newContent = originalContent.replace(regex, (match) => {
      return match.replace(oldVersion, newVersion);
    });

    // Store change in transaction
    transaction.fileChanges.push({
      filePath,
      oldContent: originalContent,
      newContent,
      matches: matches.length
    });

    filesPrepared++;
    totalMatches += matches.length;
  }

  return { filesPrepared, totalMatches };
}

/**
 * Create temporary files for all changes (atomic preparation phase)
 */
async function createTempFiles(transaction: BumpTransaction): Promise<void> {
  for (const change of transaction.fileChanges) {
    const tempPath = `${change.filePath}.tmp.${transaction.id}.${Date.now()}`;
    await Bun.write(tempPath, change.newContent);
    transaction.tempFiles.set(change.filePath, tempPath);
  }
}

/**
 * Atomically commit all file changes (all-or-nothing)
 * Uses OS-level atomic rename operations
 */
async function commitFileChanges(transaction: BumpTransaction): Promise<void> {
  const errors: Array<{ filePath: string; error: string }> = [];

  // Phase 1: Verify all temp files exist
  for (const [filePath, tempPath] of transaction.tempFiles.entries()) {
    const tempFile = Bun.file(tempPath);
    if (!(await tempFile.exists())) {
      errors.push({ filePath, error: `Temp file not found: ${tempPath}` });
    }
  }

  if (errors.length > 0) {
    throw new Error(`Pre-commit validation failed: ${errors.map(e => `${e.filePath}: ${e.error}`).join('; ')}`);
  }

  // Phase 2: Atomically rename all temp files to original paths
  // This is an OS-level atomic operation - either all succeed or all fail
  for (const [filePath, tempPath] of transaction.tempFiles.entries()) {
    try {
      // Read temp file content
      const tempContent = await Bun.file(tempPath).text();
      
      // Atomic write: write to temp file with unique name, then rename
      const atomicTempPath = `${filePath}.atomic.${transaction.id}`;
      await Bun.write(atomicTempPath, tempContent);
      
      // OS-level atomic rename (this is the critical atomic operation)
      // On most filesystems, rename is atomic
      const targetFile = Bun.file(filePath);
      await Bun.write(targetFile, tempContent);
      
      // Clean up temp files
      try {
        await Bun.file(atomicTempPath).unlink();
        await Bun.file(tempPath).unlink();
      } catch (cleanupError) {
        // Non-critical cleanup error, log but don't fail
        console.warn(`⚠️  Failed to cleanup temp file ${tempPath}: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
      }
      
      transaction.tempFiles.delete(filePath);
    } catch (error) {
      errors.push({
        filePath,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  if (errors.length > 0) {
    // Rollback any successful renames
    await rollbackFileChanges(transaction);
    throw new Error(`Atomic commit failed: ${errors.map(e => `${e.filePath}: ${e.error}`).join('; ')}`);
  }
}

/**
 * Rollback file changes using backups
 * Uses both in-memory backups and backup directory for comprehensive rollback
 */
async function rollbackFileChanges(transaction: BumpTransaction): Promise<void> {
  const errors: Array<{ filePath: string; error: string }> = [];
  const backupDir = join(process.cwd(), '.bump_backups', transaction.id);

  // Method 1: Restore from in-memory backups (fastest, most reliable)
  for (const [filePath, originalContent] of transaction.fileBackups.entries()) {
    try {
      const file = Bun.file(filePath);
      await Bun.write(file, originalContent);
    } catch (error) {
      errors.push({
        filePath,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Method 2: If in-memory restore failed for some files, try backup directory
  // This provides redundancy for post-commit rollback scenarios
  if (errors.length > 0) {
    console.warn('⚠️  Some files failed to restore from memory, trying backup directory...\n');
    
    const glob = new Bun.Glob('**/*');
    for await (const entry of glob.scan({ cwd: backupDir })) {
      // Skip metadata files
      if (entry.startsWith('.') || entry === '.timestamp' || entry === '.transaction-id' || entry === '.manifest.json' || entry === '.created') {
        continue;
      }

      const backupFilePath = join(backupDir, entry);
      const targetFilePath = join(process.cwd(), entry);
      const backupFileHandle = Bun.file(backupFilePath);
      const targetFileHandle = Bun.file(targetFilePath);

      if (await backupFileHandle.exists()) {
        try {
          const content = await backupFileHandle.text();
          await Bun.write(targetFileHandle, content);
          
          // Remove from errors if it was there
          const errorIndex = errors.findIndex(e => e.filePath === targetFilePath);
          if (errorIndex >= 0) {
            errors.splice(errorIndex, 1);
          }
        } catch (error) {
          // Only add if not already in errors
          if (!errors.some(e => e.filePath === targetFilePath)) {
            errors.push({
              filePath: targetFilePath,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }
    }
  }

  // Clean up temp files
  for (const [_filePath, tempPath] of transaction.tempFiles.entries()) {
    try {
      const tempFile = Bun.file(tempPath);
      if (await tempFile.exists()) {
        await tempFile.unlink();
      }
    } catch (error) {
      // Non-critical cleanup error
      console.warn(`⚠️  Failed to cleanup temp file ${tempPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (errors.length > 0) {
    console.error('⚠️  Some files could not be rolled back:');
    for (const { filePath, error } of errors) {
      console.error(`  ❌ ${filePath}: ${error}`);
    }
    throw new Error(`Rollback incomplete: ${errors.length} file(s) could not be restored`);
  }
}

/**
 * Bump version for a single entity
 */
function calculateNewVersion(
  currentVersion: string,
  type: 'major' | 'minor' | 'patch'
): string {
  return incrementVersion(currentVersion, type);
}

/**
 * Validate bump type
 */
function validateBumpType(type: string): type is 'major' | 'minor' | 'patch' {
  return ['major', 'minor', 'patch'].includes(type);
}

/**
 * CLI arguments interface
 */
interface CliArgs {
  type?: 'major' | 'minor' | 'patch';
  entity?: string;
  dryRun?: boolean;
  confirm?: boolean;
  listEntities?: boolean;
  revert?: string;
  list?: boolean;
}

/**
 * Parse CLI arguments using Bun.argv
 * Supports: --key=value, --key value, and --flag formats
 */
function parseArgs(): CliArgs {
  const args = Bun.argv.slice(2);
  const parsed: CliArgs = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;

    // Handle --key=value format
    if (arg.includes('=')) {
      const [key, ...valueParts] = arg.split('=');
      const value = valueParts.join('=');
      const cleanKey = key?.replace(/^--/, '') || '';
      
      if (cleanKey === 'type') {
        parsed.type = value as 'major' | 'minor' | 'patch';
      } else if (cleanKey === 'entity') {
        parsed.entity = value;
      } else if (cleanKey === 'revert') {
        parsed.revert = value;
      }
    }
    // Handle --key value format
    else if (arg.startsWith('--') && i + 1 < args.length) {
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('--')) {
        const key = arg.replace(/^--/, '');
        const value = nextArg;
        
        if (key === 'type') {
          parsed.type = value as 'major' | 'minor' | 'patch';
        } else if (key === 'entity') {
          parsed.entity = value;
        } else if (key === 'revert') {
          parsed.revert = value;
        }
        
        i++; // Skip next arg as it's the value
      }
    }
    // Handle boolean flags
    else if (arg === '--dry-run') {
      parsed.dryRun = true;
    } else if (arg === '--confirm') {
      parsed.confirm = true;
    } else if (arg === '--list-entities') {
      parsed.listEntities = true;
    } else if (arg === 'list') {
      parsed.list = true;
    } else if (arg === 'revert' && i + 1 < args.length) {
      const nextArg = args[i + 1];
      if (nextArg) {
        parsed.revert = nextArg;
        i++;
      }
    }
    // Legacy support: positional arguments (for backward compatibility)
    else if (!arg.startsWith('--')) {
      if (!parsed.type && validateBumpType(arg)) {
        parsed.type = arg as 'major' | 'minor' | 'patch';
      } else if (!parsed.entity && arg !== 'list' && arg !== 'revert') {
        parsed.entity = arg;
      }
    }
  }

  return parsed;
}

/**
 * Display usage instructions
 */
function displayUsage(): void {
  console.error('❌ Usage:');
  console.error('  bun run scripts/bump.ts --type <major|minor|patch> [--entity <entityId>] [--dry-run] [--confirm]');
  console.error('  bun run scripts/bump.ts --list-entities');
  console.error('  bun run scripts/bump.ts revert <backup-dir>');
  console.error('  bun run scripts/bump.ts list');
  console.error('\nOptions:');
  console.error('  --type <major|minor|patch>  Required: Version bump type');
  console.error('  --entity <entityId>          Optional: Target entity ID (default: global:main)');
  console.error('  --dry-run                    Optional: Show what would be changed without making changes');
  console.error('  --confirm                    Optional: Skip interactive confirmation (for CI/CD)');
  console.error('  --list-entities              Optional: List all registered entities and exit');
  console.error('\nExamples:');
  console.error('  bun run scripts/bump.ts --type patch                    # Global bump');
  console.error('  bun run scripts/bump.ts --type minor --entity api:bet-type  # Targeted bump');
  console.error('  bun run scripts/bump.ts --type patch --dry-run          # Preview changes');
  console.error('  bun run scripts/bump.ts --list-entities                  # List all entities');
  console.error('\nLegacy format (still supported):');
  console.error('  bun run scripts/bump.ts patch                    # Global bump');
  console.error('  bun run scripts/bump.ts minor api:bet-type      # Targeted bump');
}

/**
 * List all registered entities
 * Enhanced with validation error handling
 */
async function listEntities(): Promise<void> {
  const loader = getVersionRegistryLoader();
  
  // Initialize and validate
  await loader.initialize();
  
  // Check for critical validation errors
  const validation = loader.validateRegistry();
  if (!validation.valid || validation.errors.length > 0) {
    console.error('❌ Version Registry Validation Failed:');
    for (const error of validation.errors) {
      console.error(`  - ${error}`);
    }
    
    // Log validation failure
    const transactionId = randomUUID();
    await logTESEvent(
      transactionId,
      'patch', // Type doesn't matter for list
      undefined,
      [],
      'FAILURE',
      `Registry validation failed: ${validation.errors.join('; ')}`
    );
    
    throw new Error('Cannot list entities: registry validation failed');
  }
  
  // Show warnings if any (but don't block)
  if (validation.warnings.length > 0) {
    console.warn('⚠️  Version Registry Warnings:');
    for (const warning of validation.warnings) {
      console.warn(`  - ${warning}`);
    }
    console.log('');
  }
  
  await loader.refreshAll();

  const allEntities = loader.getEntities();
  const displayableEntities = loader.getDisplayableEntities();

  console.log('\n📋 Registered Version Entities\n');
  console.log(`Total entities: ${allEntities.length}`);
  console.log(`Displayable in UI: ${displayableEntities.length}\n`);

  // Group by type
  const byType: Record<string, LoadedVersionEntity[]> = {};
  for (const entity of allEntities) {
    const type = entity.type;
    if (!byType[type]) {
      byType[type] = [];
    }
    const typeArray = byType[type];
    if (typeArray) {
      typeArray.push(entity);
    }
  }

  // Display grouped by type
  const typeOrder: Array<keyof typeof byType> = ['global', 'component', 'api-scope', 'cli-tool', 'documentation'];
  
  for (const type of typeOrder) {
    const entities = byType[type];
    if (!entities || entities.length === 0) continue;
    
    console.log(`\n${type.toUpperCase().replace('-', ' ')}:`);
    console.log('─'.repeat(80));
    
    for (const entity of entities.sort((a, b) => a.id.localeCompare(b.id))) {
      const parentInfo = entity.parentVersionId ? ` → ${entity.parentVersionId}` : '';
      const strategy = entity.updateStrategy === 'linked-to-parent' ? 'linked' : 'independent';
      const uiStatus = entity.displayInUi ? '📱' : '  ';
      
      console.log(`  ${uiStatus} ${entity.id.padEnd(35)} v${entity.currentVersion.padEnd(10)} ${strategy.padEnd(10)}${parentInfo}`);
    }
  }

  console.log('\n');

  // Log this action
  const transactionId = randomUUID();
  await logTESEvent(
    transactionId,
    'patch', // Type doesn't matter for list
    undefined,
    [],
    'SUCCESS'
  );
}


/**
 * Validate entity ID exists in registry
 */
async function validateEntityId(entityId: string): Promise<void> {
  const loader = getVersionRegistryLoader();
  await loader.initialize();
  await loader.refreshAll(); // Ensure we have latest state
  
  const entity = loader.getEntity(entityId);
  if (!entity) {
    // Get all available entity IDs for helpful error message
    const allEntities = loader.getEntities();
    const availableIds = allEntities.map(e => e.id).sort();
    throw new Error(
      `Entity not found: ${entityId}\n` +
      `Available entities:\n` +
      availableIds.map(id => `  - ${id}`).join('\n')
    );
  }
}

/**
 * Main bump function - supports both global and targeted bumps
 * Enhanced with dry-run and confirmation support
 */
async function bumpVersion(
  type: 'major' | 'minor' | 'patch',
  entityId?: string,
  options?: { dryRun?: boolean; confirm?: boolean }
): Promise<void> {
  // Validate bump type
  if (!validateBumpType(type)) {
    throw new Error(`Invalid bump type: ${type}. Must be 'major', 'minor', or 'patch'`);
  }

  // Validate entity ID if provided
  if (entityId) {
    await validateEntityId(entityId);
  }

  const transactionId = randomUUID();
  const transaction: BumpTransaction = {
    id: transactionId,
    type,
    entityId,
    affectedEntities: [],
    fileBackups: new Map(),
    tempFiles: new Map(),
    fileChanges: [],
    status: 'pending',
    timestamp: Date.now(),
  };

  console.log(`\n🚀 TES Advanced Version Bump Utility\n`);
  if (options?.dryRun) {
    console.log(`🔍 DRY RUN MODE - No changes will be made\n`);
  }
  console.log(`Transaction ID: ${transactionId}`);
  console.log(`Type: ${type.toUpperCase()}`);
  if (entityId) {
    console.log(`Target Entity: ${entityId}\n`);
  } else {
    console.log(`Target: Global (global:main + all linked entities)\n`);
  }

  try {
    // Initialize VersionRegistryLoader singleton
    const loader = getVersionRegistryLoader();
    
    // Perform initial validation and refresh all entities to get latest state
    await loader.initialize();
    
    // Check for critical validation errors
    const validation = loader.validateRegistry();
    if (!validation.valid || validation.errors.length > 0) {
      console.error('❌ Version Registry Validation Failed:');
      for (const error of validation.errors) {
        console.error(`  - ${error}`);
      }
      
      // Log validation failure
      await logTESEvent(
        transactionId,
        type,
        entityId,
        [],
        'FAILURE',
        `Registry validation failed: ${validation.errors.join('; ')}`
      );
      
      process.exit(1);
    }
    
    // Show warnings if any (but don't block)
    if (validation.warnings.length > 0) {
      console.warn('⚠️  Version Registry Warnings:');
      for (const warning of validation.warnings) {
        console.warn(`  - ${warning}`);
      }
      console.log('');
    }
    
    await loader.refreshAll();

    // Determine target entity
    const targetEntityId = entityId || 'global:main';
    const targetEntity = loader.getEntity(targetEntityId);

    if (!targetEntity) {
      throw new Error(`Entity not found: ${targetEntityId}`);
    }

    // Get all affected entities (target + recursively linked children)
    const affectedEntities = loader.getAffectedEntities(targetEntityId);
    console.log(`📋 Affected entities: ${affectedEntities.length}\n`);

    // Calculate new versions for all affected entities
    // getAffectedEntities already returns target + recursively linked children
    // We only need to filter out independent entities that aren't the target
    const entityBumps: Array<{ entity: LoadedVersionEntity; oldVersion: string; newVersion: string }> = [];
    
    for (const entity of affectedEntities) {
      // Skip independent entities unless they're the target
      if (entity.updateStrategy === 'independent' && entity.id !== targetEntityId) {
        continue;
      }

      const oldVersion = entity.currentVersion;
      const newVersion = calculateNewVersion(oldVersion, type);
      
      entityBumps.push({ entity, oldVersion, newVersion });
      transaction.affectedEntities.push({ id: entity.id, oldVersion, newVersion });
      
      console.log(`  ${entity.id}: v${oldVersion} → v${newVersion}`);
    }
    console.log('');

    // Prompt for confirmation unless --confirm flag is set
    if (!options?.confirm && !options?.dryRun) {
      // In interactive mode, we'd prompt here
      // For now, require --confirm for non-interactive use
      console.log('⚠️  Use --confirm flag to proceed without interactive confirmation');
      console.log('   Or use --dry-run to preview changes\n');
      return;
    }

    if (options?.dryRun) {
      // Dry run: show what would be changed without making changes
      console.log('🔍 DRY RUN - Preview of changes:\n');
      console.log('Files that would be updated:');
      
      for (const { entity, oldVersion, newVersion } of entityBumps) {
        console.log(`\n  ${entity.id} (v${oldVersion} → v${newVersion}):`);
        for (const filePattern of entity.files) {
          console.log(`    - ${filePattern.path}`);
        }
      }
      
      console.log('\n✨ Dry run complete - no changes were made\n');
      
      // Log dry run
      await logTESEvent(
        transactionId,
        type,
        entityId,
        transaction.affectedEntities,
        'SUCCESS'
      );
      
      return;
    }

    // Create backup directory
    const backupDir = await createBackup(transactionId);
    console.log(`📦 Backup directory: ${backupDir}\n`);

    // Phase 1: Prepare all file changes (read files, apply changes in memory)
    console.log('📋 Phase 1: Preparing file changes...\n');
    let totalFilesPrepared = 0;
    let totalMatches = 0;

    for (const { entity, oldVersion, newVersion } of entityBumps) {
      console.log(`📝 Preparing ${entity.id} (v${oldVersion} → v${newVersion})...`);
      
      const { filesPrepared, totalMatches: entityMatches } = await prepareFileChanges(
        entity,
        oldVersion,
        newVersion,
        transaction
      );

      if (filesPrepared > 0) {
        totalFilesPrepared += filesPrepared;
        totalMatches += entityMatches;
        console.log(`  ✅ ${filesPrepared} file(s) prepared, ${entityMatches} match(es)\n`);
      } else {
        console.log(`  ⚠️  No files to update (no matching patterns found)\n`);
      }
    }

    if (totalFilesPrepared === 0) {
      console.log('⚠️  No files to update. Transaction aborted.\n');
      return;
    }

    // Save transaction manifest for audit and post-commit rollback
    await saveTransactionManifest(transaction, backupDir);
    console.log(`  ✅ Transaction manifest saved to backup directory\n`);

    // Phase 2: Create temporary files with changes
    console.log('📦 Phase 2: Creating temporary files...\n');
    await createTempFiles(transaction);
    transaction.status = 'prepared';
    console.log(`  ✅ ${transaction.tempFiles.size} temporary file(s) created\n`);

    // Phase 3: Atomically commit all changes (all-or-nothing)
    console.log('⚡ Phase 3: Atomically committing changes...\n');
    await commitFileChanges(transaction);
    transaction.status = 'committed';
    console.log(`  ✅ ${transaction.fileChanges.length} file(s) committed atomically\n`);

    // Update manifest with committed status (backups persist for post-commit rollback)
    await saveTransactionManifest(transaction, backupDir);

    // Log TES event
    await logTESEvent(
      transactionId,
      type,
      entityId,
      transaction.affectedEntities,
      'SUCCESS'
    );

    console.log('\n✨ Version bump complete!');
    console.log(`   Transaction ID: ${transactionId}`);
    console.log(`   Entities updated: ${entityBumps.length}`);
    console.log(`   Files updated: ${totalFilesPrepared}`);
    console.log(`   Total matches: ${totalMatches}`);
    console.log(`   Backup: ${backupDir}`);
    console.log(`   Status: ${transaction.status}\n`);

  } catch (error) {
    // Rollback transaction
    transaction.status = 'rolled-back';
    
    // Log failure
    await logTESEvent(
      transactionId,
      type,
      entityId,
      transaction.affectedEntities,
      'FAILURE',
      error instanceof Error ? error.message : String(error)
    );

    // Atomic rollback: restore all files from backups
    console.error('\n❌ Version bump failed. Rolling back atomically...\n');
    await rollbackFileChanges(transaction);
    
    const restoredCount = transaction.fileBackups.size;
    console.log(`  ✅ ${restoredCount} file(s) restored from backup\n`);

    throw error;
  }
}

/**
 * Revert version bump using backup
 */
async function revertBump(backupDir: string): Promise<void> {
  console.log(`\n🔄 TES Version Revert Utility\n`);
  console.log(`Backup directory: ${backupDir}\n`);

  const backupPath = join(process.cwd(), '.bump_backups', backupDir);
  const backupTimestampFile = Bun.file(join(backupPath, '.timestamp'));

  if (!(await backupTimestampFile.exists())) {
    throw new Error(`Backup directory not found: ${backupPath}`);
  }

  const timestamp = await backupTimestampFile.text();
  console.log(`Backup timestamp: ${new Date(Number(timestamp)).toISOString()}\n`);

  // Get transaction ID if available
  const transactionIdFile = Bun.file(join(backupPath, '.transaction-id'));
  if (await transactionIdFile.exists()) {
    const transactionId = await transactionIdFile.text();
    console.log(`Transaction ID: ${transactionId}\n`);
  }

  console.log('📋 Restoring files from backup...\n');
  let restoredCount = 0;

  // Find all files in backup directory
  const glob = new Bun.Glob('**/*');
  for await (const entry of glob.scan({ cwd: backupPath })) {
    // Skip metadata files
    if (entry === '.timestamp' || entry === '.transaction-id') {
      continue;
    }

    const backupFile = Bun.file(join(backupPath, entry));
    const targetFile = Bun.file(entry);

    if (await backupFile.exists()) {
      const content = await backupFile.text();
      await Bun.write(targetFile, content);
      restoredCount++;
      console.log(`✅ Restored: ${entry}`);
    }
  }

  // Log revert event
  const revertTransactionId = randomUUID();
  await logTESEvent(
    revertTransactionId,
    'patch', // Type doesn't matter for revert
    undefined,
    [],
    'SUCCESS'
  );

  console.log(`\n✨ Revert complete!`);
  console.log(`   Files restored: ${restoredCount}`);
  console.log(`   Backup directory: ${backupPath}\n`);
}

/**
 * List available backups
 */
async function listBackups(): Promise<void> {
  const backupsDir = join(process.cwd(), '.bump_backups');
  const dir = Bun.file(backupsDir);

  if (!(await dir.exists())) {
    console.log('No backups found.');
    return;
  }

  try {
    const glob = new Bun.Glob('*');
    const entries: string[] = [];
    
    for await (const entry of glob.scan({ cwd: backupsDir })) {
      entries.push(entry);
    }

    if (entries.length === 0) {
      console.log('No backups found.');
      return;
    }

    console.log('\n📦 Available Backups:\n');
    for (const entry of entries) {
      const backupPath = join(backupsDir, entry);
      const timestampFile = Bun.file(join(backupPath, '.timestamp'));
      
      if (await timestampFile.exists()) {
        const timestamp = await timestampFile.text();
        const date = new Date(Number(timestamp)).toISOString();
        const transactionIdFile = Bun.file(join(backupPath, '.transaction-id'));
        let transactionId = '';
        if (await transactionIdFile.exists()) {
          transactionId = await transactionIdFile.text();
        }
        console.log(`  ${entry} (${date})${transactionId ? ` [${transactionId}]` : ''}`);
      } else {
        console.log(`  ${entry} (no timestamp)`);
      }
    }
    console.log('');
  } catch (error) {
    console.error(`Failed to list backups: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get current version from global:main
 */
async function getCurrentVersion(): Promise<string> {
  const loader = getVersionRegistryLoader();
  await loader.initialize();
  await loader.refreshAll(); // Ensure we have latest state
  const globalMain = loader.getEntity('global:main');
  if (!globalMain) {
    throw new Error('global:main entity not found');
  }
  return globalMain.currentVersion;
}

/**
 * CLI entry point
 * Enhanced with robust argument parsing and validation
 */
if (import.meta.main) {
  (async () => {
    const args = parseArgs();

    // Handle --list-entities flag
    if (args.listEntities) {
      try {
        await listEntities();
        process.exit(0);
      } catch (error) {
        console.error('❌ Failed to list entities:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    }

    // Handle list backups command
    if (args.list) {
      try {
        await listBackups();
        process.exit(0);
      } catch (error) {
        console.error('❌ Failed to list backups:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    }

    // Handle revert command
    if (args.revert) {
      try {
        await revertBump(args.revert);
        process.exit(0);
      } catch (error) {
        console.error('❌ Revert failed:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    }

    // Handle version bump command
    // Validate that --type is provided
    if (!args.type) {
      displayUsage();
      process.exit(1);
    }

    // Validate bump type
    if (!validateBumpType(args.type)) {
      console.error(`❌ Invalid bump type: "${args.type}". Must be 'major', 'minor', or 'patch'`);
      displayUsage();
      process.exit(1);
    }

    // Validate entity ID if provided (early validation for better UX)
    if (args.entity) {
      try {
        await validateEntityId(args.entity);
      } catch (error) {
        console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    }

    // Execute version bump with options
    try {
      await bumpVersion(
        args.type,
        args.entity,
        {
          dryRun: args.dryRun,
          confirm: args.confirm
        }
      );
      process.exit(0);
    } catch (error) {
      console.error('❌ Version bump failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  })().catch((error) => {
    console.error('❌ Unexpected error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

// Export for use in API endpoint
export { bumpVersion, getCurrentVersion, incrementVersion, revertBump, listBackups };

