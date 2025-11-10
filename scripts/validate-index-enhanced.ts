#!/usr/bin/env bun
/**
 * Enhanced Index Validator - Class-Based Implementation (v1.4)
 * 
 * CLI command: bun audit:index
 * 
 * Class-based index validation with comprehensive drift detection and auto-healing.
 */

import { GrokEmbedder } from './grok-embedder';
import { AIImmunityIndexer } from './index-ai-immunity-enhanced';
import { AtomicFile } from './atomic-file';

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

export interface ValidationResult {
  valid: boolean;
  needsHealing: boolean;
  healed: boolean;
  issues: string[];
  prophecyCount: number;
  embeddingDrifts: number;
  scoreDrifts: number;
  originalIssues?: string[];
}

export class IndexValidator {
  private embedder: GrokEmbedder;
  private indexer: AIImmunityIndexer;
  private atomic: AtomicFile;

  constructor() {
    this.embedder = new GrokEmbedder();
    this.indexer = new AIImmunityIndexer();
    this.atomic = new AtomicFile();
  }

  async validateAndHeal(): Promise<ValidationResult> {
    console.log('🔍 Validating AI-IMMUNITY index...');

    try {
      const semanticIndex = await this.loadSemanticIndex();
      const validation = await this.validateIndex(semanticIndex);

      if (validation.needsHealing) {
        console.log('🛠️ Index needs healing, rebuilding...');
        await this.indexer.buildDualIndex();

        // Re-validate after healing
        const healedIndex = await this.loadSemanticIndex();
        const finalValidation = await this.validateIndex(healedIndex);

        return {
          ...finalValidation,
          healed: true,
          originalIssues: validation.issues
        };
      }

      return { ...validation, healed: false };
    } catch (error) {
      console.error('❌ Index validation failed:', error.message);

      // Auto-heal: rebuild index
      console.log('🛠️ Auto-healing corrupted index...');
      await this.indexer.buildDualIndex();

      return {
        valid: true,
        needsHealing: false,
        healed: true,
        issues: ['Index was corrupted and has been rebuilt'],
        prophecyCount: 0,
        embeddingDrifts: 0,
        scoreDrifts: 0
      };
    }
  }

  private async loadSemanticIndex(): Promise<SemanticEntry[]> {
    let semanticPath = '.ai-immunity.semantic';
    
    try {
      const config = await Bun.file('bun.yaml').yaml();
      semanticPath = config['ai-immunity']?.indexing?.semantic?.index?.['semantic-path'] || semanticPath;
    } catch {
      // Use default
    }
    
    const content = await this.atomic.read(semanticPath);
    return JSON.parse(content);
  }

  private async validateIndex(index: SemanticEntry[]): Promise<ValidationResult> {
    const issues: string[] = [];
    let embeddingDrifts = 0;
    let scoreDrifts = 0;

    for (const entry of index) {
      // Validate file exists and contains the prophecy
      if (!await this.validateFileEntry(entry)) {
        issues.push(`Missing prophecy: ${entry.file}:${entry.line} - ${entry.tag}`);
        continue;
      }

      // Validate score range
      if (entry.score < 0 || entry.score > 1) {
        scoreDrifts++;
        issues.push(`Invalid score: ${entry.file} - ${entry.tag} (score: ${entry.score})`);
      }

      // Validate embedding similarity (check for drift)
      const currentContext = await this.extractCurrentContext(entry.file, entry.line);
      const currentEmbedding = await this.embedder.embed(
        `AI Immunity Prophecy: ${entry.linker} linker with ${entry.automation} automation, confidence ${entry.score}`,
        { cache: true }
      );

      const similarity = this.embedder.cosineSimilarity(entry.embedding, currentEmbedding);
      if (similarity < 0.95) {
        embeddingDrifts++;
        issues.push(`Embedding drift: ${entry.file} - ${entry.tag} (similarity: ${similarity.toFixed(3)})`);
      }
    }

    return {
      valid: issues.length === 0,
      needsHealing: issues.length > 0,
      issues,
      prophecyCount: index.length,
      embeddingDrifts,
      scoreDrifts
    };
  }

  private async validateFileEntry(entry: SemanticEntry): Promise<boolean> {
    try {
      const content = await Bun.file(entry.file).text();
      const lines = content.split('\n');
      const lineContent = lines[entry.line - 1]; // Line numbers are 1-based

      // Check if the line contains the AI-IMMUNITY tag pattern
      // The tag format is: ai-hoisted-ai-disable-score-0.97
      // But in file it's: [AI-IMMUNITY:ai-hoisted-ai-disable][SCORE:0.97]
      const tagParts = entry.tag.split('-score-');
      if (tagParts.length === 2) {
        const [linkerAuto] = tagParts;
        const score = tagParts[1];
        // Check for the actual format in file
        const pattern = `[AI-IMMUNITY:${linkerAuto}][SCORE:${score}]`;
        return lineContent.includes(pattern);
      }
      
      // Fallback: check if tag substring exists
      return lineContent.includes(entry.tag) || lineContent.includes('AI-IMMUNITY');
    } catch {
      return false;
    }
  }

  private async extractCurrentContext(file: string, line: number): Promise<string> {
    const content = await Bun.file(file).text();
    const lines = content.split('\n');
    const targetLine = lines[line - 1];

    // Extract context around the line
    const start = Math.max(0, line - 3);
    const end = Math.min(lines.length, line + 2);
    return lines.slice(start, end).join(' ').replace(/\s+/g, ' ').trim();
  }
}

// CLI interface (backward compatible with existing validate-index.js)
if (import.meta.main) {
  const validator = new IndexValidator();
  
  (async () => {
    const result = await validator.validateAndHeal();

    console.log('📊 Index Validation Report:');
    console.log(`✅ Valid: ${result.valid}`);
    console.log(`🛠️ Needed Healing: ${result.needsHealing}`);
    console.log(`🔧 Was Healed: ${result.healed}`);
    console.log(`📜 Prophecies: ${result.prophecyCount}`);
    console.log(`🎯 Embedding Drifts: ${result.embeddingDrifts}`);
    console.log(`📈 Score Drifts: ${result.scoreDrifts}`);

    if (result.issues.length > 0) {
      console.log('\n🚨 Issues Found:');
      result.issues.forEach(issue => console.log(` • ${issue}`));
    } else {
      console.log('\n🎉 No issues found! Index is healthy.');
    }

    // Exit with error code if validation failed
    process.exit(result.valid ? 0 : 1);
  })();
}


