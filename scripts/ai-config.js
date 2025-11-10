/**
 * AI Config Loader - Loads and validates bun-ai.toml
 */

async function loadAiConfig() {
  try {
    // Try APPENDIX/bun-ai.toml first, then bun-ai.toml in current dir
    let configPath = 'APPENDIX/bun-ai.toml';
    if (!(await Bun.file(configPath).exists())) {
      configPath = 'bun-ai.toml';
    }
    
    const configContent = await Bun.file(configPath).text();
    const config = Bun.TOML.parse(configContent);
    
    console.log(`✅ AI Config loaded from: ${configPath}`);
    console.log(`   Grok endpoint: ${config.ai?.grokEndpoint || 'not set'}`);
    console.log(`   Predict drift: ${config.ai?.predictDrift || 0.99}`);
    console.log(`   Auto heal: ${config.ai?.autoHeal || false}`);
    
    return config;
  } catch (error) {
    console.error(`❌ Failed to load AI config: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  loadAiConfig();
}

export { loadAiConfig };

