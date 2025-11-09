/**
 * Immunity Tag Generator - Native Bun API (v3.2)
 * 
 * Generates immunity tags for Bun v1.3.2 breaking changes
 * Creates readable + grepable tags for linker/auto-install protection
 */

import { file } from 'bun';

const schema = {
  linker: ['hoisted', 'isolated'],
  auto: ['auto', 'disable', 'force', 'fallback'],
};

function generateImmunityTag(params = {}) {
  const {
    linker = 'hoisted',
    auto = 'disable',
  } = params;

  // Schema sentinel
  if (!schema.linker.includes(linker)) {
    throw new Error(`❌ Linker invalid: ${linker}. Allowed: ${schema.linker.join(', ')}`);
  }
  if (!schema.auto.includes(auto)) {
    throw new Error(`❌ Auto invalid: ${auto}. Allowed: ${schema.auto.join(', ')}`);
  }

  const readable = `[IMMUNITY:${linker}-${auto}]`;
  const grepable = `immunity-${linker.toLowerCase()}-${auto.toLowerCase()}`;

  return `${readable} # Grepable: ${grepable}`;
}

// CLI entry point
if (import.meta.main) {
  const args = Bun.argv.slice(2);
  const params = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--linker=')) {
      params.linker = arg.split('=')[1];
    } else if (arg.startsWith('--auto=')) {
      params.auto = arg.split('=')[1];
    } else if (arg === '--linker' && i + 1 < args.length) {
      params.linker = args[++i];
    } else if (arg === '--auto' && i + 1 < args.length) {
      params.auto = args[++i];
    }
  }

  try {
    console.log(generateImmunityTag(params));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

export { generateImmunityTag };

