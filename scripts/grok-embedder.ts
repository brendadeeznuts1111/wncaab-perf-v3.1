#!/usr/bin/env bun
/**
 * Grok Embedder - Deterministic Embeddings with Caching (v1.4)
 * 
 * Provides Grok embedding functionality with deterministic generation
 * and caching for performance optimization.
 */

export interface EmbeddingOptions {
  dimensions?: number;
  cache?: boolean;
}

export class GrokEmbedder {
  private cache = new Map<string, number[]>();
  private readonly EMBEDDING_DIM = 512;

  async embed(text: string, options: EmbeddingOptions = {}): Promise<number[]> {
    const dims = options.dimensions || this.EMBEDDING_DIM;
    
    // Check cache first if caching enabled
    if (options.cache !== false) {
      const cacheKey = this.normalizeText(text);
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey)!;
      }
    }

    // Simulate Grok embedding API call
    // In production, this would call xAI's Grok embedding endpoint
    const embedding = await this.callGrokEmbeddingAPI(text, dims);

    // Cache for performance
    if (options.cache !== false) {
      const cacheKey = this.normalizeText(text);
      this.cache.set(cacheKey, embedding);
    }

    return embedding;
  }

  private async callGrokEmbeddingAPI(text: string, dims: number): Promise<number[]> {
    // Simulated Grok embedding - in reality, this would be:
    // const response = await fetch('https://api.x.ai/embed', {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${process.env.GROK_API_KEY}` },
    //   body: JSON.stringify({ text, model: 'grok-embedding-v1' })
    // });
    // return await response.json();

    // For now, generate deterministic random embeddings based on text hash
    return this.generateDeterministicEmbedding(text, dims);
  }

  private generateDeterministicEmbedding(text: string, dims: number): number[] {
    // Simple hash function for deterministic "random" embeddings
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }

    // Generate embedding based on hash
    const embedding: number[] = [];
    for (let i = 0; i < dims; i++) {
      const seed = (hash + i * 2654435761) % 1000; // Fibonacci hash spread
      embedding.push((Math.sin(seed) + 1) / 2); // Normalize to 0-1
    }

    return embedding;
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(`Embedding dimension mismatch: ${a.length} vs ${b.length}`);
    }

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

  private normalizeText(text: string): string {
    return text.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}

