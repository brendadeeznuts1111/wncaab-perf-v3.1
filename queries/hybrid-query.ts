#!/usr/bin/env bun
/**
 * Hybrid Query - Grep + Semantic Fusion (v1.4)
 * 
 * CLI command: bun hybrid:query "high entropy immunity"
 * 
 * Combines ripgrep exact matches with semantic fuzzy search for hybrid results.
 */

import { $ } from 'bun';
import { GrokEmbedder } from '../scripts/grok-embedder';

// Use deterministic GrokEmbedder for consistent results
const embedder = new GrokEmbedder();

/**
 * Load semantic index
 */
async function loadSemanticIndex() {
  let semanticPath = '.ai-immunity.semantic';
  
  try {
    const config = await Bun.file('bun.yaml').yaml();
    semanticPath = config['ai-immunity']?.indexing?.semantic?.index?.['semantic-path'] || semanticPath;
  } catch {
    // Use default
  }
  
  if (!(await Bun.file(semanticPath).exists())) {
    throw new Error(`Semantic index not found: ${semanticPath}. Run "bun index:ai-immunity" first.`);
  }
  
  return JSON.parse(await Bun.file(semanticPath).text());
}

/**
 * Load grep index
 */
async function loadGrepIndex() {
  let grepPath = '.ai-immunity.index';
  
  try {
    const config = await Bun.file('bun.yaml').yaml();
    grepPath = config['ai-immunity']?.indexing?.semantic?.index?.['grep-path'] || grepPath;
  } catch {
    // Use default
  }
  
  if (!(await Bun.file(grepPath).exists())) {
    throw new Error(`Grep index not found: ${grepPath}. Run "bun index:ai-immunity" first.`);
  }
  
  const content = await Bun.file(grepPath).text();
  return content.trim().split('\n').filter(Boolean);
}

// Use embedder.cosineSimilarity instead of local function

/**
 * Hybrid query: grep + semantic fusion
 */
async function hybridQuery(query: string, threshold: number = 0.85, grepPattern?: string) {
  // 1. Exact grep matches (use grepPattern if provided, otherwise use query)
  const grepFiles = await loadGrepIndex();
  let grepResults: string[] = [];
  const searchPattern = grepPattern || query;
  
  if (grepFiles.length > 0) {
    try {
      // Extract unique file paths from grep index (format: file:line:tag or file:tag)
      const filePathPromises = grepFiles.map(async (f) => {
        const parts = f.split(':');
        let filePath = parts[0]; // Get file path
        
        // Resolve relative paths - check if file exists, if not try APPENDIX/ prefix
        if (!(await Bun.file(filePath).exists())) {
          const altPath = `APPENDIX/${filePath}`;
          if (await Bun.file(altPath).exists()) {
            return altPath;
          }
        }
        
        return filePath;
      });
      
      const resolvedPaths = await Promise.all(filePathPromises);
      const filePaths = [...new Set(resolvedPaths.filter(Boolean))];
      
      if (filePaths.length > 0) {
        // Use ripgrep to search for the pattern in the files
        const result = await $`rg -n ${searchPattern} ${filePaths}`.quiet();
        if (result.exitCode === 0) {
          grepResults = result.stdout.toString().trim().split('\n').filter(Boolean);
        }
      }
    } catch (error) {
      // No grep matches or error - continue with semantic search
    }
  }
  
  // 2. Semantic fuzzy matches
  const semanticIndex = await loadSemanticIndex();
  const queryEmbedding = await embedder.embed(query, { cache: true });
  
  const semanticResults = semanticIndex
    .map((entry: any) => ({
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
    .slice(0, 10);
  
  // 3. Merge and deduplicate
  const exactMatches = new Set(grepResults);
  const fuzzyMatches = semanticResults.map(r => `${r.file}:${r.tag}`);
  
  console.log(`🔍 Hybrid query results for: "${query}"`);
  console.log('');
  
  if (exactMatches.size > 0) {
    console.log('📌 Exact matches (grep):');
    exactMatches.forEach(match => console.log(`   ${match}`));
    console.log('');
  }
  
  if (semanticResults.length > 0) {
    console.log('🔮 Semantic matches (fuzzy):');
    semanticResults.forEach(r => {
      const lineInfo = r.line ? `:${r.line}` : '';
      const linkerInfo = r.linker ? ` [${r.linker}-${r.automation}]` : '';
      console.log(`   ${r.file}${lineInfo}:${r.tag}${linkerInfo}`);
      console.log(`      Similarity: ${(r.similarity * 100).toFixed(1)}% | Score: ${r.score}`);
      if (r.context) {
        console.log(`      Context: ${r.context.substring(0, 60)}...`);
      }
    });
  }
  
  if (exactMatches.size === 0 && semanticResults.length === 0) {
    console.log(`⚠️  No matches found for "${query}"`);
  }
  
  return {
    exact: Array.from(exactMatches),
    semantic: semanticResults,
  };
}

// CLI entry point
if (import.meta.main) {
  const args = Bun.argv.slice(2);
  const queryArg = args.find(arg => arg.startsWith('--query='));
  const grepArg = args.find(arg => arg.startsWith('--grep='));
  const thresholdArg = args.find(arg => arg.startsWith('--threshold='));
  const refresh = args.includes('--refresh');
  
  // Support both --query=... and positional query argument
  let query = queryArg ? queryArg.split('=')[1] : undefined;
  if (!query) {
    // Find first non-flag argument as query
    query = args.find(arg => !arg.startsWith('--')) || 'immunity';
  }
  
  const grepPattern = grepArg ? grepArg.split('=')[1] : undefined;
  const threshold = thresholdArg ? parseFloat(thresholdArg.split('=')[1]) : 0.85;
  
  (async () => {
    try {
      // Refresh index if requested
      if (refresh) {
        console.log('🔄 Refreshing index...');
        const { AIImmunityIndexer } = await import('../scripts/index-ai-immunity-enhanced');
        const indexer = new AIImmunityIndexer();
        await indexer.buildDualIndex();
        console.log('✅ Index refreshed!\n');
      }
      
      await hybridQuery(query, threshold, grepPattern);
    } catch (error) {
      console.error(`❌ Hybrid query failed: ${error.message}`);
      process.exit(1);
    }
  })();
}

export { hybridQuery };

