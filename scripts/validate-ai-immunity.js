/**
 * AI Immunity Validator - Grok-Powered (v1.4 Prototype)
 * 
 * Validates AI-scored immunity tags with Grok healing
 * NOTE: This is a prototype/concept - requires actual Grok API integration
 */

import { glob } from 'bun';

const schema = {
  linker: ['ai-hoisted', 'ai-isolated', 'hoisted', 'isolated'],
  auto: ['ai-disable', 'ai-enable', 'disable', 'enable'],
};

/**
 * Mock Grok prediction (replace with actual API call)
 */
async function grokPredict(prompt) {
  // Mock implementation
  // In production: const response = await fetch('https://api.x.ai/v1/grok', { ... });
  console.warn(`⚠️  Mock Grok prediction for: ${prompt}`);
  return `Healed: ${prompt}`;
}

async function validateAiImmunity() {
  const args = Bun.argv.slice(2);
  const strict = args.includes('--strict');
  
  try {
    const configContent = await Bun.file('bun-ai.toml').text();
    
    // Find all AI-immunity tags
    const immunityMatches = configContent.match(/\[AI-IMMUNITY:([a-z-]+)-([a-z-]+)\]\[SCORE:([0-9.]+)\]/g);
    
    if (!immunityMatches || immunityMatches.length === 0) {
      console.log('ℹ️  No AI-immunity tags found in bun-ai.toml');
      return;
    }

    const errors = [];
    let valid = 0;
    const healed = [];

    for (const match of immunityMatches) {
      // Match format: [AI-IMMUNITY:linker-auto][SCORE:0.97]
      // Try to match known linker/auto patterns
      const tagMatch = match.match(/\[AI-IMMUNITY:(.+?)\]\[SCORE:([0-9.]+)\]/);
      if (!tagMatch) continue;

      const [, linkerAuto, scoreStr] = tagMatch;
      const aiScore = parseFloat(scoreStr);

      // Split linker-auto by trying known auto patterns first
      let linker = linkerAuto;
      let auto = '';
      
      // Try to match known auto values (longest first)
      const autoPatterns = ['ai-disable', 'ai-enable', 'disable', 'enable'];
      for (const autoPattern of autoPatterns) {
        if (linkerAuto.endsWith(`-${autoPattern}`)) {
          linker = linkerAuto.slice(0, -(autoPattern.length + 1));
          auto = autoPattern;
          break;
        }
      }

      if (!auto) {
        // Fallback: split on last hyphen
        const lastHyphen = linkerAuto.lastIndexOf('-');
        if (lastHyphen > 0) {
          linker = linkerAuto.slice(0, lastHyphen);
          auto = linkerAuto.slice(lastHyphen + 1);
        } else {
          errors.push(`❌ Cannot parse linker-auto from ${match}`);
          continue;
        }
      }

      // Validate linker
      if (!schema.linker.includes(linker)) {
        errors.push(`❌ Invalid linker in ${match}: ${linker}. Allowed: ${schema.linker.join(', ')}`);
      }

      // Validate auto
      if (!schema.auto.includes(auto)) {
        errors.push(`❌ Invalid auto in ${match}: ${auto}. Allowed: ${schema.auto.join(', ')}`);
      }

      // Validate AI score threshold
      if (aiScore < 0.85) {
        const healedConfig = await grokPredict(`Heal immunity for ${linker}-${auto}`);
        healed.push(`⚠️  Low AI score (${aiScore}) for ${match} - ${healedConfig}`);
        if (strict) {
          errors.push(`❌ Low AI score: ${aiScore} < 0.85 for ${match}`);
        }
      }

      // Validate grep tag format
      const grepTag = `ai-immunity-${linker.toLowerCase()}-${auto.toLowerCase()}-score-${aiScore.toFixed(2)}`;
      if (!grepTag.match(/^ai-immunity-[a-z-]+-[a-z-]+-score-[0-9.]+$/)) {
        errors.push(`❌ Invalid grep tag format: ${match}`);
      }

      if (errors.length === 0 || !errors.some(e => e.includes(match))) {
        valid++;
      }
    }

    if (healed.length > 0) {
      console.log('🔮 AI Healing Suggestions:');
      healed.forEach(h => console.log(`   ${h}`));
    }

    if (errors.length) {
      console.error('❌ AI-Immunity validation failed:\n' + errors.join('\n'));
      process.exit(1);
    }

    console.log(`✅ AI-Immunity validation complete:`);
    console.log(`   Tags: ${valid}`);
    if (healed.length > 0) {
      console.log(`   Healed: ${healed.length}`);
    }
    console.log(`🎉 All AI-immunity configs valid, healed & grep-ready!`);

  } catch (error) {
    console.error(`❌ Validation failed: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  validateAiImmunity();
}

export { validateAiImmunity, grokPredict };

