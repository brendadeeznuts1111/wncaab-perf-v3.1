/**
 * Performance Tag Generator - Native Bun API Implementation
 * 
 * Generates dual-tag performance metrics (readable + grepable)
 * Uses native Bun.file().yaml() API with js-yaml fallback for Bun <1.3.0
 * Supports CLI dual format: --key=value AND --key value
 */

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
 * Parse CLI arguments supporting dual format:
 * --key=value AND --key value
 * Also handles boolean flags (no value)
 */
function parseArgs() {
  const args = Bun.argv.slice(2);
  const params = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    // Format: --key=value
    if (arg.includes('=')) {
      const [key, ...valueParts] = arg.split('=');
      const value = valueParts.join('='); // Handle values with = in them
      params[key.replace(/^--/, '')] = value;
    }
    // Format: --key value (next arg is value)
    else if (arg.startsWith('--') && i + 1 < args.length && !args[i + 1].startsWith('--')) {
      const key = arg.replace(/^--/, '');
      params[key] = args[i + 1];
      i++; // Skip next arg as it's the value
    }
    // Format: --flag (boolean flag, no value)
    else if (arg.startsWith('--')) {
      const key = arg.replace(/^--/, '');
      params[key] = true;
    }
  }

  return params;
}

/**
 * Generate performance tag with schema validation
 */
async function generatePerfTag(params = {}) {
  const config = await loadConfig();
  const schema = config.perf.visualization.schema;
  const defaults = config.perf.visualization.defaults;

  const {
    domain = defaults.domain,
    scope = '',
    state = defaults.state,
    time = '0.0ms',
    memory = '0.0MB'
  } = params;

  // Schema sentinel - validate domain
  if (!schema.domain.includes(domain)) {
    throw new Error(`❌ Domain invalid: ${domain}. Must be one of: ${schema.domain.join(', ')}`);
  }

  // Validate state
  if (!schema.state.includes(state)) {
    throw new Error(`❌ State invalid: ${state}. Must be one of: ${schema.state.join(', ')}`);
  }

  // Validate time pattern
  if (!time.match(schema.time.pattern)) {
    throw new Error(`❌ Time invalid: ${time}. Must match pattern: ${schema.time.pattern}`);
  }

  // Validate memory pattern (strict: space + unit required)
  if (!memory.match(schema.memory.pattern)) {
    throw new Error(`❌ Memory invalid: ${memory}. Must match pattern: ${schema.memory.pattern} (space before unit required)`);
  }

  // Generate readable tag (uppercase)
  const readable = `[PERF:${domain}-${scope}-${state}-${time}] [MEM:${memory}]`;
  
  // Generate grepable tag (lowercase-hyphen)
  const grepable = `[perf-${domain.toLowerCase()}-${scope.toLowerCase()}-${state.toLowerCase()}-${time.toLowerCase()}-mem-${memory.toLowerCase().replace(/\s+/g, '-')}]`;

  return readable + ' # Grepable: ' + grepable;
}

// CLI entry point
if (import.meta.main) {
  try {
    const params = parseArgs();
    const tag = await generatePerfTag(params);
    console.log(tag);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

// Export for Templater/other scripts
export { generatePerfTag, loadConfig };

