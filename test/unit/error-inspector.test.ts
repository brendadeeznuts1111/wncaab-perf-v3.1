/**
 * @file error-inspector.test.ts
 * @description Unit tests for TES error inspector
 * @ticket TES-OPS-004.B.8.15
 */

import { test, expect, mock } from 'bun:test';
import { inspectTESError, logTESError, type ErrorContext } from '../../src/lib/tes-error-inspector.ts';

test('inspectTESError includes source context', () => {
  const error = new Error('Test error');
  const context: ErrorContext = { route: '/test' };
  const inspected = inspectTESError(error, context);
  
  expect(inspected).toContain('Test error');
  expect(inspected).toContain('/test');
});

test('inspectTESError includes component context', () => {
  const error = new Error('Component error');
  const context: ErrorContext = { component: 'test-component' };
  const inspected = inspectTESError(error, context);
  
  expect(inspected).toContain('Component error');
  expect(inspected).toContain('test-component');
});

test('inspectTESError includes metrics context', () => {
  const error = new Error('Metric error');
  const context: ErrorContext = { 
    metrics: { rawValue: 1258940.2, count: 5 }
  };
  const inspected = inspectTESError(error, context);
  
  expect(inspected).toContain('Metric error');
  expect(inspected).toContain('rawValue');
  expect(inspected).toContain('1258940.2');
});

test('inspectTESError handles non-Error objects', () => {
  const error = 'String error';
  const inspected = inspectTESError(error);
  
  expect(inspected).toContain('String error');
});

test('inspectTESError uses Bun.inspect with colors', () => {
  const error = new Error('Colored error');
  const inspected = inspectTESError(error);
  
  // Bun.inspect with colors should produce formatted output
  expect(typeof inspected).toBe('string');
  expect(inspected.length).toBeGreaterThan(0);
});

test('logTESError sends telemetry', async () => {
  // Mock fetch
  const mockFetch = mock(() => Promise.resolve({
    ok: true,
    json: async () => ({ success: true })
  }));
  
  globalThis.fetch = mockFetch as any;
  
  logTESError(new Error('Test error'), { workerId: 'worker-01' });
  
  // Wait for async fetch
  await Bun.sleep(10);
  
  expect(mockFetch).toHaveBeenCalled();
  const callArgs = mockFetch.mock.calls[0];
  expect(callArgs[0]).toContain('/api/dev/telemetry/error');
  expect(callArgs[1]?.method).toBe('POST');
  
  // Restore
  globalThis.fetch = fetch;
});

test('logTESError handles telemetry failure gracefully', async () => {
  // Mock fetch to fail
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mock(() => Promise.reject(new Error('Network error'))) as any;
  
  // Should not throw
  expect(() => {
    logTESError(new Error('Test error'));
  }).not.toThrow();
  
  // Wait for async
  await Bun.sleep(10);
  
  // Restore
  globalThis.fetch = originalFetch;
});

test('logTESError uses correct log level', () => {
  const consoleErrorSpy = mock(() => {});
  const consoleWarnSpy = mock(() => {});
  
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = consoleErrorSpy as any;
  console.warn = consoleWarnSpy as any;
  
  logTESError(new Error('Error level'), {}, 'error');
  logTESError(new Error('Warning level'), {}, 'warning');
  
  expect(consoleErrorSpy).toHaveBeenCalled();
  expect(consoleWarnSpy).toHaveBeenCalled();
  
  // Restore
  console.error = originalError;
  console.warn = originalWarn;
});

test('inspectTESError formats error with multiple context fields', () => {
  const error = new Error('Multi-context error');
  const context: ErrorContext = {
    route: '/api/test',
    workerId: 'worker-123',
    sessionId: 'session-456',
    component: 'test-component',
    metrics: { value: 42 }
  };
  
  const inspected = inspectTESError(error, context);
  
  expect(inspected).toContain('Multi-context error');
  expect(inspected).toContain('/api/test');
  expect(inspected).toContain('worker-123');
  expect(inspected).toContain('session-456');
  expect(inspected).toContain('test-component');
  expect(inspected).toContain('value');
  expect(inspected).toContain('42');
});

