#!/usr/bin/env bun
/// <reference types="bun-types" />
/**
 * Migration Automation - v1.3.2 → v1.4 Upgrade (v1.4)
 * 
 * CLI command: bun run scripts/migration-automation.ts
 * 
 * Automates migration from v1.3.2 basic indexing to v1.4 semantic indexing.
 */

import { AIImmunityIndexer } from './index-ai-immunity-enhanced';
import { IndexValidator } from './validate-index-enhanced';
import { AtomicFile } from './atomic-file';

export interface MigrationResult {
  success: boolean;
  propheciesMigrated: number;
  validation: boolean;
  backupCreated: boolean;
}

export class MigrationAutomation {
  private indexer: AIImmunityIndexer;
  private validator: IndexValidator;
  private atomic: AtomicFile;

  constructor() {
    this.indexer = new AIImmunityIndexer();
    this.validator = new IndexValidator();
    this.atomic = new AtomicFile();
  }

  async migrateFromV1_3_2(): Promise<MigrationResult> {
    console.log('🚀 Migrating from v1.3.2 to v1.4 AI-IMMUNITY indexing...');

    // Backup old index
    let backupCreated = false;
    if (await this.atomic.exists('.ai-immunity.index')) {
      const backupPath = `.ai-immunity.index.backup.${Date.now()}`;
      const content = await this.atomic.read('.ai-immunity.index');
      await this.atomic.write(backupPath, content);
      backupCreated = true;
      console.log(`📦 Backup created: ${backupPath}`);
    }

    // Build new dual-index
    console.log('🔨 Building v1.4 dual-index...');
    const stats = await this.indexer.buildDualIndex();

    // Validate migration
    console.log('✅ Validating migration...');
    const validation = await this.validator.validateAndHeal();

    // Update package.json scripts if needed
    await this.updatePackageScripts();

    console.log('✅ Migration completed successfully!');

    return {
      success: true,
      propheciesMigrated: stats.prophecyCount,
      validation: validation.valid,
      backupCreated
    };
  }

  private async updatePackageScripts(): Promise<void> {
    const packagePath = './package.json';
    
    if (!(await this.atomic.exists(packagePath))) {
      console.log('⚠️  package.json not found, skipping script updates');
      return;
    }

    try {
      const pkg = JSON.parse(await this.atomic.read(packagePath));

      // Add new v1.4 scripts if they don't exist
      const newScripts = {
        'index:ai-immunity': 'bun run APPENDIX/scripts/index-ai-immunity.ts',
        'semantic:hunt': 'bun run APPENDIX/queries/semantic-hunt.ts',
        'validate:index': 'bun run APPENDIX/scripts/validate-index.js',
        'hybrid:query': 'bun run APPENDIX/queries/hybrid-query.ts',
      };

      let updated = false;
      for (const [key, value] of Object.entries(newScripts)) {
        if (!pkg.scripts[key]) {
          pkg.scripts[key] = value;
          updated = true;
        }
      }

      if (updated) {
        await this.atomic.writeJSON(packagePath, pkg);
        console.log('📝 Updated package.json scripts');
      }
    } catch (error) {
      console.warn(`⚠️  Could not update package.json: ${error.message}`);
    }
  }
}

// Run migration
if (import.meta.main) {
  const migrator = new MigrationAutomation();
  
  (async () => {
    try {
      const result = await migrator.migrateFromV1_3_2();

      if (result.success) {
        console.log('\n🎉 AI-IMMUNITY v1.4 indexing is ready!');
        console.log(`📊 ${result.propheciesMigrated} prophecies migrated`);
        console.log(`✅ Validation: ${result.validation ? 'PASSED' : 'FAILED'}`);
        console.log(`📦 Backup: ${result.backupCreated ? 'CREATED' : 'N/A'}`);
        console.log('\n💡 Try: bun semantic:hunt "your query here"');
      } else {
        console.error('❌ Migration failed');
        process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Migration error: ${error.message}`);
      process.exit(1);
    }
  })();
}

