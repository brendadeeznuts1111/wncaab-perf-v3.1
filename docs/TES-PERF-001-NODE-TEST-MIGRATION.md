# TES-PERF-001: node:test Migration Guide

**Date:** 2025-11-12  
**Status:** 📋 **MIGRATION GUIDE**  
**Bun Version:** 1.3.2+

## Overview

Bun now supports the standard `node:test` module, providing a unified testing experience that works in both Bun and Node.js while leveraging Bun's native test runner performance.

## Current State

Our test files currently use `bun:test`:
- `test/getCpuLoad.test.ts` - Uses `bun:test`
- `test/glossary-search.test.ts` - Uses `bun:test`
- `test/unit/service-mapper.test.ts` - Uses `bun:test`
- `test/unit/error-inspector.test.ts` - Uses `bun:test`
- `test/total-market-poller-temporal.test.ts` - Uses `bun:test`
- `test/total-market-poller-enhanced.test.ts` - Uses `bun:test`
- `test/tension-vortex.test.ts` - Uses `bun:test`
- `test/lifecycle-state.test.ts` - Uses `bun:test`
- `test/integration.test.ts` - Uses `bun:test`

## Migration Pattern

### Before (Bun-specific)
```typescript
import { test, describe, expect, beforeEach } from 'bun:test';
```

### After (Node.js compatible)
```typescript
import { test, describe } from 'node:test';
import assert from 'node:assert';
```

## API Differences

### Bun:test → node:test Mapping

| bun:test | node:test | Notes |
|----------|-----------|-------|
| `test()` | `test()` | Same API |
| `describe()` | `describe()` | Same API |
| `expect()` | `assert.strictEqual()` | Use Node.js assert |
| `expect().toBe()` | `assert.strictEqual()` | Use Node.js assert |
| `expect().toBeInstanceOf()` | `assert.ok(instanceof)` | Use Node.js assert |
| `beforeEach()` | `test.beforeEach()` | Slightly different API |
| `afterEach()` | `test.afterEach()` | Slightly different API |
| `mock()` | `test.mock()` | Use Node.js test.mock |

## Migration Example

### Before
```typescript
import { test, expect } from 'bun:test';

test('getCpuLoad returns percentage between 0-100', async () => {
  const cpu = await getCpuLoad();
  expect(cpu).toBeGreaterThanOrEqual(0);
  expect(cpu).toBeLessThanOrEqual(100);
});
```

### After
```typescript
import { test } from 'node:test';
import assert from 'node:assert';

test('getCpuLoad returns percentage between 0-100', async () => {
  const cpu = await getCpuLoad();
  assert.ok(cpu >= 0);
  assert.ok(cpu <= 100);
});
```

## Benefits

- ✅ **Node.js Compatible**: Tests run in both Bun and Node.js
- ✅ **Standard API**: Uses official Node.js test API
- ✅ **Performance**: Still leverages Bun's native test runner
- ✅ **Future-proof**: Aligned with Node.js standards

## Migration Status

**Status:** 📋 **GUIDE CREATED** - Ready for migration when needed

**Note:** Current `bun:test` usage is fine and works well. Migration to `node:test` is optional but recommended for better compatibility.

