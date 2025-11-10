#!/usr/bin/env bun
/**
 * Enhanced Semantic Hunter - Class-Based Implementation (v1.4)
 * 
 * CLI command: bun semantic:hunt --query="deprecated hoisted configs" --threshold=0.9
 * 
 * Class-based semantic search engine with advanced filtering and grep integration.
 */

import { GrokEmbedder } from '../scripts/grok-embedder';
import { $ } from 'bun';

export interface SemanticEntry {
  file: string;
  tag: string;
  embedding: number[];
  score: number;
  line?: number;
  linker?: string;
  automation?: string;
  context?: string;
  timestamp?: number;
}

export interface HuntResult {
  file: string;
  line: number;
  tag: string;
  similarity: number;
  score: number;
  context?: string;
  linker: string;
  automation: string;
}

export interface HuntOptions {
  threshold?: number;
  limit?: number;
  minScore?: number;
  maxScore?: number;
  linkers?: string[];
  automations?: string[];
}

export class SemanticHunter {
  private embedder: GrokEmbedder;
  private semanticIndex: SemanticEntry[] = [];

  constructor() {
    this.embedder = new GrokEmbedder();
  }

  async initialize(): Promise<void> {
    // Load semantic index
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
    
    const content = await Bun.file(semanticPath).text();
    this.semanticIndex = JSON.parse(content);
  }

  async hunt(query: string, options: HuntOptions = {}): Promise<HuntResult[]> {
    const {
      threshold = 0.85,
      limit = 10,
      minScore = 0,
      maxScore = 1,
      linkers = [],
      automations = []
    } = options;

    const queryEmbedding = await this.embedder.embed(query, { cache: true });
    const results: HuntResult[] = [];

    // Calculate similarity for each entry
    for (const entry of this.semanticIndex) {
      // Apply filters
      if (entry.score < minScore || entry.score > maxScore) continue;
      if (linkers.length > 0 && entry.linker && !linkers.includes(entry.linker)) continue;
      if (automations.length > 0 && entry.automation && !automations.includes(entry.automation)) continue;

      const similarity = this.embedder.cosineSimilarity(queryEmbedding, entry.embedding);

      if (similarity >= threshold) {
        results.push({
          file: entry.file,
          line: entry.line || 0,
          tag: entry.tag,
          similarity,
          score: entry.score,
          context: entry.context,
          linker: entry.linker || 'unknown',
          automation: entry.automation || 'unknown'
        });
      }
    }

    // Sort by similarity (highest first) and apply limit
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  async hybridHunt(query: string, grepPattern?: string): Promise<HuntResult[]> {
    // Combine semantic and grep-based searching
    const semanticResults = await this.hunt(query);

    if (!grepPattern) return semanticResults;

    // Augment with grep results
    const grepResults = await this.grepHunt(grepPattern);

    // Merge and deduplicate
    const merged = [...semanticResults];
    const seen = new Set(semanticResults.map(r => `${r.file}:${r.line}`));

    for (const result of grepResults) {
      const key = `${result.file}:${result.line}`;
      if (!seen.has(key)) {
        merged.push(result);
        seen.add(key);
      }
    }

    return merged.slice(0, 10); // Return top 10 overall
  }

  private async grepHunt(pattern: string): Promise<HuntResult[]> {
    // Use ripgrep via Bun.spawn for fast text search
    try {
      const proc = Bun.spawn(['rg', '-n', pattern, '--type', 'toml', '--type', 'js', '--type', 'ts'], {
        cwd: '.',
        stdout: 'pipe',
        stderr: 'pipe'
      });
      
      const output = await new Response(proc.stdout).text();
      const lines = output.split('\n').filter(line => line.trim());

      return lines.map(line => {
        const [file, lineNum, ...rest] = line.split(':');
        const content = rest.join(':');

        // Extract prophecy info from matched line
        const match = content.match(/\[AI-IMMUNITY:([a-z0-9_-]+)-([a-z0-9_-]+)\]\[SCORE:([0-9.]+)\]/);
        if (!match) return null;

        const [_, linker, auto, score] = match;

        return {
          file,
          line: parseInt(lineNum) || 0,
          tag: `${linker}-${auto}-score-${score}`,
          similarity: 0.5, // Default similarity for grep results
          score: parseFloat(score),
          linker: linker || 'unknown',
          automation: auto || 'unknown',
          context: content
        };
      }).filter((r): r is HuntResult => r !== null);
    } catch {
      return [];
    }
  }
}

// CLI interface (backward compatible with existing semantic-hunt.ts)
if (import.meta.main) {
  const hunter = new SemanticHunter();
  
  (async () => {
    try {
      await hunter.initialize();

      const args = Bun.argv.slice(2);
      const queryArg = args.find(arg => arg.startsWith('--query='));
      const thresholdArg = args.find(arg => arg.startsWith('--threshold='));
      const limitArg = args.find(arg => arg.startsWith('--limit='));
      const minScoreArg = args.find(arg => arg.startsWith('--min-score='));
      const maxScoreArg = args.find(arg => arg.startsWith('--max-score='));

      // Support both --query=... and positional query argument
      let query = queryArg ? queryArg.split('=')[1] : undefined;
      if (!query) {
        query = args.find(arg => !arg.startsWith('--')) || 'immunity';
      }

      const threshold = thresholdArg ? parseFloat(thresholdArg.split('=')[1]) : 0.85;
      const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 10;
      const minScore = minScoreArg ? parseFloat(minScoreArg.split('=')[1]) : 0;
      const maxScore = maxScoreArg ? parseFloat(maxScoreArg.split('=')[1]) : 1;

      const results = await hunter.hunt(query, {
        threshold,
        limit,
        minScore,
        maxScore
      });

      // Format output for CLI
      if (results.length === 0) {
        console.log(`⚠️  No matches found for "${query}" (threshold: ${threshold})`);
        return;
      }

      console.log(`🎯 Semantic Hunt Results for: "${query}"`);
      console.log(`📊 Found ${results.length} matches (threshold: ${threshold})`);
      console.log('');

      results.forEach((result, index) => {
        const lineInfo = result.line ? `:${result.line}` : '';
        const linkerInfo = result.linker !== 'unknown' ? ` [${result.linker}-${result.automation}]` : '';
        console.log(`${index + 1}. ${result.file}${lineInfo}`);
        console.log(`   Tag: ${result.tag}${linkerInfo}`);
        console.log(`   Similarity: ${(result.similarity * 100).toFixed(1)}% | Score: ${result.score}`);
        if (result.context) {
          console.log(`   Context: ${result.context.substring(0, 80)}...`);
        }
        console.log('');
      });
    } catch (error) {
      console.error(`❌ Semantic hunt failed: ${error.message}`);
      process.exit(1);
    }
  })();
}


