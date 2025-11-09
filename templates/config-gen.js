/**
 * Config Generator - Native Bun API Implementation (v3.2)
 * 
 * Generates dual-format config sections (readable + grepable)
 * Uses native Bun.file() API for TOML config parsing
 * Supports CLI dual format: --section=value AND --section value
 */

function generateConfigSection(params = {}) {
  const {
    section = 'install',
    key = 'registry',
    value = '"https://registry.npmjs.org"'
  } = params;

  // Schema sentinel - valid sections
  const validSections = ['debug', 'run', 'test', 'install', 'preload', 'jsx', 'telemetry'];
  if (!validSections.includes(section)) {
    throw new Error(`❌ Section invalid: ${section}. Valid: ${validSections.join(', ')}`);
  }

  // Generate readable config section
  const readable = `[${section}]\n${key} = ${value}`;
  
  // Generate grepable tag
  const grepable = `config-${section.toLowerCase()}-${key.toLowerCase()}-${value.toLowerCase().replace(/["']/g, '').replace(/[^a-zA-Z0-9]/g, '-')}`;

  return readable + ' # Grepable: ' + grepable;
}

/**
 * Generate complete config section for documentation
 */
function generateConfigSectionFull(params = {}) {
  const result = generateConfigSection(params);
  return result;
}

// CLI: bun run templates/config-gen.js --section install --key registry --value '"https://registry.npmjs.org"'
if (import.meta.main) {
  const params = {};
  const args = Bun.argv.slice(2);
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      if (value !== undefined) {
        params[key] = value.replace(/^["']|["']$/g, '');
      } else if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        params[key] = args[++i].replace(/^["']|["']$/g, '');
      }
    }
  }
  
  console.log(generateConfigSectionFull(params));
}

export { generateConfigSection, generateConfigSectionFull };

