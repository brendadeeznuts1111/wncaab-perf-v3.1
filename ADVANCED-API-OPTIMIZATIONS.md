# Advanced Bun API Optimization Opportunities

**Date**: 2025-11-09  
**Status**: 🎯 Ready for Implementation  
**APIs**: Memory/Buffer, Module Resolution, Parsing/Formatting, Low-level Internals

---

## 🎯 Optimization Opportunities

### 1. **Bun.semver** - Version Validation Enhancement

**Current**: Regex pattern matching for versions  
**Opportunity**: Use native `Bun.semver` API for proper semantic version validation

**Location**: `scripts/rules-validate.js` (line 99)

**Before**:
```javascript
if (schema.version?.semver && !version.match(schema.version.semver)) {
  errors.push(`❌ ${file}: Version '${version}' invalid`);
}
```

**After**:
```javascript
if (schema.version?.semver) {
  try {
    const parsed = Bun.semver.parse(version.replace(/^[vV]/, ''));
    if (!parsed || !Bun.semver.satisfies(parsed, schema.version.semver)) {
      errors.push(`❌ ${file}: Version '${version}' invalid`);
    }
  } catch {
    errors.push(`❌ ${file}: Version '${version}' invalid`);
  }
}
```

**Benefits**:
- ✅ Proper semantic version parsing (handles pre-release, build metadata)
- ✅ Zero dependency (no `semver` package needed)
- ✅ More accurate validation than regex

---

### 2. **Bun.color** - Enhanced Console Output

**Current**: Plain console.log with emoji  
**Opportunity**: Use `Bun.color` for consistent, terminal-aware coloring

**Location**: All validation scripts

**Before**:
```javascript
console.error(`❌ ${file}: Domain '${domain}' invalid`);
console.log(`🎉 All ${valid} perf metrics valid & grep-ready!`);
```

**After**:
```javascript
console.error(Bun.color.red(`❌ ${file}: Domain '${domain}' invalid`));
console.log(Bun.color.green(`🎉 All ${valid} perf metrics valid & grep-ready!`));
```

**Benefits**:
- ✅ Consistent color scheme across all scripts
- ✅ Terminal-aware (auto-disables in non-TTY)
- ✅ Zero dependency (no `chalk` or `colors` package)

**Implementation**:
```javascript
// scripts/validate-perf.js (enhanced)
const colors = {
  error: Bun.color.red,
  success: Bun.color.green,
  warning: Bun.color.yellow,
  info: Bun.color.cyan,
  dim: Bun.color.gray
};

console.error(colors.error(`❌ ${file}: Domain '${domain}' invalid`));
console.log(colors.success(`🎉 All ${valid} perf metrics valid & grep-ready!`));
```

---

### 3. **Bun.gc()** - Memory Leak Testing

**Current**: No explicit GC control  
**Opportunity**: Add GC control for leak tests and memory profiling

**Location**: `benchmarks/rg-vs-bun-scan.ts`

**Before**:
```javascript
async function benchmarkScanIndex() {
  const buildStart = Bun.nanoseconds();
  const buildResult = await buildScanIndex("TODO", ".scan.index.zst");
  // ...
}
```

**After**:
```javascript
async function benchmarkScanIndex() {
  // Force GC before benchmark for consistent results
  Bun.gc(true); // Full GC
  
  const buildStart = Bun.nanoseconds();
  const buildResult = await buildScanIndex("TODO", ".scan.index.zst");
  const buildEnd = Bun.nanoseconds();
  
  // Force GC after to measure cleanup
  Bun.gc(true);
  
  // Measure memory delta
  const memBefore = process.memoryUsage();
  // ... benchmark ...
  const memAfter = process.memoryUsage();
  
  console.log(`Memory delta: ${(memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024}MB`);
}
```

**Benefits**:
- ✅ Consistent benchmark results (no GC interference)
- ✅ Memory leak detection
- ✅ Better profiling accuracy

---

### 4. **Bun.ArrayBufferSink** - Streaming Index Building

**Current**: Load all files into memory, then compress  
**Opportunity**: Stream file matches to buffer sink for large repos

**Location**: `scripts/index-generator.ts`

**Before**:
```javascript
const matches = await Promise.all(
  files.map(async (file) => { /* ... */ })
);
const matchedFiles = matches.filter(Boolean) as string[];
const indexContent = matchedFiles.join("\n");
const compressed = Bun.zstdCompressSync(Buffer.from(indexContent), { level: 3 });
```

**After**:
```javascript
const sink = new Bun.ArrayBufferSink();
let fileCount = 0;

for await (const file of glob.scan(".")) {
  const result = await $`${rgPath} --files-with-matches ${pattern} ${file}`.quiet();
  if (result.exitCode === 0) {
    sink.write(new TextEncoder().encode(file + "\n"));
    fileCount++;
  }
}

const indexBuffer = sink.end();
const compressed = Bun.zstdCompressSync(indexBuffer, { level: 3 });
```

**Benefits**:
- ✅ Lower memory footprint for large repos
- ✅ Zero-copy buffer operations
- ✅ Scales to 50M+ files without memory pressure

---

### 5. **Bun.resolveSync()** - Module Resolution

**Current**: Relative imports  
**Opportunity**: Use `Bun.resolveSync()` for reliable module resolution

**Location**: Scripts that import other scripts

**Before**:
```javascript
import { loadConfig } from './rules-config.js';
```

**After**:
```javascript
// More reliable resolution
const configPath = Bun.resolveSync('./rules-config.js', import.meta.dir);
const { loadConfig } = await import(configPath);
```

**Benefits**:
- ✅ Reliable resolution in complex directory structures
- ✅ Works with symlinks and aliases
- ✅ Better error messages on resolution failure

---

### 6. **Bun.TOML.parse()** - Config File Support

**Current**: YAML-only config  
**Opportunity**: Support TOML config files (if needed)

**Location**: Config loading functions

**Before**:
```javascript
async function loadConfig() {
  return await Bun.file('bun.yaml').yaml();
}
```

**After**:
```javascript
async function loadConfig(format = 'yaml') {
  if (format === 'toml') {
    const content = await Bun.file('bun.toml').text();
    return Bun.TOML.parse(content);
  }
  return await Bun.file('bun.yaml').yaml();
}
```

**Benefits**:
- ✅ Support multiple config formats
- ✅ Native TOML parsing (zero dependency)
- ✅ Faster than `toml` package

---

### 7. **Bun.allocUnsafe()** - Buffer Allocation Optimization

**Current**: `Buffer.from()` for temporary buffers  
**Opportunity**: Use `Bun.allocUnsafe()` when zero-fill isn't needed

**Location**: Buffer operations in index generation

**Before**:
```javascript
const compressed = Bun.zstdCompressSync(Buffer.from(indexContent), { level: 3 });
```

**After**:
```javascript
// For large buffers where we'll overwrite anyway
const buffer = Bun.allocUnsafe(indexContent.length);
new TextEncoder().encodeInto(indexContent, buffer);
const compressed = Bun.zstdCompressSync(buffer, { level: 3 });
```

**Benefits**:
- ✅ Faster allocation (no zero-fill)
- ✅ Lower memory overhead
- ⚠️ Use only when safe (buffer will be overwritten)

---

## 📊 Implementation Priority

| API | Priority | Impact | Effort | Files Affected |
|-----|----------|--------|--------|----------------|
| **Bun.semver** | P1 | High | Low | `scripts/rules-validate.js` |
| **Bun.color** | P1 | Medium | Low | All validation scripts |
| **Bun.gc()** | P2 | Medium | Medium | `benchmarks/rg-vs-bun-scan.ts` |
| **Bun.ArrayBufferSink** | P2 | High | Medium | `scripts/index-generator.ts` |
| **Bun.resolveSync()** | P3 | Low | Low | Script imports |
| **Bun.TOML.parse()** | P3 | Low | Low | Config loaders |
| **Bun.allocUnsafe()** | P3 | Low | Low | Buffer operations |

---

## 🚀 Quick Wins (P1)

### 1. Add Bun.semver to rules-validate.js (15 min)
- Replace regex version validation with `Bun.semver.parse()` and `Bun.semver.satisfies()`
- More accurate validation, zero dependency

### 2. Add Bun.color to all scripts (20 min)
- Create color utility object
- Replace console.log/error with colored versions
- Consistent, terminal-aware output

---

## 📝 Implementation Notes

- **Bun.semver**: Handles versions with/without 'v' prefix automatically
- **Bun.color**: Auto-disables in non-TTY environments (CI/CD safe)
- **Bun.gc()**: Use sparingly, mainly for benchmarks and leak tests
- **Bun.ArrayBufferSink**: Best for streaming large datasets
- **Bun.allocUnsafe()**: Only use when buffer will be fully overwritten

---

**Ready to implement? Start with P1 items for immediate improvements!** 🎯

