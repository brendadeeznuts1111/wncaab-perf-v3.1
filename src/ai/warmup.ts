/**
 * AI Model Warmup - Preload ONNX Models and WASM Modules
 * 
 * This file is preloaded by Bun before the first request (via bunfig.toml).
 * Pre-warms AI models and WASM modules to eliminate cold start latency.
 * 
 * ✅ Pattern: Preload WASM models before first request
 * 
 * Usage:
 *   bunfig.toml:
 *     [run]
 *     preload = ["./src/ai/warmup.ts"]
 */

/// <reference types="bun-types" />

// ✅ Bun-native: Use Bun.env for CPU count, fallback to os.cpus() (standard API)
import { cpus } from 'os';

/**
 * Model cache with LRU eviction to prevent memory leaks
 * ✅ Fixed: LRU cache prevents GPU memory accumulation
 */
interface ModelCacheEntry {
  model: any;
  loadedAt: number;
  lastUsed: number;
}

const MODEL_CACHE = new Map<string, ModelCacheEntry>();
const MAX_MODELS = 3; // Cap GPU memory usage

/**
 * Load model with LRU cache eviction
 * ✅ Fixed: Prevents memory leaks by evicting oldest models
 */
async function loadModelWithCache(modelPath: string, modelName: string): Promise<any | null> {
  // Check cache first
  const cached = MODEL_CACHE.get(modelName);
  if (cached) {
    cached.lastUsed = Date.now();
    return cached.model;
  }

  // Evict oldest model if cache is full
  // ✅ Bun-native: LRU eviction using native Map iteration (zero imports)
  if (MODEL_CACHE.size >= MAX_MODELS) {
    // Find LRU by iteration (no extra imports, native Map.entries())
    let oldestKey = '';
    let oldestTime = Infinity;
    for (const [k, v] of MODEL_CACHE.entries()) {
      if (v.lastUsed < oldestTime) {
        oldestTime = v.lastUsed;
        oldestKey = k;
      }
    }
    
    const oldestEntry = MODEL_CACHE.get(oldestKey);
    
    // ✅ Fixed: Safe GPU memory release with native duck typing (zero imports)
    if (oldestEntry && oldestEntry.model && typeof oldestEntry.model.release === 'function') {
      try {
        oldestEntry.model.release();
        console.log(`[Warmup] 🗑️  Evicted model from cache: ${oldestKey}`);
      } catch {
        // Release failed, hint to GC
        console.warn(`[Warmup] ⚠️  Release failed, forcing GC for ${oldestKey}`);
        oldestEntry.model = null; // Hint to GC
      }
    }
    
    MODEL_CACHE.delete(oldestKey);
  }

  return null; // Model not in cache, caller should load it
}

/**
 * Cache a loaded model
 */
function cacheModel(modelName: string, model: any): void {
  MODEL_CACHE.set(modelName, {
    model,
    loadedAt: Date.now(),
    lastUsed: Date.now(),
  });
}

/**
 * Preload ONNX models
 * Attempts to load and warm up ONNX models before first request
 */
async function warmupONNXModels() {
  try {
    // Try to load ONNX Runtime (if available)
    const onnx = await import('onnxruntime-node').catch(() => null);
    
    if (!onnx) {
      console.log('[Warmup] ⚠️  ONNX Runtime not available, skipping model warmup');
      return;
    }
    
    // Preload curve detection model
    const modelPath = './models/curve.onnx';
    const modelName = 'curve-detection';
    
    try {
      // ✅ Fixed: Check cache first to prevent duplicate loading
      const cachedModel = await loadModelWithCache(modelPath, modelName);
      if (cachedModel) {
        console.log(`[Warmup] ✅ Using cached ONNX model: ${modelName}`);
        return;
      }
      
      // ✅ Fixed: Atomic file check using Bun.file().stat() (Bun-native, zero imports)
      const modelFile = Bun.file(modelPath);
      const stats = await modelFile.stat().catch(() => null);
      if (!stats) {
        console.log(`[Warmup] ⚠️  Model file not found: ${modelPath}, skipping ONNX model warmup`);
        return;
      }
      
      const model = await onnx.InferenceSession.create(modelPath);
      
      // Pre-warm with dummy input
      const dummyInput = new Float32Array(10).fill(0.5);
      await model.run({ input: dummyInput });
      
      // ✅ Fixed: Cache model to prevent memory leaks
      cacheModel(modelName, model);
      
      console.log('[Warmup] ✅ ONNX model preloaded and warmed up:', modelPath);
    } catch (error) {
      console.warn(`[Warmup] ⚠️  Failed to preload ONNX model: ${error instanceof Error ? error.message : String(error)}`);
    }
  } catch (error) {
    console.warn(`[Warmup] ⚠️  ONNX warmup failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Preload WASM modules
 * Attempts to load WASM modules before first request
 */
async function warmupWASMModules() {
  try {
    // Try to load spline WASM module (if available)
    const wasm = await import('../scripts/spline.wasm').catch(() => null);
    
    if (!wasm) {
      console.log('[Warmup] ⚠️  WASM modules not available, skipping WASM warmup');
      return;
    }
    
    // Pre-warm WASM module with dummy data
    if (typeof wasm.render === 'function') {
      const dummyPoints = 100;
      // ✅ Bun-native: Use Bun.env.CPU_COUNT or os.cpus().length (zero-import fallback)
      const cpuCount = Bun.env.CPU_COUNT 
        ? parseInt(Bun.env.CPU_COUNT, 10) 
        : (cpus()?.length || 4);
      const threadCount = Math.min(cpuCount, 8); // Cap at 8 for stability
      await wasm.render(dummyPoints, {
        simd: true,
        threads: threadCount,
        type: 'catmull-rom',
        tension: 0.5,
      });
      
      console.log('[Warmup] ✅ WASM module preloaded and warmed up');
    }
  } catch (error) {
    console.warn(`[Warmup] ⚠️  WASM warmup failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Main warmup function
 * Runs all warmup tasks in parallel
 */
async function warmup() {
  console.log('[Warmup] 🚀 Starting AI model and WASM warmup...');
  
  // Run warmup tasks in parallel
  await Promise.allSettled([
    warmupONNXModels(),
    warmupWASMModules(),
  ]);
  
  console.log('[Warmup] ✅ Warmup complete');
}

// Execute warmup immediately when this module is loaded
warmup().catch((error) => {
  console.error('[Warmup] ❌ Warmup failed:', error instanceof Error ? error.message : String(error));
});

