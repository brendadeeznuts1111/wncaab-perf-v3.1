/**
 * Rules Validate Script - Native Bun API Implementation
 * 
 * Validates all rules (perf, macro, etc.) against bun.yaml schema
 * Uses native Bun.file().yaml() API - requires Bun 1.3.0+
 */

import { loadConfig } from './rules-config.js';
import { glob } from 'bun';

/**
 * Validate all rules (perf, macro, bunfig, etc.)
 */
async function validateAllRules() {
  const config = await loadConfig();
  const errors = [];
  let validCount = 0;

  // Validate bunfig.toml if it exists
  try {
    const { validateBunfig } = await import('./validate-bunfig.js');
    await validateBunfig();
    console.log('✅ Bunfig validation passed');
  } catch (error) {
    errors.push(`❌ Bunfig validation failed: ${error.message}`);
  }

  // Validate perf rules if perf section exists
  if (config.perf?.visualization) {
    try {
      // Check if perf directory exists
      const perfDir = Bun.file('./perf');
      const perfDirExists = await perfDir.exists().catch(() => false);
      
      if (!perfDirExists) {
        console.log('ℹ️  Perf directory not found, skipping perf validation');
      } else {
        // Note: validatePerf is async but doesn't export, so we'll inline the logic
        const perfFiles = await glob(['**/*.md'], { cwd: './perf', absolute: true }).catch(() => []);
      
      for (const file of perfFiles) {
        const content = await Bun.file(file).text();
        const perfMatches = content.match(/\[PERF:([A-Z-]+)-([A-Z-]+)-([idle|proc])-(\d+\.\d+(ms|s)?)\]/g);
        
        if (perfMatches) {
          const { schema } = config.perf.visualization;
          
          for (const match of perfMatches) {
            const matchResult = match.match(/\[PERF:([A-Z-]+)-([A-Z-]+)-([idle|proc])-(\d+\.\d+(ms|s)?)\]/);
            if (!matchResult) continue;

            const [, domain, scope, state, time] = matchResult;

            if (!schema.domain.includes(domain)) {
              errors.push(`❌ ${file}: Domain '${domain}' invalid`);
              continue;
            }

            if (!schema.state.includes(state)) {
              errors.push(`❌ ${file}: State '${state}' invalid`);
              continue;
            }

            if (!time.match(schema.time.pattern)) {
              errors.push(`❌ ${file}: Time '${time}' invalid`);
              continue;
            }

            const memMatch = content.match(/\[MEM:(\d+\.?\d*\s*(MB|GB|KB))\]/);
            if (memMatch && !memMatch[1].match(schema.memory.pattern)) {
              errors.push(`❌ ${file}: Memory '${memMatch[1]}' invalid`);
              continue;
            }
          }
          
          if (errors.length === 0) {
            validCount++;
          }
        }
      }
      }
    } catch (error) {
      errors.push(`❌ Perf validation error: ${error.message}`);
    }
  }

  // Validate macro rules if wncaab.macro section exists
  if (config.wncaab?.macro) {
    try {
      // Check if macros directory exists
      const macroDir = Bun.file('./macros');
      const macroDirExists = await macroDir.exists().catch(() => false);
      
      if (!macroDirExists) {
        console.log('ℹ️  Macros directory not found, skipping macro validation');
      } else {
        const macroFiles = await glob(['**/*.md'], { cwd: './macros', absolute: true }).catch(() => []);
      
      for (const file of macroFiles) {
        const content = await Bun.file(file).text();
        const macroMatches = content.match(/\[MACRO\]\[([A-Z]+)\]\[([A-Z]*)\]\[([A-Z]{3}-[A-Z0-9-]+)\]\[([vV][0-9]+\.[0-9]+)\]\[([A-Z]+)\]/g);
        
        if (macroMatches) {
          const { schema } = config.wncaab.macro;
          
          for (const match of macroMatches) {
            const matchResult = match.match(/\[MACRO\]\[([A-Z]+)\]\[([A-Z]*)\]\[([A-Z]{3}-[A-Z0-9-]+)\]\[([vV][0-9]+\.[0-9]+)\]\[([A-Z]+)\]/);
            if (!matchResult) continue;

            const [, type, variant, id, version, status] = matchResult;

            if (!schema.type.includes(type)) {
              errors.push(`❌ ${file}: Type '${type}' invalid`);
              continue;
            }

            if (schema.id?.pattern && !id.match(schema.id.pattern)) {
              errors.push(`❌ ${file}: ID '${id}' invalid`);
              continue;
            }

            if (schema.version?.semver && !version.match(schema.version.semver)) {
              errors.push(`❌ ${file}: Version '${version}' invalid`);
              continue;
            }

            if (!schema.status.includes(status)) {
              errors.push(`❌ ${file}: Status '${status}' invalid`);
              continue;
            }
          }
          
          if (errors.length === 0) {
            validCount++;
          }
        }
      }
      }
    } catch (error) {
      errors.push(`❌ Macro validation error: ${error.message}`);
    }
  }

  // Report results
  if (errors.length > 0) {
    console.error('❌ Validation failed:\n');
    console.error(errors.join('\n'));
    process.exit(1);
  }

  console.log(`🎉 All ${validCount} rules valid & grep-ready!`);
}

// CLI entry point
if (import.meta.main) {
  validateAllRules().catch(error => {
    console.error('❌ Validation error:', error);
    process.exit(1);
  });
}

export { validateAllRules };

