import { test, expect } from 'bun:test';

import { getCpuLoad } from '../src/lib/status-aggregator';

test('getCpuLoad returns percentage between 0-100', async () => {
  const cpu = await getCpuLoad();
  
  expect(cpu).toBeGreaterThanOrEqual(0);
  expect(cpu).toBeLessThanOrEqual(100);
  expect(typeof cpu).toBe('number');
  
  // Verify it's rounded to 1 decimal
  expect(cpu.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(1);
});

test('getCpuLoad handles high load correctly', async () => {
  // Force CPU work
  const start = Date.now();
  while (Date.now() - start < 50) {
    // Busy loop
  }
  
  const cpu = await getCpuLoad();
  expect(cpu).toBeGreaterThan(0); // Should detect the busy loop
});

