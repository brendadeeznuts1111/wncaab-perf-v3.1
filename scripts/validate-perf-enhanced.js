/**
 * Enhanced Validation Script with Bun.color and Bun.semver
 * 
 * Demonstrates advanced Bun API usage:
 * - Bun.color for terminal-aware console output
 * - Bun.semver for proper version validation
 */

import { glob } from 'bun';

// Color utilities using native Bun.color API
const colors = {
  error: Bun.color.red,
  success: Bun.color.green,
  warning: Bun.color.yellow,
  info: Bun.color.cyan,
  dim: Bun.color.gray,
  bold: (text) => Bun.color.bold(text)
};

/**
 * Load config with native .yaml() API and fallback
 */
async function loadConfig() {
  try {
    // Primary: Native Bun .yaml() API (Bun 1.3.0+)
    return await Bun.file('bun.yaml').yaml();
  } catch (error) {
    // Fallback: js-yaml for Bun <1.3.0
    // DEPRECATED: Remove in Bun 2.0 when <1.3.0 support dropped
    const yaml = await import('js-yaml');
    const yamlContent = await Bun.file('bun.yaml').text();
    return yaml.load(yamlContent);
  }
}

/**
 * Validate semantic version using Bun.semver API
 */
function validateSemver(version, pattern) {
  try {
    // Remove 'v' prefix if present
    const cleanVersion = version.replace(/^[vV]/, '');
    const parsed = Bun.semver.parse(cleanVersion);
    
    if (!parsed) {
      return false;
    }
    
    // Check if version satisfies pattern (e.g., "^1.0.0")
    if (pattern && !Bun.semver.satisfies(parsed, pattern)) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate performance tags in markdown files
 * Single-pass validation with early returns
 * Enhanced with Bun.color and Bun.semver
 */
async function validatePerf() {
  const config = await loadConfig();
  const { schema } = config.perf.visualization;
  const files = await glob(['**/*.md'], { cwd: './perf', absolute: true });

  let valid = 0;
  const errors = [];

  for (const file of files) {
    const content = await Bun.file(file).text();
    const perfMatches = content.match(/\[PERF:([A-Z-]+)-([A-Z-]+)-([idle|proc])-(\d+\.\d+(ms|s)?)\]/g);
    
    // Skip files without perf tags
    if (!perfMatches) continue;

    let fileValid = true;

    for (const match of perfMatches) {
      const matchResult = match.match(/\[PERF:([A-Z-]+)-([A-Z-]+)-([idle|proc])-(\d+\.\d+(ms|s)?)\]/);
      if (!matchResult) continue;

      const [, domain, scope, state, time] = matchResult;

      // Validate domain (early return on error)
      if (!schema.domain.includes(domain)) {
        errors.push(colors.error(`❌ ${file}: Domain '${domain}' invalid. Must be one of: ${schema.domain.join(', ')}`));
        fileValid = false;
        continue;
      }

      // Validate state (early return on error)
      if (!schema.state.includes(state)) {
        errors.push(colors.error(`❌ ${file}: State '${state}' invalid. Must be one of: ${schema.state.join(', ')}`));
        fileValid = false;
        continue;
      }

      // Validate time pattern (early return on error)
      if (!time.match(schema.time.pattern)) {
        errors.push(colors.error(`❌ ${file}: Time '${time}' invalid. Must match pattern: ${schema.time.pattern}`));
        fileValid = false;
        continue;
      }

      // Extract and validate memory (if present)
      const memMatch = content.match(/\[MEM:(\d+\.?\d*\s*(MB|GB|KB))\]/);
      if (memMatch) {
        const mem = memMatch[1];
        // Strict validation: space + unit required
        if (!mem.match(schema.memory.pattern)) {
          errors.push(colors.error(`❌ ${file}: Memory '${mem}' invalid. Must match pattern: ${schema.memory.pattern} (space before unit required)`));
          fileValid = false;
          continue;
        }
      }

      // Validate grepable tag pattern
      const grepTag = `[perf-${domain.toLowerCase()}-${scope.toLowerCase()}-${state.toLowerCase()}-${time.toLowerCase()}-mem-${(memMatch?.[1] || '0.0mb').toLowerCase().replace(/\s+/g, '-')}]`;
      if (!grepTag.match(config.perf.visualization.grep.patterns.all-tags)) {
        errors.push(colors.error(`❌ ${file}: Grep tag '${grepTag}' doesn't match pattern`));
        fileValid = false;
        continue;
      }
    }

    if (fileValid) {
      valid++;
    }
  }

  // Report results with colored output
  if (errors.length > 0) {
    console.error(colors.bold(colors.error('Validation failed:\n')));
    console.error(errors.join('\n'));
    process.exit(1);
  }

  console.log(colors.success(`🎉 All ${valid} perf metrics valid & grep-ready!`));
}

// Run validation
validatePerf().catch(error => {
  console.error(colors.error(`❌ Validation error: ${error.message}`));
  process.exit(1);
});

// Export for other scripts
export { validatePerf, validateSemver, colors };

