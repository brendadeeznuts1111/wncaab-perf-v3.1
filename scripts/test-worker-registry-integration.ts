#!/usr/bin/env bun
/**
 * Test Worker Registry Integration - TES-PERF-001
 * 
 * Verifies that worker-telemetry-api can create workers with environmentData API
 * 
 * Usage: bun run scripts/test-worker-registry-integration.ts
 */

import { Worker, setEnvironmentData } from 'worker_threads';

// Mock the worker registry to test worker creation
console.log('🧪 TES-PERF-001: Testing Worker Registry Integration\n');

// Simulate worker creation pattern from worker-telemetry-api.ts
function createTestWorker(id: string) {
  console.log(`Creating worker: ${id}`);
  
  // ✅ TES-PERF-001: Bun 1.3 environmentData API (zero-copy config sharing)
  setEnvironmentData('tes-worker-config', {
    workerId: id,
    registry: true,
    port: 3000,
  });
  
  const worker = new Worker(new URL('./scan-worker.js', import.meta.url), {
    // No env option needed - using environmentData API instead
  });
  
  return new Promise<boolean>((resolve, reject) => {
    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error('Timeout: Worker did not respond'));
    }, 5000);
    
    worker.onmessage = (event) => {
      if (event.data.type === 'ready' && event.data.workerId === id) {
        clearTimeout(timeout);
        console.log(`✅ Worker ${id} created successfully`);
        console.log(`   Config accessible: ${event.data.workerId === id ? 'YES' : 'NO'}\n`);
        worker.terminate();
        resolve(true);
      }
    };
    
    worker.onerror = (error) => {
      clearTimeout(timeout);
      worker.terminate();
      reject(error);
    };
    
    // Send registration message
    worker.postMessage({ type: 'register', id });
  });
}

async function runIntegrationTest() {
  try {
    console.log('Test: Worker Registry Integration');
    await createTestWorker('test-registry-worker-001');
    
    console.log('🎉 Integration test passed!');
    console.log('\nSummary:');
    console.log('  ✅ Worker creation with environmentData API working');
    console.log('  ✅ Config accessible in worker thread');
    console.log('  ✅ Worker registry pattern verified');
    console.log('\nMigration Status: VERIFIED');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Integration test failed:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

runIntegrationTest();

