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

import { cpus } from 'os';

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
    try {
      const model = await onnx.InferenceSession.create(modelPath);
      
      // Pre-warm with dummy input
      const dummyInput = new Float32Array(10).fill(0.5);
      await model.run({ input: dummyInput });
      
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
      // Use os.cpus().length for thread count (Bun-compatible)
      const threadCount = cpus().length || 4;
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

