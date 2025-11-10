/**
 * Bunfig Validator - Native Bun API (v3.2)
 * 
 * Validates bunfig.toml against YAML schema
 * Checks types, enums, patterns, and conditionals
 * Generates grepable error logs
 * Uses native Bun.file().yaml() API - requires Bun 1.3.0+
 */

async function validateBunfig() {
  const args = Bun.argv.slice(2);
  const strict = args.includes('--strict');
  
  try {
    // Load config and schema
    const configContent = await Bun.file('bunfig.toml').text();
    const config = Bun.TOML.parse(configContent);
    
    let schema;
    try {
      // Native Bun .yaml() API - no library dependencies
      schema = await Bun.file('bunfig.schema.yaml').yaml();
    } catch (error) {
      console.warn(`⚠️  bunfig.schema.yaml not found or invalid: ${error.message}`);
      return;
    }
    
    const errors = [];
    let validSections = 0;
    
    // Validate each section
    for (const [sectionName, sectionSchema] of Object.entries(schema)) {
      const sectionConfig = config[sectionName];
      
      if (!sectionConfig) {
        // Section not present - check if required
        const hasRequired = Object.values(sectionSchema).some(rule => rule.required);
        if (hasRequired && strict) {
          errors.push(`❌ Missing required section: [${sectionName}]`);
        }
        continue;
      }
      
      // Validate each key in section
      for (const [key, rule] of Object.entries(sectionSchema)) {
        if (key === 'required') continue; // Skip meta keys
        
        const value = sectionConfig[key];
        
        // Required check
        if (rule.required && value === undefined) {
          errors.push(`❌ Missing required key: [${sectionName}].${key}`);
          continue;
        }
        
        if (value === undefined) continue;
        
        // Type check
        if (rule.type === 'boolean' && typeof value !== 'boolean') {
          errors.push(`❌ Invalid type for [${sectionName}].${key}: expected boolean, got ${typeof value}`);
        }
        if (rule.type === 'integer' && !Number.isInteger(value)) {
          errors.push(`❌ Invalid integer for [${sectionName}].${key}: ${value}`);
        }
        if (rule.type === 'string' && typeof value !== 'string') {
          errors.push(`❌ Invalid type for [${sectionName}].${key}: expected string, got ${typeof value}`);
        }
        if (rule.type === 'array' && !Array.isArray(value)) {
          errors.push(`❌ Invalid type for [${sectionName}].${key}: expected array, got ${typeof value}`);
        }
        
        // Enum check
        if (rule.enum && !rule.enum.includes(value)) {
          errors.push(`❌ Invalid value for [${sectionName}].${key}: ${value}. Allowed: ${rule.enum.join(', ')}`);
        }
        
        // Pattern check
        if (rule.pattern && typeof value === 'string' && !new RegExp(rule.pattern).test(value)) {
          errors.push(`❌ Invalid pattern for [${sectionName}].${key}: ${value}`);
        }
        
        // Min/Max check
        if (rule.min !== undefined && value < rule.min) {
          errors.push(`❌ Value too small for [${sectionName}].${key}: ${value} < ${rule.min}`);
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(`❌ Value too large for [${sectionName}].${key}: ${value} > ${rule.max}`);
        }
        
        // Conditional check
        if (rule.condition) {
          const parent = sectionConfig[rule.condition.key];
          if (parent !== rule.condition.value) {
            errors.push(`❌ Invalid conditional: [${sectionName}].${key} requires ${rule.condition.key} = ${rule.condition.value}`);
          }
        }
      }
      
      if (errors.length === 0 || !errors.some(e => e.includes(`[${sectionName}]`))) {
        validSections++;
      }
    }
    
    if (errors.length) {
      console.error('❌ Bunfig validation failed:\n' + errors.join('\n'));
      process.exit(1);
    }
    
    console.log(`✅ Config validation complete:`);
    console.log(`   Sections: ${validSections}`);
    console.log(`🎉 All configs valid & grep-ready!`);
    
  } catch (error) {
    console.error(`❌ Validation failed: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  validateBunfig();
}

export { validateBunfig };

