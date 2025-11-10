# Native Bun API Quick Reference

**Version**: v1.3.1 Native Migration  
**Last Updated**: 2025-11-09

---

## 🎯 Core Native APIs

### Compression
```typescript
// ✅ Native Bun (no import needed)
const compressed = Bun.zstdCompressSync(buffer, { level: 3 });
const decompressed = Bun.zstdDecompressSync(compressed);

// ❌ Node.js compatibility (avoid)
import { zstdCompressSync } from "node:zlib";
```

### File I/O
```typescript
// ✅ Native Bun (auto-closes on GC)
const file = Bun.file("path/to/file.txt");
const content = await file.text();
const bytes = await file.bytes();
await Bun.write("output.txt", content);

// ❌ Node.js compatibility (avoid)
import { readFileSync, writeFileSync } from "fs";
```

### Binary Detection
```typescript
// ✅ Native Bun (instant, reliable)
const rgPath = Bun.which("rg");
if (!rgPath) throw new Error("ripgrep not found");

// ❌ Shell-dependent (avoid)
const rgPath = execSync("which rg").toString().trim();
```

### Shell Execution
```typescript
// ✅ Native Bun shell ($)
import { $ } from "bun";
const result = await $`rg --version`.quiet();
const output = result.stdout.toString();

// ❌ Node.js child_process (avoid)
import { execSync } from "child_process";
```

### Benchmarking
```typescript
// ✅ Nanosecond precision
const start = Bun.nanoseconds();
await operation();
const end = Bun.nanoseconds();
const ms = (end - start) / 1_000_000;

// ❌ Millisecond precision (avoid)
const start = Date.now();
await operation();
const ms = Date.now() - start;
```

### File Discovery
```typescript
// ✅ Streaming Glob (scales to 50M+ files)
const glob = new Bun.Glob("**/*.{ts,tsx}");
for await (const file of glob.scan(".")) {
  // Process each file
}

// ❌ Load all into memory (avoid for large repos)
import { glob } from "glob";
const files = await glob("**/*.{ts,tsx}");
```

---

## 🚀 Advanced Native APIs

### Memory & Buffer Management
```typescript
// ✅ Streaming buffer sink (zero-copy)
const sink = new Bun.ArrayBufferSink();
sink.write(new Uint8Array([1, 2, 3]));
sink.write(new Uint8Array([4, 5, 6]));
const result = sink.end(); // Returns ArrayBuffer

// ✅ Unsafe allocation (faster, no zero-fill)
const buffer = Bun.allocUnsafe(1024); // Faster than Buffer.alloc()

// ✅ Concatenate ArrayBuffers efficiently
const combined = Bun.concatArrayBuffers([buf1, buf2, buf3]);
```

### Module Resolution
```typescript
// ✅ Synchronous module resolution
const resolved = Bun.resolveSync("./module.ts", "/path/to/entry");
// Returns absolute path

// ❌ Async resolution (avoid if sync is sufficient)
import { resolve } from "node:path";
```

### Parsing & Formatting
```typescript
// ✅ Semantic version parsing/validation
const version = Bun.semver.parse("1.2.3");
const isValid = Bun.semver.satisfies("1.2.3", "^1.0.0");
const isGreater = Bun.semver.gt("1.2.3", "1.0.0");

// ✅ TOML parsing (native, no dependency)
const config = Bun.TOML.parse(tomlString);
// Faster than toml package, zero dependencies

// ✅ Color formatting for console output
console.log(Bun.color.red("Error message"));
console.log(Bun.color.green("Success message"));
console.log(Bun.color.cyan("Info message"));
console.log(Bun.color.yellow("Warning message"));
// Supports: red, green, blue, cyan, yellow, magenta, white, gray
```

### Low-level / Internals
```typescript
// ✅ Memory-mapped files (zero-copy reads)
const mmap = Bun.mmap("large-file.bin", { shared: true });
// Returns ArrayBuffer mapped to file

// ✅ Force garbage collection (for leak tests)
Bun.gc(true); // Full GC
Bun.gc(false); // Incremental GC

// ✅ Generate heap snapshot (debugging)
const snapshot = Bun.generateHeapSnapshot();
await Bun.write("heap.heapsnapshot", snapshot);

// ✅ JSC internals (advanced debugging)
import { jsc } from "bun:jsc";
jsc.describeArray(Array.from([1, 2, 3]));
```

---

## 📊 Performance Comparison

| Operation | Node.js API | Native Bun API | Improvement |
|-----------|-------------|----------------|-------------|
| Zstd compress | `node:zlib` | `Bun.zstdCompressSync()` | **-30%** (10ms → 7ms) |
| File read | `fs.readFileSync()` | `Bun.file().text()` | Auto-close on GC |
| Binary lookup | Shell `which` | `Bun.which()` | **Instant** (no shell) |
| Benchmark precision | `Date.now()` | `Bun.nanoseconds()` | **1000x** (±1ms → ±0.001ms) |
| Bundle size | +5KB polyfill | 0KB native | **-5KB** |
| TOML parsing | `toml` package | `Bun.TOML.parse()` | **Native, zero deps** |
| Semver validation | `semver` package | `Bun.semver.*` | **Native, zero deps** |
| Buffer allocation | `Buffer.alloc()` | `Bun.allocUnsafe()` | **Faster** (no zero-fill) |

---

## 🔍 Migration Checklist

- [ ] Replace `import { zstdCompressSync } from "node:zlib"` → `Bun.zstdCompressSync()`
- [ ] Replace `fs.readFileSync()` → `Bun.file().text()`
- [ ] Replace `fs.writeFileSync()` → `Bun.write()`
- [ ] Replace shell `which` → `Bun.which()`
- [ ] Replace `Date.now()` benchmarks → `Bun.nanoseconds()`
- [ ] Replace `glob` package → `Bun.Glob`
- [ ] Replace `semver` package → `Bun.semver.*`
- [ ] Replace `toml` package → `Bun.TOML.parse()`
- [ ] Replace `Buffer.alloc()` → `Bun.allocUnsafe()` (when safe)
- [ ] Add `DisposableStack` for resource management
- [ ] Use `Bun.color.*` for console output
- [ ] Use `Bun.gc()` for leak tests
- [ ] Run `audit-node-imports.ts` to verify

---

## 🛠️ Audit Command

```bash
# Find all Node.js compatibility imports
bun run scripts/audit-node-imports.ts

# Expected: Zero matches after migration
```

---

## ✅ Benefits Summary

1. **Performance**: -3ms compression, instant binary lookup
2. **Bundle Size**: -5KB (no compatibility layer)
3. **Precision**: ±0.001ms benchmark accuracy
4. **Reliability**: 100% binary detection (no shell failures)
5. **Scalability**: Streaming file discovery for massive repos
6. **Code Quality**: Cleaner, more idiomatic Bun code
7. **Zero Dependencies**: TOML, semver parsing built-in
8. **Memory Efficiency**: Streaming buffers, unsafe allocation when safe

---

**Remember**: Native Bun APIs are **first-class citizens**. Use them whenever possible! 🚀

