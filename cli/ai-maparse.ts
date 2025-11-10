#!/usr/bin/env bun
/**
 * AI Auto-Maparse - Curved Look Autopsy (v1.4.2)
 * 
 * Detects parabolic, exponential, logarithmic patterns in price series
 * Uses deterministic curve detection (ONNX model placeholder)
 * 
 * Now uses pure JS curve-detector.ts for pattern detection
 */

import { detectCurves, type Point } from '../scripts/ai/curve-detector.ts';

export interface PriceSeries {
  prices: number[];
  timestamps?: number[];
}

export interface MaparseResult {
  conflict: number;
  entropy: number;
  tension: number;
  curvature: number;
  drift: number;
  decay: number;
  pattern: 'parabolic' | 'exponential' | 'logarithmic' | 'linear' | 'oscillating';
}

/**
 * Z-score normalization
 */
function normalizeSeries(series: number[]): number[] {
  const mean = series.reduce((a, b) => a + b, 0) / series.length;
  const variance = series.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / series.length;
  const std = Math.sqrt(variance);
  
  return series.map(p => (p - mean) / (std || 1));
}

/**
 * Detect curve pattern using curve-detector.ts
 * @BUN Uses pure JS curve detection from scripts/ai/curve-detector.ts
 */
function detectCurvePattern(normalized: number[]): 'parabolic' | 'exponential' | 'logarithmic' | 'linear' | 'oscillating' {
  if (normalized.length < 3) return 'linear';
  
  // Convert to Point[] format for curve-detector
  const points: Point[] = normalized.map((y, i) => ({ x: i, y }));
  
  // Use curve-detector.ts for pattern detection
  const results = detectCurves(points, 0.7);
  
  if (results.length === 0) return 'linear';
  
  const bestFit = results[0];
  
  // Map curve-detector types to maparse patterns
  switch (bestFit.type) {
    case 'quadratic':
      return 'parabolic';
    case 'linear':
      return 'linear';
    default:
      // Use heuristics for exponential/logarithmic/oscillating
      const firstHalf = normalized.slice(0, Math.floor(normalized.length / 2));
      const secondHalf = normalized.slice(Math.floor(normalized.length / 2));
      
      const firstTrend = firstHalf[firstHalf.length - 1] - firstHalf[0];
      const secondTrend = secondHalf[secondHalf.length - 1] - secondHalf[0];
      
      if (firstTrend > 0 && secondTrend > firstTrend) return 'exponential';
      if (firstTrend < 0 && secondTrend < firstTrend) return 'logarithmic';
      if (Math.abs(firstTrend - secondTrend) > 0.3) return 'oscillating';
      
      return 'linear';
  }
}

/**
 * Auto-maparse price series to CLI params
 */
export function autoMaparse(series: PriceSeries): MaparseResult {
  const normalized = normalizeSeries(series.prices);
  
  // Calculate metrics
  const drift = normalized[normalized.length - 1] - normalized[0];
  const decay = Math.abs(normalized.reduce((a, b) => a + Math.abs(b), 0) / normalized.length);
  
  // Calculate curvature (second derivative magnitude)
  let curvature = 0;
  if (normalized.length >= 3) {
    const curvatures: number[] = [];
    for (let i = 1; i < normalized.length - 1; i++) {
      const d2 = normalized[i + 1] - 2 * normalized[i] + normalized[i - 1];
      curvatures.push(Math.abs(d2));
    }
    curvature = curvatures.reduce((a, b) => a + b, 0) / curvatures.length;
  }
  
  // Map to CLI params
  const conflict = Math.min(1.0, Math.abs(drift) * 2);
  const entropy = Math.min(1.0, decay);
  const tension = Math.min(1.0, Math.abs(curvature));
  
  const pattern = detectCurvePattern(normalized);
  
  return {
    conflict,
    entropy,
    tension,
    curvature,
    drift,
    decay,
    pattern
  };
}

// CLI interface
if (import.meta.main) {
  const args = Bun.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log('AI Auto-Maparse - Curved Look Autopsy');
    console.log('');
    console.log('Usage:');
    console.log('  bun ai-maparse.ts --prices="100,102,105,110,118"');
    console.log('  echo "100,102,105,110,118" | bun ai-maparse.ts --stdin');
    console.log('');
    console.log('Options:');
    console.log('  --prices=<csv>  Comma-separated price series');
    console.log('  --stdin         Read prices from stdin (CSV)');
    console.log('  --json          Output JSON format');
    process.exit(0);
  }
  
  let prices: number[] = [];
  
  if (args.includes('--stdin')) {
    // Read from stdin
    const input = await Bun.stdin.text();
    prices = input.trim().split(',').map(p => parseFloat(p.trim())).filter(p => !isNaN(p));
  } else {
    const pricesArg = args.find(a => a.startsWith('--prices='));
    if (pricesArg) {
      prices = pricesArg.split('=')[1].split(',').map(p => parseFloat(p.trim())).filter(p => !isNaN(p));
    }
  }
  
  if (prices.length === 0) {
    console.error('❌ No prices provided. Use --prices=<csv> or --stdin');
    process.exit(1);
  }
  
  const result = autoMaparse({ prices });
  
  if (args.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`🎯 Auto-Maparse Results:`);
    console.log(`   Pattern: ${result.pattern}`);
    console.log(`   Conflict: ${result.conflict.toFixed(3)}`);
    console.log(`   Entropy: ${result.entropy.toFixed(3)}`);
    console.log(`   Tension: ${result.tension.toFixed(3)}`);
    console.log(`   Curvature: ${result.curvature.toFixed(3)}`);
    console.log(`   Drift: ${result.drift.toFixed(3)}`);
    console.log(`   Decay: ${result.decay.toFixed(3)}`);
    console.log('');
    console.log(`💡 Use with map:edge:`);
    console.log(`   bun map:edge --conflict=${result.conflict.toFixed(3)} --entropy=${result.entropy.toFixed(3)} --tension=${result.tension.toFixed(3)}`);
  }
}

