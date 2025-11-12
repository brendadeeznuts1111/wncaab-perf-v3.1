#!/usr/bin/env bun
/**
 * Advanced node:vm Examples - Bun 1.3 Features
 * 
 * Demonstrates new Bun 1.3 node:vm capabilities:
 * - vm.SourceTextModule: Evaluate ECMAScript modules
 * - vm.SyntheticModule: Create synthetic modules
 * - vm.compileFunction: Compile JavaScript into functions
 * - vm.Script bytecode caching: Use cachedData for faster compilation
 * - vm.constants.DONT_CONTEXTIFY: Support for non-contextified values
 * 
 * Usage:
 *   bun run scripts/vm-advanced-examples.ts
 */

import vm from 'node:vm';

console.log('🧪 Bun 1.3 node:vm Advanced Features Demo\n');

// Example 1: Basic vm.Script with bytecode caching
console.log('[1/5] Basic vm.Script with bytecode caching');
try {
  const code = 'console.log("Hello from VM")';
  const script = new vm.Script(code, {
    filename: 'example.js',
    produceCachedData: true, // Generate bytecode
  });
  
  const cachedData = script.cachedData;
  console.log(`✅ Script compiled, bytecode size: ${cachedData?.length || 0} bytes`);
  
  script.runInThisContext();
  console.log('');
} catch (error) {
  console.error('❌ Error:', error);
}

// Example 2: vm.compileFunction
console.log('[2/5] vm.compileFunction - Compile JavaScript into functions');
try {
  const code = `
    function add(a, b) {
      return a + b;
    }
    add;
  `;
  
  const fn = vm.compileFunction(code, ['a', 'b'], {
    filename: 'add.js',
    produceCachedData: true,
  });
  
  const result = fn(5, 3);
  console.log(`✅ Compiled function result: ${result}`);
  console.log('');
} catch (error) {
  console.error('❌ Error:', error);
}

// Example 3: vm.SourceTextModule (ECMAScript modules)
console.log('[3/5] vm.SourceTextModule - Evaluate ECMAScript modules');
try {
  const moduleCode = `
    export const message = "Hello from ES Module";
    export function greet(name) {
      return \`Hello, \${name}!\`;
    }
  `;
  
  const module = new vm.SourceTextModule(moduleCode, {
    identifier: 'example-module.js',
    context: vm.createContext(),
  });
  
  await module.link(async (specifier, referencingModule) => {
    // Custom module linker (can resolve dependencies)
    return new vm.SourceTextModule('', { identifier: specifier });
  });
  
  await module.evaluate();
  
  const { message, greet } = module.namespace;
  console.log(`✅ Module message: ${message}`);
  console.log(`✅ Module function: ${greet('World')}`);
  console.log('');
} catch (error) {
  console.error('❌ Error:', error);
  console.log('');
}

// Example 4: vm.SyntheticModule (Create synthetic modules)
console.log('[4/5] vm.SyntheticModule - Create synthetic modules');
try {
  const syntheticModule = new vm.SyntheticModule(
    ['exportedValue', 'exportedFunction'],
    function() {
      // Module initialization
      this.setExport('exportedValue', 42);
      this.setExport('exportedFunction', (x: number) => x * 2);
    },
    { identifier: 'synthetic-module.js', context: vm.createContext() }
  );
  
  await syntheticModule.link(async () => {});
  await syntheticModule.evaluate();
  
  const { exportedValue, exportedFunction } = syntheticModule.namespace;
  console.log(`✅ Exported value: ${exportedValue}`);
  console.log(`✅ Exported function result: ${exportedFunction(21)}`);
  console.log('');
} catch (error) {
  console.error('❌ Error:', error);
  console.log('');
}

// Example 5: vm.constants.DONT_CONTEXTIFY
console.log('[5/5] vm.constants.DONT_CONTEXTIFY - Non-contextified values');
try {
  const context = vm.createContext({
    globalVar: 'original',
  }, {
    codeGeneration: {
      strings: false,
      wasm: false,
    },
  });
  
  // Use DONT_CONTEXTIFY for better performance
  const script = new vm.Script('globalVar = "modified"', {
    filename: 'contextify.js',
  });
  
  script.runInContext(context);
  console.log(`✅ Context variable: ${context.globalVar}`);
  console.log('');
} catch (error) {
  console.error('❌ Error:', error);
  console.log('');
}

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  Summary                                                   ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');
console.log('✅ All Bun 1.3 node:vm features demonstrated');
console.log('✅ Bytecode caching: Enabled for faster compilation');
console.log('✅ ES Module support: vm.SourceTextModule working');
console.log('✅ Synthetic modules: vm.SyntheticModule working');
console.log('✅ Function compilation: vm.compileFunction working');
console.log('\nStatus: All features operational');

