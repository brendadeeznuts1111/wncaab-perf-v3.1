/**
 * Immunity Validator - Native Bun API (v3.2)
 * 
 * Validates immunity tags in bunfig.toml
 * Checks linker/auto values against schema
 * Generates grepable error logs
 */

import { glob } from 'bun';

const schema = {
  linker: ['hoisted', 'isolated'],
  auto: ['auto', 'disable', 'force', 'fallback'],
};

async function validateImmunity() {
  const args = Bun.argv.slice(2);
  const strict = args.includes('--strict');
  
  try {
    const configContent = await Bun.file('bunfig.toml').text();
    
    // Find all immunity tags
    const immunityMatches = configContent.match(/\[IMMUNITY:([a-z-]+)-([a-z-]+)\]/g);
    
    if (!immunityMatches || immunityMatches.length === 0) {
      console.log('ℹ️  No immunity tags found in bunfig.toml');
      return;
    }

    const errors = [];
    let valid = 0;

    for (const match of immunityMatches) {
      const matchResult = match.match(/\[IMMUNITY:([a-z-]+)-([a-z-]+)\]/);
      if (!matchResult) continue;

      const [, linker, auto] = matchResult;

      // Validate linker
      if (!schema.linker.includes(linker)) {
        errors.push(`❌ Invalid linker in ${match}: ${linker}. Allowed: ${schema.linker.join(', ')}`);
      }

      // Validate auto
      if (!schema.auto.includes(auto)) {
        errors.push(`❌ Invalid auto in ${match}: ${auto}. Allowed: ${schema.auto.join(', ')}`);
      }

      // Validate grep tag format
      const grepTag = `immunity-${linker.toLowerCase()}-${auto.toLowerCase()}`;
      if (!grepTag.match(/^immunity-[a-z-]+-[a-z-]+$/)) {
        errors.push(`❌ Invalid grep tag format: ${match}`);
      }

      if (errors.length === 0 || !errors.some(e => e.includes(match))) {
        valid++;
      }
    }

    if (errors.length) {
      console.error('❌ Immunity validation failed:\n' + errors.join('\n'));
      process.exit(1);
    }

    console.log(`✅ Immunity validation complete:`);
    console.log(`   Tags: ${valid}`);
    console.log(`🎉 All immunity configs valid & grep-ready!`);

  } catch (error) {
    console.error(`❌ Validation failed: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  validateImmunity();
}

export { validateImmunity };

