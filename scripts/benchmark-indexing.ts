#!/usr/bin/env bun
/**
 * Performance Benchmarking - Indexing System (v1.4)
 * 
 * CLI command: bun run scripts/benchmark-indexing.ts
 * 
 * Benchmarks the AI-immunity indexing system and compares with v1.3.2 baseline.
 */

import { AIImmunityIndexer } from './index-ai-immunity-enhanced';
import { SemanticHunter } from '../queries/semantic-hunt-enhanced';
import { IndexValidator } from './validate-index-enhanced';

interface BenchmarkResult {
  metric: string;
  v1_3_2: number;
  v1_4: number;
  improvement: string;
}

export class IndexingBenchmark {
  private indexer: AIImmunityIndexer;
  private hunter: SemanticHunter;
  private validator: IndexValidator;

  constructor() {
    this.indexer = new AIImmunityIndexer();
    this.hunter = new SemanticHunter();
    this.validator = new IndexValidator();
  }

  async runBenchmarks(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // Benchmark 1: Index Build
    console.log('🔨 Benchmarking index build...');
    const buildStart = performance.now();
    const stats = await this.indexer.buildDualIndex();
    const buildTime = performance.now() - buildStart;
    
    results.push({
      metric: 'Index Build (10k Files)',
      v1_3_2: 52,
      v1_4: buildTime,
      improvement: this.calculateImprovement(52, buildTime)
    });

    // Benchmark 2: Semantic Query
    console.log('🔍 Benchmarking semantic query...');
    await this.hunter.initialize();
    const queryStart = performance.now();
    await this.hunter.hunt('ai immunity configuration', { threshold: 0.85, limit: 10 });
    const queryTime = performance.now() - queryStart;
    
    results.push({
      metric: 'Semantic Query',
      v1_3_2: 0, // N/A for v1.3.2
      v1_4: queryTime,
      improvement: '∞% (New Feature)'
    });

    // Benchmark 3: Hybrid Query
    console.log('🔗 Benchmarking hybrid query...');
    const hybridStart = performance.now();
    await this.hunter.hybridHunt('immunity', 'AI-IMMUNITY');
    const hybridTime = performance.now() - hybridStart;
    
    results.push({
      metric: 'Hybrid Query (Top 10)',
      v1_3_2: 180,
      v1_4: hybridTime,
      improvement: this.calculateImprovement(180, hybridTime)
    });

    // Benchmark 4: Index Validation
    console.log('✅ Benchmarking index validation...');
    const validateStart = performance.now();
    await this.validator.validateAndHeal();
    const validateTime = performance.now() - validateStart;
    
    results.push({
      metric: 'Embedding Validation',
      v1_3_2: 0, // N/A for v1.3.2
      v1_4: validateTime,
      improvement: '∞% (New Feature)'
    });

    return results;
  }

  private calculateImprovement(baseline: number, current: number): string {
    if (baseline === 0) return '∞%';
    const improvement = ((baseline - current) / baseline) * 100;
    return `${improvement > 0 ? '+' : ''}${improvement.toFixed(0)}%`;
  }

  formatResults(results: BenchmarkResult[]): void {
    console.log('\n🚀 AI-IMMUNITY INDEXING BENCHMARKS\n');
    console.log('┌─────────────────────┬──────────┬──────────┬─────────────┐');
    console.log('│     Metric          │  v1.3.2  │  v1.4    │ Improvement │');
    console.log('├─────────────────────┼──────────┼──────────┼─────────────┤');

    for (const result of results) {
      const v1_3_2_str = result.v1_3_2 === 0 ? 'N/A' : `${result.v1_3_2.toFixed(1)}ms`;
      const v1_4_str = `${result.v1_4.toFixed(1)}ms`;
      const metric = result.metric.padEnd(19);
      const v1_3_2_pad = v1_3_2_str.padStart(8);
      const v1_4_pad = v1_4_str.padStart(8);
      const improvement = result.improvement.padStart(11);
      
      console.log(`│ ${metric} │ ${v1_3_2_pad} │ ${v1_4_pad} │ ${improvement} │`);
    }

    console.log('└─────────────────────┴──────────┴──────────┴─────────────┘');
  }
}

// CLI entry point
if (import.meta.main) {
  const benchmark = new IndexingBenchmark();
  
  (async () => {
    try {
      const results = await benchmark.runBenchmarks();
      benchmark.formatResults(results);
    } catch (error) {
      console.error(`❌ Benchmark failed: ${error.message}`);
      process.exit(1);
    }
  })();
}


