/**
 * Obsidian Templater Integration - AI Immunity Tag Generator
 * 
 * Usage in Obsidian Templater:
 * <% tp.user.ai_immunity_tag() %>
 * 
 * Or with parameters:
 * <% tp.user.ai_immunity_tag({ linker: "ai-hoisted", auto: "ai-disable" }) %>
 */

module.exports = async function ai_immunity_tag(tp, params = {}) {
  try {
    // Import the AI immunity generator
    const { generateAiImmunityTag } = await import('../templates/ai-immunity-gen.js');
    
    // If no params provided, prompt user
    if (!params.linker || !params.auto) {
      const linker = await tp.system.suggestion(
        'Select linker type',
        ['ai-hoisted', 'ai-isolated', 'hoisted', 'isolated'],
        'ai-hoisted'
      );
      
      const auto = await tp.system.suggestion(
        'Select auto-install',
        ['ai-disable', 'ai-enable', 'disable', 'enable'],
        'ai-disable'
      );
      
      params = { linker, auto };
    }
    
    // Generate AI immunity tag
    const immunityTag = await generateAiImmunityTag(params);
    return immunityTag;
    
  } catch (error) {
    return `❌ AI-Immunity Error: ${error.message}`;
  }
};

