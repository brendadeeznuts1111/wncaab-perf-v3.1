/**
 * Enhanced Rules Validate Script with Bun.semver
 * 
 * Uses Bun.semver API for proper semantic version validation
 * Replaces regex pattern matching with native semver parsing
 */

import { loadConfig } from './rules-config.js';
import { glob } from 'bun';
import { validateSemver, colors } from './validate-perf-enhanced.js';

/**
 * Validate semantic version using Bun.semver API
 */
function validateVersion(version, pattern) {
  try {
    // Remove 'v' prefix if present
    const cleanVersion = version.replace(/^[vV]/, '');
    const parsed = Bun.semver.parse(cleanVersion);
    
    if (!parsed) {
      return { valid: false, reason: 'Invalid semver format' };
    }
    
    // Check if version satisfies pattern (e.g., "^1.0.0")
    if (pattern && !Bun.semver.satisfies(parsed, pattern)) {
      return { valid: false, reason: `Does not satisfy pattern: ${pattern}` };
    }
    
    return { valid: true, parsed };
  } catch (error) {
    return { valid: false, reason: error.message };
  }
}

/**
 * Validate all rules (perf, macro, etc.)
 * Enhanced with Bun.semver for version validation
 */
async function validateAllRules() {
  const config = await loadConfig();
  const errors = [];
  let validCount = 0;

  // Validate perf rules if perf section exists
  if (config.perf?.visualization) {
    try {
      const perfFiles = await glob(['**/*.md'], { cwd: './perf', absolute: true });
      
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
              errors.push(colors.error(`❌ ${file}: Domain '${domain}' invalid`));
              continue;
            }

            if (!schema.state.includes(state)) {
              errors.push(colors.error(`❌ ${file}: State '${state}' invalid`));
              continue;
            }

            if (!time.match(schema.time.pattern)) {
              errors.push(colors.error(`❌ ${file}: Time '${time}' invalid`));
              continue;
            }

            const memMatch = content.match(/\[MEM:(\d+\.?\d*\s*(MB|GB|KB))\]/);
            if (memMatch && !memMatch[1].match(schema.memory.pattern)) {
              errors.push(colors.error(`❌ ${file}: Memory '${memMatch[1]}' invalid`));
              continue;
            }
          }
          
          if (errors.length === 0) {
            validCount++;
          }
        }
      }
    } catch (error) {
      errors.push(colors.error(`❌ Perf validation error: ${error.message}`));
    }
  }

  // Validate macro rules if wncaab.macro section exists
  if (config.wncaab?.macro) {
    try {
      const macroFiles = await glob(['**/*.md'], { cwd: './macros', absolute: true });
      
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
              errors.push(colors.error(`❌ ${file}: Type '${type}' invalid`));
              continue;
            }

            if (schema.id?.pattern && !id.match(schema.id.pattern)) {
              errors.push(colors.error(`❌ ${file}: ID '${id}' invalid`));
              continue;
            }

            // ✅ Enhanced: Use Bun.semver instead of regex
            if (schema.version?.semver) {
              const versionCheck = validateVersion(version, schema.version.semver);
              if (!versionCheck.valid) {
                errors.push(colors.error(`❌ ${file}: Version '${version}' invalid - ${versionCheck.reason}`));
                continue;
              }
            }

            if (!schema.status.includes(status)) {
              errors.push(colors.error(`❌ ${file}: Status '${status}' invalid`));
              continue;
            }
          }
          
          if (errors.length === 0) {
            validCount++;
          }
        }
      }
    } catch (error) {
      errors.push(colors.error(`❌ Macro validation error: ${error.message}`));
    }
  }

  // Report results with colored output
  if (errors.length > 0) {
    console.error(colors.bold(colors.error('❌ Validation failed:\n')));
    console.error(errors.join('\n'));
    process.exit(1);
  }

  console.log(colors.success(`🎉 All ${validCount} rules valid & grep-ready!`));
}

// CLI entry point
if (import.meta.main) {
  validateAllRules().catch(error => {
    console.error(colors.error(`❌ Validation error: ${error.message}`));
    process.exit(1);
  });
}

export { validateAllRules, validateVersion };

