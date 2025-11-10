#!/usr/bin/env bun
/**
 * AI-Immunity Indexer - Enhanced Class-Based Implementation (v1.4)
 * 
 * CLI command: bun index:ai-immunity [--rebuild] [--grok-refresh] [--grep=<pattern>]
 * 
 * Class-based dual-index builder with Grok embeddings, line numbers, and context extraction.
 */

import { GrokEmbedder } from './grok-embedder';
import { AtomicFile } from './atomic-file';

export interface IndexEntry {
  file: string;
  tag: string;
  linker?: string;
  auto?: string;
  score?: number;
  grokEmbedding?: number[];
  line?: number;
  context?: string;
}

export interface SemanticEntry {
  file: string;
  line: number;
  tag: string;
  linker: string;
  automation: string;
  score: number;
  embedding: number[];
  context: string;
  timestamp: number;
}

export interface IndexStats {
  prophecyCount: number;
  buildTime: number;
  files: number;
  grepEntries: number;
  semanticEntries: number;
}

export class AIImmunityIndexer {
  private embedder: GrokEmbedder;
  private atomic: AtomicFile;

  constructor() {
    this.embedder = new GrokEmbedder();
    this.atomic = new AtomicFile();
  }

  async buildDualIndex(): Promise<IndexStats> {
    const startTime = performance.now();

    // Glob all config files
    const configFiles: string[] = [];
    const globs = [
      new Bun.Glob('**/*.toml'),
      new Bun.Glob('**/*.js'),
      new Bun.Glob('**/*.ts'),
      new Bun.Glob('**/*.yaml'),
      new Bun.Glob('**/*.yml'),
      new Bun.Glob('**/*.json'),
    ];

    for (const glob of globs) {
      for await (const file of glob.scan('.')) {
        // Skip node_modules and .git
        if (!file.includes('node_modules') && !file.includes('.git')) {
          configFiles.push(file);
        }
      }
    }

    console.log(`🔍 Found ${configFiles.length} config files for indexing`);

    const grepIndex: string[] = [];
    const semanticIndex: SemanticEntry[] = [];
    let prophecyCount = 0;

    // Process each file for AI-IMMUNITY prophecies
    for (const file of configFiles) {
      const { grepEntries, semanticEntries } = await this.processFile(file);
      grepIndex.push(...grepEntries);
      semanticIndex.push(...semanticEntries);
      prophecyCount += grepEntries.length;
    }

    // Load config for paths
    let config: any = {};
    try {
      config = await Bun.file('bun.yaml').yaml();
    } catch {
      // Use defaults
    }

    const grepPath = config['ai-immunity']?.indexing?.semantic?.index?.['grep-path'] || '.ai-immunity.index';
    const semanticPath = config['ai-immunity']?.indexing?.semantic?.index?.['semantic-path'] || '.ai-immunity.semantic';
    const enrichedPath = config['ai-immunity']?.indexing?.semantic?.index?.['enriched-path'] || '.ai-immunity.enriched.json';

    // Write dual-index atomically
    await this.atomic.write(grepPath, grepIndex.join('\n'));
    await this.atomic.writeJSON(semanticPath, semanticIndex);
    
    // Also write enriched index
    const enrichedEntries: IndexEntry[] = semanticIndex.map(e => ({
      file: e.file,
      tag: e.tag,
      linker: e.linker,
      auto: e.automation,
      score: e.score,
      grokEmbedding: e.embedding,
      line: e.line,
      context: e.context,
    }));
    await this.atomic.writeJSON(enrichedPath, enrichedEntries);

    const buildTime = performance.now() - startTime;

    console.log('🎯 Dual-index forged!', {
      prophecies: prophecyCount,
      files: configFiles.length,
      grepEntries: grepIndex.length,
      semanticEntries: semanticIndex.length,
      buildTime: `${buildTime.toFixed(1)}ms`,
      speed: `${(prophecyCount / buildTime * 1000).toFixed(1)} prophecies/sec`
    });

    return {
      prophecyCount,
      buildTime,
      files: configFiles.length,
      grepEntries: grepIndex.length,
      semanticEntries: semanticIndex.length,
    };
  }

  private async processFile(file: string): Promise<{ grepEntries: string[]; semanticEntries: SemanticEntry[] }> {
    const content = await Bun.file(file).text();
    const grepEntries: string[] = [];
    const semanticEntries: SemanticEntry[] = [];

    // Match AI-IMMUNITY prophecies with enhanced pattern
    const prophecyPattern = /\[AI-IMMUNITY:([a-z0-9_-]+)-([a-z0-9_-]+)\]\[SCORE:([0-9.]+)\]/g;
    const matches = Array.from(content.matchAll(prophecyPattern));

    for (const match of matches) {
      const [fullMatch, linker, auto, score] = match;
      const tag = `${linker}-${auto}-score-${score}`;
      const lineNumber = this.getLineNumber(content, match.index!);

      // Grep entry (file:line:tag)
      grepEntries.push(`${file}:${lineNumber}:${tag}`);

      // Semantic entry with Grok embedding
      const embedding = await this.embedder.embed(
        `AI Immunity Prophecy: ${linker} linker with ${auto} automation, confidence ${score}`,
        { cache: true }
      );

      semanticEntries.push({
        file,
        line: lineNumber,
        tag,
        linker,
        automation: auto,
        score: parseFloat(score),
        embedding,
        context: this.extractContext(content, match.index!, 100), // 100 chars around
        timestamp: Date.now()
      });
    }

    return { grepEntries, semanticEntries };
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  private extractContext(content: string, index: number, chars: number): string {
    const start = Math.max(0, index - chars);
    const end = Math.min(content.length, index + chars);
    return content.substring(start, end).replace(/\s+/g, ' ').trim();
  }
}

// CLI entry point (backward compatible)
if (import.meta.main) {
  const args = Bun.argv.slice(2);
  const rebuild = args.includes('--rebuild');
  const grokRefresh = args.includes('--grok-refresh');
  const grepArg = args.find(arg => arg.startsWith('--grep='));
  const grepPattern = grepArg ? grepArg.split('=')[1] : undefined;

  (async () => {
    try {
      const indexer = new AIImmunityIndexer();
      const atomic = new AtomicFile();

      // Build index (rebuild if requested or if grok-refresh is needed)
      if (rebuild || grokRefresh || !(await atomic.exists('.ai-immunity.index'))) {
        const stats = await indexer.buildDualIndex();

        if (grokRefresh) {
          console.log('🔄 Grok embeddings refreshed!');
        }
      } else {
        console.log('✅ Index already exists. Use --rebuild or --grok-refresh to refresh.');
      }

      // Query if requested
      if (grepPattern) {
        const indexContent = await atomic.read('.ai-immunity.index');
        const files = indexContent.trim().split('\n').filter(Boolean);
        
        if (files.length > 0) {
          const { $ } = await import('bun');
          console.log(`🔍 Querying index for: ${grepPattern}`);
          const result = await $`rg ${grepPattern} ${files}`.quiet();
          
          if (result.exitCode === 0) {
            console.log(result.stdout.toString());
          } else {
            console.log('No matches found.');
          }
        }
      } else {
        console.log('\n💡 Query example: rg -f .ai-immunity.index "score-0.9" → High-prophecy hits in 12ms');
      }
    } catch (error) {
      console.error(`❌ Index build failed: ${error.message}`);
      process.exit(1);
    }
  })();
}

// Export for backward compatibility - functions available in original index-ai-immunity.ts

