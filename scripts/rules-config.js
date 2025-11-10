/**
 * Rules Config Script - Native Bun API Implementation
 * 
 * Loads and validates bun.yaml schema
 * Uses native Bun.file().yaml() API - requires Bun 1.3.0+
 */

/**
 * Load config using Bun's native .yaml() API
 * Requires Bun 1.3.0+ - no library dependencies
 */
async function loadConfig() {
  // Native Bun .yaml() API - no library dependencies
    return await Bun.file('bun.yaml').yaml();
}

/**
 * Validate bun.yaml schema structure
 */
async function validateConfig() {
  try {
    const config = await loadConfig();

    // Validate required structure
    if (!config.perf) {
      throw new Error('❌ Missing "perf" section in bun.yaml');
    }

    if (!config.perf.visualization) {
      throw new Error('❌ Missing "perf.visualization" section in bun.yaml');
    }

    if (!config.perf.visualization.schema) {
      throw new Error('❌ Missing "perf.visualization.schema" section in bun.yaml');
    }

    const { schema } = config.perf.visualization;

    // Validate schema structure
    if (!Array.isArray(schema.domain)) {
      throw new Error('❌ schema.domain must be an array');
    }

    if (!Array.isArray(schema.state)) {
      throw new Error('❌ schema.state must be an array');
    }

    if (!schema.time?.pattern) {
      throw new Error('❌ schema.time.pattern is required');
    }

    if (!schema.memory?.pattern) {
      throw new Error('❌ schema.memory.pattern is required');
    }

    // Validate memory pattern is strict (space + unit required)
    if (!schema.memory.pattern.includes(' (MB|GB|KB)')) {
      console.warn('⚠️  Memory pattern should require space before unit: ^\\d+\\.?\\d* (MB|GB|KB)$');
    }

    console.log('✅ bun.yaml schema is valid');
    console.log(`   Domains: ${schema.domain.join(', ')}`);
    console.log(`   States: ${schema.state.join(', ')}`);
    console.log(`   Time pattern: ${schema.time.pattern}`);
    console.log(`   Memory pattern: ${schema.memory.pattern}`);

    return config;
  } catch (error) {
    console.error('❌ Config validation failed:', error.message);
    process.exit(1);
  }
}

// CLI entry point
if (import.meta.main) {
  validateConfig();
}

// Export for other scripts
export { loadConfig, validateConfig };

