#!/usr/bin/env bun
/**
 * Test Worker Migration - TES-PERF-001
 * 
 * Verifies that Bun 1.3 environmentData API migration is working correctly
 * 
 * Usage: bun run scripts/test-worker-migration.ts
 */

import { Worker, setEnvironmentData, getEnvironmentData } from 'worker_threads';

console.log('🧪 TES-PERF-001: Testing Worker Migration (Bun 1.3 environmentData API)\n');

// Test 1: Verify setEnvironmentData works
console.log('Test 1: setEnvironmentData() API');
try {
  setEnvironmentData('tes-test-config', {
    testId: 'test-123',
    testValue: 'migration-success',
    timestamp: Date.now(),
  });
  console.log('✅ setEnvironmentData() succeeded\n');
} catch (error) {
  console.error('❌ setEnvironmentData() failed:', error);
  process.exit(1);
}

// Test 2: Verify getEnvironmentData works in main thread
console.log('Test 2: getEnvironmentData() in main thread');
try {
  const config = getEnvironmentData('tes-test-config');
  if (config && (config as any).testId === 'test-123') {
    console.log('✅ getEnvironmentData() in main thread succeeded');
    console.log(`   Config: ${JSON.stringify(config)}\n`);
  } else {
    console.error('❌ getEnvironmentData() returned incorrect data:', config);
    process.exit(1);
  }
} catch (error) {
  console.error('❌ getEnvironmentData() failed:', error);
  process.exit(1);
}

// Test 3: Test scan-worker config access
console.log('Test 3: scan-worker config access');
const scanWorkerTest = new Promise<boolean>((resolve, reject) => {
  try {
    // Set config before creating worker
    setEnvironmentData('tes-worker-config', {
      workerId: 'test-scan-worker',
      registry: true,
      port: 3000,
    });

    const worker = new Worker(new URL('./scan-worker.js', import.meta.url), {
      // No env option - using environmentData API
    });

    let messageReceived = false;
    const timeout = setTimeout(() => {
      if (!messageReceived) {
        worker.terminate();
        reject(new Error('Timeout: Worker did not respond'));
      }
    }, 5000);

    worker.onmessage = (event) => {
      messageReceived = true;
      clearTimeout(timeout);
      
      if (event.data.type === 'ready' && event.data.workerId === 'test-scan-worker') {
        console.log('✅ scan-worker config access succeeded');
        console.log(`   Worker ID: ${event.data.workerId}\n`);
        worker.terminate();
        resolve(true);
      } else {
        worker.terminate();
        reject(new Error(`Unexpected message: ${JSON.stringify(event.data)}`));
      }
    };

    worker.onerror = (error) => {
      clearTimeout(timeout);
      worker.terminate();
      reject(error);
    };

    // Send registration message to trigger ready response
    worker.postMessage({ type: 'register', id: 'test-scan-worker' });
  } catch (error) {
    reject(error);
  }
});

// Test 4: Test spline-worker config access
console.log('Test 4: spline-worker config access');
const splineWorkerTest = new Promise<boolean>((resolve, reject) => {
  try {
    // Set config before creating worker
    setEnvironmentData('tes-spline-config', {
      jobs: 5,
      curveType: 'catmull-rom',
    });

    const worker = new Worker(new URL('./spline-worker.ts', import.meta.url), {
      // No env option - using environmentData API
    });

    let completed = 0;
    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error('Timeout: Worker did not complete jobs'));
    }, 10000);

    worker.onmessage = (event) => {
      if (event.data.completed) {
        completed = event.data.completed;
        if (completed >= 5) {
          clearTimeout(timeout);
          console.log('✅ spline-worker config access succeeded');
          console.log(`   Completed ${completed} jobs\n`);
          worker.terminate();
          resolve(true);
        }
      }
    };

    worker.onerror = (error) => {
      clearTimeout(timeout);
      worker.terminate();
      reject(error);
    };

    // Start worker
    worker.postMessage({ start: true });
  } catch (error) {
    reject(error);
  }
});

// Run all tests
async function runTests() {
  try {
    await scanWorkerTest;
    await splineWorkerTest;
    
    console.log('🎉 All tests passed! Worker migration is successful.');
    console.log('\nSummary:');
    console.log('  ✅ setEnvironmentData() API working');
    console.log('  ✅ getEnvironmentData() API working');
    console.log('  ✅ scan-worker config access verified');
    console.log('  ✅ spline-worker config access verified');
    console.log('\nMigration Status: COMPLETE');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

runTests();

