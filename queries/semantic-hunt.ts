#!/usr/bin/env bun
/**
 * Semantic Hunt - Grok-Powered Fuzzy Query Engine (v1.4)
 * 
 * CLI command: bun semantic:hunt --query="deprecated hoisted configs" --threshold=0.9
 * 
 * Performs semantic similarity searches using Grok embeddings for fuzzy matching.
 */

import { GrokEmbedder } from '../scripts/grok-embedder';
import { validateThreshold } from '../macros/validate-threshold';

interface SemanticEntry {
  file: string;
  tag: string;
  embedding: number[];
  score: number;
  line?: number;
  linker?: string;
  automation?: string;
  context?: string;
}

interface SearchResult {
  file: string;
  tag: string;
  similarity: number;
  score: number;
  line?: number;
  linker?: string;
  automation?: string;
  context?: string;
}

// Use deterministic GrokEmbedder for consistent results
const embedder = new GrokEmbedder();

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
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
 * Load semantic index
 */
async function loadSemanticIndex(): Promise<SemanticEntry[]> {
  let semanticPath = '.ai-immunity.semantic';
  
  // Try to load from config
  try {
    const config = await Bun.file('bun.yaml').yaml();
    semanticPath = config['ai-immunity']?.indexing?.semantic?.index?.['semantic-path'] || semanticPath;
  } catch {
    // Use default
  }
  
  if (!(await Bun.file(semanticPath).exists())) {
    throw new Error(`Semantic index not found: ${semanticPath}. Run "bun index:ai-immunity" first.`);
  }
  
  const content = await Bun.file(semanticPath).text();
  return JSON.parse(content);
}

/**
 * Perform semantic hunt
 */
export async function semanticHunt(query: string, threshold: number = 0.85, topK: number = 10): Promise<SearchResult[]> {
  const semanticIndex = await loadSemanticIndex();
  const queryEmbedding = await embedder.embed(query, { cache: true });
  
  const results: SearchResult[] = semanticIndex
    .map((entry: SemanticEntry) => ({
      file: entry.file,
      tag: entry.tag,
      similarity: embedder.cosineSimilarity(queryEmbedding, entry.embedding),
      score: entry.score,
      line: entry.line,
      linker: entry.linker,
      automation: entry.automation,
      context: entry.context,
    }))
    .filter(r => r.similarity > threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
  
  return results;
}

// CLI entry point
if (import.meta.main) {
  const args = Bun.argv.slice(2);
  const queryArg = args.find(arg => arg.startsWith('--query='));
  const thresholdArg = args.find(arg => arg.startsWith('--threshold='));
  
  // Support both --query=... and positional query argument
  let query = queryArg ? queryArg.split('=')[1] : undefined;
  if (!query) {
    // Find first non-flag argument as query
    query = args.find(arg => !arg.startsWith('--')) || 'immunity';
  }
  
  const thresholdValue = thresholdArg ? thresholdArg.split('=')[1] : '0.85';
  
  // Use enhanced validator with auto-correction
  let threshold: number;
  try {
    const validation = validateThreshold(thresholdValue);
    threshold = validation.value;
    
    if (validation.warning) {
      console.warn(validation.warning);
    }
  } catch (error) {
    console.error(error.message);
    console.error(`💡 Example: bun semantic:hunt "query" --threshold=0.7`);
    process.exit(1);
  }
  
  (async () => {
    try {
      const results = await semanticHunt(query, threshold);
      
      if (results.length === 0) {
        console.log(`⚠️  No matches found for "${query}" (threshold: ${threshold})`);
        return;
      }
      
      console.log(`🔍 Semantic hunt results for: "${query}" (threshold: ${threshold})`);
      console.log('');
      
      for (const result of results) {
        const lineInfo = result.line ? `:${result.line}` : '';
        const linkerInfo = result.linker ? ` [${result.linker}-${result.automation}]` : '';
        console.log(`${result.file}${lineInfo}:${result.tag}${linkerInfo}`);
        console.log(`   Similarity: ${(result.similarity * 100).toFixed(1)}% | Score: ${result.score}`);
        if (result.context) {
          console.log(`   Context: ${result.context.substring(0, 80)}...`);
        }
        console.log('');
      }
    } catch (error) {
      console.error(`❌ Semantic hunt failed: ${error.message}`);
      process.exit(1);
    }
  })();
}

export { loadSemanticIndex };

