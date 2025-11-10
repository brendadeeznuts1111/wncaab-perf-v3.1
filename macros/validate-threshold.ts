#!/usr/bin/env bun
/**
 * Enhanced Threshold Validator - Auto-Corrects Arithmetic Expressions (v1.4.2)
 * 
 * Auto-corrects expressions like "0.7-.0012" → 0.6988
 * Flags quantum malformations and validates bounds
 */

export interface ThresholdValidationResult {
  value: number;
  corrected: boolean;
  original: string;
  warning?: string;
}

/**
 * Validate and auto-correct threshold input
 */
export function validateThreshold(input: string): ThresholdValidationResult {
  const original = input.trim();
  
  // Auto-correct arithmetic expressions: 0.7-.0012 → 0.6988
  if (original.includes('-') && original.match(/^\d+\.?\d*-\d*\.?\d+$/)) {
    const parts = original.split('-');
    if (parts.length === 2) {
      const a = parseFloat(parts[0]);
      const b = parseFloat(parts[1]);
      
      if (!isNaN(a) && !isNaN(b)) {
        const result = a - b;
        const clamped = Math.max(0, Math.min(1, result));
        
        return {
          value: clamped,
          corrected: true,
          original,
          warning: `⚠️  Auto-corrected ${original} → ${clamped.toFixed(4)}`
        };
      }
    }
  }
  
  // Auto-correct addition: 0.7+0.0012 → 0.7012
  if (original.includes('+') && original.match(/^\d+\.?\d*\+\d*\.?\d+$/)) {
    const parts = original.split('+');
    if (parts.length === 2) {
      const a = parseFloat(parts[0]);
      const b = parseFloat(parts[1]);
      
      if (!isNaN(a) && !isNaN(b)) {
        const result = a + b;
        const clamped = Math.max(0, Math.min(1, result));
        
        return {
          value: clamped,
          corrected: true,
          original,
          warning: `⚠️  Auto-corrected ${original} → ${clamped.toFixed(4)}`
        };
      }
    }
  }
  
  // Strict validation: only digits and one decimal point
  if (!/^\d*\.?\d+$/.test(original)) {
    throw new Error(`❌ Invalid threshold format: "${original}". Must be a number between 0.0 and 1.0`);
  }
  
  const value = parseFloat(original);
  
  if (isNaN(value)) {
    throw new Error(`❌ Invalid threshold value: "${original}". Must be a number.`);
  }
  
  if (value < 0 || value > 1) {
    throw new Error(`❌ Threshold out of bounds [0,1]: "${original}"`);
  }
  
  return {
    value,
    corrected: false,
    original
  };
}

// CLI test
if (import.meta.main) {
  const args = Bun.argv.slice(2);
  const thresholdArg = args.find(arg => arg.startsWith('--threshold='));
  
  if (!thresholdArg) {
    console.log('Usage: bun validate-threshold.ts --threshold=<value>');
    console.log('Examples:');
    console.log('  bun validate-threshold.ts --threshold=0.7');
    console.log('  bun validate-threshold.ts --threshold=0.7-.0012');
    console.log('  bun validate-threshold.ts --threshold=0.7+0.0012');
    process.exit(0);
  }
  
  const input = thresholdArg.split('=')[1];
  
  try {
    const result = validateThreshold(input);
    
    if (result.warning) {
      console.log(result.warning);
    }
    
    console.log(`✅ Threshold: ${result.value.toFixed(4)}`);
    console.log(`   Original: ${result.original}`);
    console.log(`   Corrected: ${result.corrected}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

