/**
 * Performance Validation Script - Native Bun API Implementation
 * 
 * Validates performance tags in markdown files against bun.yaml schema
 * Uses native Bun.file().yaml() API with js-yaml fallback
 * Simplified single-pass validation with early returns
 */

import { glob } from 'bun';

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
 * Validate performance tags in markdown files
 * Single-pass validation with early returns
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
        errors.push(`❌ ${file}: Domain '${domain}' invalid. Must be one of: ${schema.domain.join(', ')}`);
        fileValid = false;
        continue;
      }

      // Validate state (early return on error)
      if (!schema.state.includes(state)) {
        errors.push(`❌ ${file}: State '${state}' invalid. Must be one of: ${schema.state.join(', ')}`);
        fileValid = false;
        continue;
      }

      // Validate time pattern (early return on error)
      if (!time.match(schema.time.pattern)) {
        errors.push(`❌ ${file}: Time '${time}' invalid. Must match pattern: ${schema.time.pattern}`);
        fileValid = false;
        continue;
      }

      // Extract and validate memory (if present)
      const memMatch = content.match(/\[MEM:(\d+\.?\d*\s*(MB|GB|KB))\]/);
      if (memMatch) {
        const mem = memMatch[1];
        // Strict validation: space + unit required
        if (!mem.match(schema.memory.pattern)) {
          errors.push(`❌ ${file}: Memory '${mem}' invalid. Must match pattern: ${schema.memory.pattern} (space before unit required)`);
          fileValid = false;
          continue;
        }
      }

      // Validate grepable tag pattern
      const grepTag = `[perf-${domain.toLowerCase()}-${scope.toLowerCase()}-${state.toLowerCase()}-${time.toLowerCase()}-mem-${(memMatch?.[1] || '0.0mb').toLowerCase().replace(/\s+/g, '-')}]`;
      if (!grepTag.match(config.perf.visualization.grep.patterns.all-tags)) {
        errors.push(`❌ ${file}: Grep tag '${grepTag}' doesn't match pattern`);
        fileValid = false;
        continue;
      }
    }

    if (fileValid) {
      valid++;
    }
  }

  // Report results
  if (errors.length > 0) {
    console.error('Validation failed:\n');
    console.error(errors.join('\n'));
    process.exit(1);
  }

  console.log(`🎉 All ${valid} perf metrics valid & grep-ready!`);
}

// Run validation
validatePerf().catch(error => {
  console.error('❌ Validation error:', error);
  process.exit(1);
});

