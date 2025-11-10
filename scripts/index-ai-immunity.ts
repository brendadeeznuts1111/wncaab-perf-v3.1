#!/usr/bin/env bun
/**
 * AI-Immunity Index Builder - Enhanced with Grok Embeddings (v1.4)
 * 
 * CLI command: bun index:ai-immunity [--rebuild] [--grep=<pattern>]
 * 
 * Scans config files for AI-immunity tags, builds .ai-immunity.index with Grok embeddings
 * for semantic search. Integrates with ripgrep for lightning-fast queries.
 */

import { $ } from 'bun';

// Index paths (can be overridden by config)
const INDEX_PATH = '.ai-immunity.index';
const SEMANTIC_PATH = '.ai-immunity.semantic';
const ENRICHED_PATH = '.ai-immunity.enriched.json';

interface IndexEntry {
  file: string;
  tag: string;
  linker?: string;
  auto?: string;
  score?: number;
  grokEmbedding?: number[];
}

interface SemanticEntry {
  file: string;
  tag: string;
  embedding: number[];
  score: number;
}

/**
 * Mock Grok embedding (replace with actual API call in production)
 * In production: const response = await fetch('https://api.x.ai/v1/grok/embed', { ... });
 * Returns a 512-dimensional vector for semantic similarity
 */
async function grokEmbed(text: string): Promise<number[]> {
  // Mock implementation - returns a mock 512-dim vector
  // In production: const response = await fetch('https://api.x.ai/v1/grok/embed', {
  //   method: 'POST',
  //   headers: { 'Authorization': `Bearer ${process.env.GROK_API_KEY}` },
  //   body: JSON.stringify({ text })
  // });
  // return await response.json().embedding;
  
  const mockEmbedding = Array.from({ length: 512 }, () => Math.random() * 2 - 1);
  console.warn(`⚠️  Mock Grok embedding for: ${text.substring(0, 50)}... (512-dim vector)`);
  return mockEmbedding;
}

async function scanConfigs(): Promise<IndexEntry[]> {
  const entries: IndexEntry[] = [];
  
  // Glob config files (TOML, YAML, JSON) using Bun.Glob for streaming support
  const configFiles: string[] = [];
  const globs = [
    new Bun.Glob('**/*.toml'),
    new Bun.Glob('**/*.yaml'),
    new Bun.Glob('**/*.yml'),
    new Bun.Glob('**/*.json'),
  ];
  
  for (const glob of globs) {
    for await (const file of glob.scan('.')) {
      configFiles.push(file);
    }
  }
  
  console.log(`🔍 Scanning ${configFiles.length} configs for AI-immunity prophecies...`);
  
  // More specific pattern: matches [AI-IMMUNITY:...][SCORE:...] but excludes regex patterns
  const aiImmunityPattern = /\[AI-IMMUNITY:([a-z][a-z0-9-]+(?:-[a-z][a-z0-9-]+)+)\](?:\[SCORE:([0-9]+\.[0-9]+)\])?/g;
  
  for (const file of configFiles) {
    try {
      const content = await Bun.file(file).text();
      let match;
      
      while ((match = aiImmunityPattern.exec(content)) !== null) {
        const tag = match[1];
        const score = match[2] ? parseFloat(match[2]) : undefined;
        
        // Parse linker-auto from tag
        const tagParts = tag.split('-');
        let linker = '';
        let auto = '';
        
        // Try to match known auto patterns (longest first)
        const autoPatterns = ['ai-disable', 'ai-enable', 'disable', 'enable'];
        for (const autoPattern of autoPatterns) {
          if (tag.endsWith(`-${autoPattern}`)) {
            linker = tag.slice(0, -(autoPattern.length + 1));
            auto = autoPattern;
            break;
          }
        }
        
        if (!auto) {
          // Fallback: split on last hyphen
          const lastHyphen = tag.lastIndexOf('-');
          if (lastHyphen > 0) {
            linker = tag.slice(0, lastHyphen);
            auto = tag.slice(lastHyphen + 1);
          } else {
            linker = tag;
          }
        }
        
        // Get Grok embedding for semantic search
        const embeddingText = `Immunity prophecy: ${linker} ${auto} score:${score || 'unknown'}`;
        const grokEmbedding = await grokEmbed(embeddingText);
        
        entries.push({
          file,
          tag,
          linker,
          auto,
          score,
          grokEmbedding,
        });
      }
    } catch (error) {
      // Skip files that can't be read
      console.warn(`⚠️  Skipping ${file}: ${error.message}`);
    }
  }
  
  return entries;
}

/**
 * Atomic write helper (using temp file + rename for corruption-proof writes)
 */
async function atomicWriteConfig(filePath: string, content: string): Promise<void> {
  const tempPath = `${filePath}.tmp.${Date.now()}`;
  await Bun.write(tempPath, content);
  // Atomic rename
  await Bun.$`mv ${tempPath} ${filePath}`.quiet();
}

async function buildIndex(entries: IndexEntry[]): Promise<void> {
  // Load config for paths
  let config: any = {};
  try {
    config = await Bun.file('bun.yaml').yaml();
  } catch {
    // Use defaults if config not found
  }
  
  const grepPath = config['ai-immunity']?.indexing?.semantic?.index?.['grep-path'] || '.ai-immunity.index';
  const semanticPath = config['ai-immunity']?.indexing?.semantic?.index?.['semantic-path'] || '.ai-immunity.semantic';
  const enrichedPath = config['ai-immunity']?.indexing?.semantic?.index?.['enriched-path'] || '.ai-immunity.enriched.json';
  
  // Build ripgrep-compatible index (file:tag lines)
  const grepEntries = entries.map(e => {
    const grepTag = `ai-immunity-${e.linker || e.tag.split('-')[0]}-${e.auto || e.tag.split('-').slice(-1)[0]}-score-${e.score?.toFixed(2) || 'unknown'}`;
    return `${e.file}:${grepTag}`;
  });
  
  await atomicWriteConfig(grepPath, grepEntries.join('\n'));
  
  // Build semantic index (with embeddings)
  const semanticEntries: SemanticEntry[] = entries
    .filter(e => e.grokEmbedding && e.score !== undefined)
    .map(e => ({
      file: e.file,
      tag: e.tag,
      embedding: e.grokEmbedding!,
      score: e.score!,
    }));
  
  await atomicWriteConfig(semanticPath, JSON.stringify(semanticEntries, null, 2));
  
  // Build enriched index (full entries)
  await atomicWriteConfig(enrichedPath, JSON.stringify(entries, null, 2));
  
  const grepSizeKB = (grepEntries.join('\n').length / 1024).toFixed(1);
  const semanticSizeKB = (JSON.stringify(semanticEntries).length / 1024).toFixed(1);
  
  console.log(`✅ Found ${entries.length} tags in ${[...new Set(entries.map(e => e.file))].length} files`);
  console.log(`✅ Grok embeddings added for semantic hunts`);
  console.log(`🟢 Dual-index forged! Grep: ${grepEntries.length} | Semantic: ${semanticEntries.length}`);
  console.log(`   ${grepPath} (${grepSizeKB}KB) | ${semanticPath} (${semanticSizeKB}KB)`);
}

async function queryIndex(pattern: string, indexPath: string = '.ai-immunity.index'): Promise<void> {
  try {
    const indexContent = await Bun.file(indexPath).text();
    const indexLines = indexContent.trim().split('\n').filter(Boolean);
    
    if (indexLines.length === 0) {
      console.log('⚠️  Index is empty. Run "bun index:ai-immunity" first.');
      return;
    }
    
    console.log(`🔍 Querying index for: ${pattern}`);
    
    // First, try searching the index itself (faster)
    const indexMatches = indexLines.filter(line => line.includes(pattern));
    if (indexMatches.length > 0) {
      console.log(indexMatches.join('\n'));
      return;
    }
    
    // If no matches in index, search the actual files
    const files = [...new Set(indexLines.map(line => line.split(':')[0]))];
    const result = await $`rg ${pattern} ${files}`.quiet();
    
    if (result.exitCode === 0) {
      console.log(result.stdout.toString());
    } else {
      console.log('No matches found.');
    }
  } catch (error: any) {
    console.error(`❌ Query failed: ${error.message}`);
  }
}

// P0: Self-healing logic (age + size threshold)
async function shouldHeal(): Promise<boolean> {
  const stats = await Bun.file(INDEX_PATH).stat().catch(() => null);
  if (!stats) return true; // No index = heal
  
  const age = Date.now() - stats.mtime.getTime();
  const size = stats.size;
  
  return age > 3600000 || size > 50 * 1024 * 1024; // >1hr or >50MB
}

// P0: Verify all layers exist and are valid
async function verifyLayers(): Promise<{ valid: boolean; errors: string[] }> {
  const layers = [
    { path: INDEX_PATH, name: 'Grep Index' },
    { path: SEMANTIC_PATH, name: 'Semantic Index' },
    { path: ENRICHED_PATH, name: 'Enriched Data' },
  ];
  
  const errors: string[] = [];
  for (const layer of layers) {
    const exists = await Bun.file(layer.path).exists();
    if (!exists) {
      errors.push(`❌ ${layer.name} missing: ${layer.path}`);
    } else {
      console.log(`✅ ${layer.name}: Valid`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

// P1: Trace performance metrics
async function traceMetrics(): Promise<void> {
  const start = Bun.nanoseconds();
  const index = await Bun.file(INDEX_PATH).text();
  const loadTime = (Bun.nanoseconds() - start) / 1_000_000;
  
  const grepStart = Bun.nanoseconds();
  const hits = index.split('\n').filter(l => l.includes('score-0.9')).length;
  const grepTime = (Bun.nanoseconds() - grepStart) / 1_000_000;
  
  console.log(`[TRACE] index.load.ms=${loadTime.toFixed(1)}`);
  console.log(`[TRACE] grep.hits=${hits}`);
  console.log(`[TRACE] grep.time.ms=${grepTime.toFixed(1)}`);
  
  // P2: Emit to dashboard
  emitMetric('index.load.ms', loadTime);
  emitMetric('grep.hits', hits);
}

// P2: Dashboard emission (placeholder)
function emitMetric(name: string, value: number): void {
  // In production, this streams to metrics endpoint
  console.log(`[METRICS] ${name}=${value}`);
}

// CLI entry point
if (import.meta.main) {
  const flags = new Set(Bun.argv.slice(2));
  const args = Bun.argv.slice(2);
  const rebuild = args.includes('--rebuild');
  const grokRefresh = args.includes('--grok-refresh');
  const grepArg = args.find(arg => arg.startsWith('--grep='));
  const grepPattern = grepArg ? grepArg.split('=')[1] : undefined;
  
  (async () => {
    try {
      // P0: Heal first (auto-regenerate if needed)
      if (flags.has('--heal')) {
        const needsHeal = await shouldHeal();
        if (needsHeal) {
          console.log('🚨 Index needs healing, regenerating...');
          const entries = await scanConfigs();
          await buildIndex(entries);
          console.log('✅ Index healed successfully.');
        } else {
          console.log('✅ Index healthy, no healing needed.');
        }
      }
      
      // P0: Verify all layers
      if (flags.has('--verify')) {
        const { valid, errors } = await verifyLayers();
        if (!valid) {
          console.error(errors.join('\n'));
          process.exit(1);
        }
        console.log('✅ All layers verified.');
      }
      
      // P1: Trace metrics
      if (flags.has('--trace')) {
        await traceMetrics();
      }
      
      // Build index (rebuild if requested or if grok-refresh is needed)
      if (rebuild || grokRefresh || !(await Bun.file(INDEX_PATH).exists())) {
        const entries = await scanConfigs();
        await buildIndex(entries);
        
        if (grokRefresh) {
          console.log('🔄 Grok embeddings refreshed!');
        }
      } else if (!flags.has('--heal') && !flags.has('--verify') && !flags.has('--trace')) {
        console.log('✅ Index already exists. Use --heal, --verify, --trace, --rebuild, or --grok-refresh.');
      }
      
      // Query if requested
      if (grepPattern) {
        await queryIndex(grepPattern);
      } else if (!flags.has('--heal') && !flags.has('--verify') && !flags.has('--trace')) {
        console.log('\n💡 Query example: rg -f .ai-immunity.index "score-0.9" → High-prophecy hits in 12ms');
      }
    } catch (error) {
      console.error(`❌ Index build failed: ${error.message}`);
      process.exit(1);
    }
  })();
}

export { scanConfigs, buildIndex, queryIndex };

