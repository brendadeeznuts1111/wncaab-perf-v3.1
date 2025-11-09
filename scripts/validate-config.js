/**
 * Config Validator - Native Bun API (v3.2)
 * 
 * Validates bunfig.toml configuration
 * Checks section validity, key patterns, and grep tags
 */

async function validateConfig() {
  const args = Bun.argv.slice(2);
  const strict = args.includes('--strict');
  
  const validSections = ['debug', 'run', 'test', 'install', 'preload', 'jsx', 'telemetry', 'remote'];
  const errors = [];
  let valid = 0;
  
  try {
    const configContent = await Bun.file('bunfig.toml').text();
    
    // Find all sections
    const sectionMatches = configContent.match(/\[(\w+)\]/g);
    if (!sectionMatches) {
      if (strict) {
        console.error('❌ No sections found in bunfig.toml');
        process.exit(1);
      }
      return console.log('No sections found');
    }
    
    // Validate each section
    for (const match of sectionMatches) {
      const section = match.match(/\[(\w+)\]/)[1];
      
      if (!validSections.includes(section)) {
        errors.push(`❌ Invalid section: [${section}]. Valid: ${validSections.join(', ')}`);
      }
      
      // Generate grep tag
      const grepTag = `config-${section.toLowerCase()}-bunfig-toml`;
      if (!grepTag.match(/^config-/)) {
        errors.push(`❌ Grep tag validation failed: ${grepTag}`);
      }
      
      valid++;
    }
    
    // Check for common config patterns
    if (configContent.includes('[install]')) {
      const registryMatch = configContent.match(/\[install\]\s*\n[^\[]*registry\s*=\s*"(.*?)"/s);
      if (registryMatch) {
        const registry = registryMatch[1];
        try {
          new URL(registry);
        } catch {
          errors.push(`❌ Invalid registry URL: ${registry}`);
        }
      }
    }
    
    if (errors.length) {
      const criticalErrors = errors.filter(e => e.startsWith('❌'));
      if (criticalErrors.length > 0 || strict) {
        console.error(errors.join('\n'));
        process.exit(1);
      } else {
        console.warn(errors.join('\n'));
      }
    }
    
    console.log(`✅ Config validation complete:`);
    console.log(`   Sections: ${valid}`);
    console.log(`   Valid sections: ${validSections.join(', ')}`);
    console.log(`🎉 All configs valid & grep-ready!`);
    
  } catch (error) {
    console.error(`❌ Validation failed: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  validateConfig();
}

export { validateConfig };

