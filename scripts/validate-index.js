#!/usr/bin/env bun
/**
 * Index Validator - Semantic Sentinel + Heal Sim (v1.4)
 * 
 * CLI command: bun audit:index
 * 
 * Validates AI-immunity indexes, checks embedding drift, and auto-heals if configured.
 */

/**
 * Mock Grok embedding (replace with actual API call in production)
 */
async function grokEmbed(text) {
  // Mock implementation
  const mockEmbedding = Array.from({ length: 512 }, () => Math.random() * 2 - 1);
  return mockEmbedding;
}

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Load config
 */
async function loadConfig() {
  try {
    return await Bun.file('bun.yaml').yaml();
  } catch {
    return {};
  }
}

/**
 * Atomic write helper
 */
async function atomicWriteConfig(filePath, content) {
  const tempPath = `${filePath}.tmp.${Date.now()}`;
  await Bun.write(tempPath, content);
  await Bun.$`mv ${tempPath} ${filePath}`.quiet();
}

/**
 * Rebuild index (import from index-ai-immunity.ts logic)
 */
async function rebuildIndex() {
  console.log('🔄 Rebuilding indexes...');
  const { scanConfigs, buildIndex } = await import('../scripts/index-ai-immunity.ts');
  const entries = await scanConfigs();
  await buildIndex(entries);
}

async function validateIndex() {
  const config = await loadConfig();
  const semanticPath = config['ai-immunity']?.indexing?.semantic?.index?.['semantic-path'] || '.ai-immunity.semantic';
  const driftThreshold = config['ai-immunity']?.indexing?.validate?.['drift-threshold'] || 0.95;
  const autoHeal = config['ai-immunity']?.indexing?.validate?.['auto-heal'] !== false;
  
  if (!(await Bun.file(semanticPath).exists())) {
    console.error(`❌ Semantic index not found: ${semanticPath}. Run "bun index:ai-immunity" first.`);
    process.exit(1);
  }
  
  const semanticIndex = JSON.parse(await Bun.file(semanticPath).text());
  let valid = 0;
  const drifts = [];
  const healed = [];
  
  console.log(`🔍 Validating ${semanticIndex.length} embeddings...`);
  
  for (const entry of semanticIndex) {
    // Check score threshold
    if (entry.score < 0.85) {
      drifts.push(`Low score drift: ${entry.tag} (${entry.score})`);
    }
    
    // Check embedding drift (re-embed and compare)
    const reEmbedText = `Re-validate: ${entry.tag}`;
    const reEmbed = await grokEmbed(reEmbedText);
    const similarity = cosineSimilarity(entry.embedding, reEmbed);
    
    if (similarity < driftThreshold) {
      drifts.push(`Embedding drift: ${entry.file}:${entry.tag} (sim: ${similarity.toFixed(2)} < ${driftThreshold})`);
      
      if (autoHeal) {
        // Auto-heal: update embedding
        entry.embedding = reEmbed;
        healed.push(`${entry.file}:${entry.tag}`);
      }
    }
    
    if (!drifts.some(d => d.includes(entry.tag))) {
      valid++;
    }
  }
  
  if (healed.length > 0) {
    console.log(`🔮 Auto-healed ${healed.length} embeddings:`);
    healed.forEach(h => console.log(`   ${h}`));
    
    // Write healed index
    await atomicWriteConfig(semanticPath, JSON.stringify(semanticIndex, null, 2));
  }
  
  if (drifts.length > 0 && !autoHeal) {
    console.error('❌ Index validation failed:');
    drifts.forEach(d => console.error(`   ${d}`));
    console.error('\n💡 Run with auto-heal enabled or rebuild: bun index:ai-immunity --rebuild');
    process.exit(1);
  }
  
  if (drifts.length === 0) {
    console.log(`🎉 All ${valid} embeddings validated & hunt-ready!`);
  } else {
    console.log(`✅ Validated ${valid} embeddings, healed ${healed.length} drifts`);
  }
}

if (import.meta.main) {
  validateIndex().catch(error => {
    console.error(`❌ Validation failed: ${error.message}`);
    process.exit(1);
  });
}

export { validateIndex, cosineSimilarity };

