# Bun Utilities in Service Mapper - Complete Reference

Based on [Bun Utils Documentation](https://bun.com/docs/runtime/utils), here's what we're using and what else is available:

---

## ✅ **Currently Used Bun Utilities**

### **1. Bun.inspect.table()**
- **Usage**: Format tabular data with colors
- **Location**: `listServices()`, `openDocs()`, `debugService()`, `openLogs()`
- **Benefits**: Native table formatting, ANSI color support, automatic column alignment

### **2. Bun.main**
- **Usage**: Get absolute path to entrypoint script
- **Location**: Help messages throughout
- **Benefits**: Dynamic script path references

### **3. Bun.env**
- **Usage**: Environment variable access (alias for `process.env`)
- **Location**: `showWorktree()`, `validateEnvironment()`
- **Benefits**: Bun-native environment access

### **4. Bun.which()**
- **Usage**: Find executable paths
- **Location**: `openUrl()` for Chrome detection and platform commands
- **Benefits**: Cross-platform executable detection

### **5. Bun.file()**
- **Usage**: File operations and existence checks
- **Location**: `showWorktree()`, `validateEnvironment()`, `openLogs()`
- **Benefits**: Lazy file loading, efficient I/O

### **6. Bun.spawn()**
- **Usage**: Execute external commands
- **Location**: `openUrl()` for opening URLs
- **Benefits**: Process spawning with stdio control

### **7. Bun.nanoseconds()**
- **Usage**: High-precision timing
- **Location**: `healthCheck()` for latency measurement
- **Benefits**: Nanosecond precision timing

### **8. Bun.listen()**
- **Usage**: Port availability checks
- **Location**: `checkServiceHealth()`, `validateEnvironment()`
- **Benefits**: Native TCP socket testing

### **9. Bun.resolveSync()** ⭐ **NEW**
- **Usage**: Resolve file paths using Bun's module resolution
- **Location**: `openDocs()`, `openLogs()`
- **Benefits**: Better path resolution, handles relative paths correctly

### **10. Bun.openInEditor()** ⭐ **NEW**
- **Usage**: Open files in user's default editor
- **Location**: `openDocs()`, `openLogs()`
- **Benefits**: Auto-detects editor from `$VISUAL` or `$EDITOR`, respects `bunfig.toml` config

---

## 🚀 **Additional Bun Utilities Available**

### **String & Text Processing**

#### **Bun.stringWidth()**
- **Purpose**: Get terminal column count (supports ANSI, emoji, wide chars)
- **Performance**: ~6,756x faster than `string-width` npm package
- **Use Case**: Custom table formatting (not needed - `Bun.inspect.table()` handles this)

#### **Bun.escapeHTML()**
- **Purpose**: Escape HTML characters (`<`, `>`, `&`, `"`, `'`)
- **Performance**: 480 MB/s - 20 GB/s on M1X
- **Use Case**: Dashboard widget HTML generation (if needed)

#### **Bun.indexOfLine()**
- **Purpose**: Find line index in text
- **Use Case**: Log file line navigation (could enhance `openLogs()`)

### **Path Utilities**

#### **Bun.fileURLToPath()** / **Bun.pathToFileURL()**
- **Purpose**: Convert between file:// URLs and absolute paths
- **Use Case**: If we need to handle file:// URLs in the future

### **Comparison & Inspection**

#### **Bun.deepEquals()**
- **Purpose**: Deep object comparison (used by `expect().toEqual()`)
- **Use Case**: Service registry validation, configuration comparison

#### **Bun.deepMatch()**
- **Purpose**: Pattern matching for objects
- **Use Case**: Advanced service filtering

#### **Bun.peek()**
- **Purpose**: Read promise result without await (advanced)
- **Use Case**: Performance-critical promise handling (probably not needed)

### **Stream Processing**

#### **Bun.readableStreamToText()** / **Bun.readableStreamToJSON()**
- **Purpose**: Convert ReadableStream to various formats
- **Use Case**: Reading log files as streams (could enhance `openLogs()`)

### **Compression**

#### **Bun.gzipSync()** / **Bun.zstdCompressSync()**
- **Purpose**: Compress/decompress data
- **Use Case**: Caching health check results (performance optimization)

### **Hashing**

#### **Bun.hash()**
- **Purpose**: Fast non-cryptographic hashing (Wyhash)
- **Use Case**: Cache keys for health checks, service registry versioning

### **ANSI Utilities**

#### **Bun.stripANSI()**
- **Purpose**: Remove ANSI escape codes from strings
- **Performance**: ~6-57x faster than `strip-ansi` npm package
- **Use Case**: Log file processing, output sanitization

---

## 💡 **Recommended Enhancements**

### **1. Enhanced Log Viewing with Streams**
```typescript
async function openLogs(serviceName: string) {
  const service = findService(serviceName);
  const logFile = Bun.file(service.logsPath);
  
  // Stream log file for large files
  const stream = logFile.stream();
  const text = await Bun.readableStreamToText(stream);
  
  // Or open in editor (current implementation)
  Bun.openInEditor(resolvedPath);
}
```

### **2. Health Check Caching with Bun.hash()**
```typescript
const healthCache = new Map<string, { result: boolean; timestamp: number }>();

function getHealthCacheKey(service: ServiceDefinition): string {
  return Bun.hash(`${service.url}:${service.name}`).toString();
}
```

### **3. Configuration Comparison with Bun.deepEquals()**
```typescript
function validateServiceRegistry() {
  const expected = loadExpectedRegistry();
  if (!Bun.deepEquals(SERVICE_REGISTRY, expected)) {
    console.log('⚠️  Service registry differs from expected');
  }
}
```

### **4. Log File Line Navigation**
```typescript
async function openLogsAtLine(serviceName: string, lineNumber: number) {
  const resolvedPath = Bun.resolveSync(logPath, process.cwd());
  Bun.openInEditor(resolvedPath, { line: lineNumber });
}
```

---

## 📊 **Performance Comparison**

| Utility | Alternative | Speed Improvement |
|---------|------------|-------------------|
| `Bun.stringWidth()` | `string-width` npm | ~6,756x faster |
| `Bun.stripANSI()` | `strip-ansi` npm | ~6-57x faster |
| `Bun.inspect.table()` | Manual formatting | Native Zig implementation |
| `Bun.file()` | `fs.readFile()` | Zero-copy when possible |
| `Bun.nanoseconds()` | `Date.now()` | Nanosecond precision |

---

## ✅ **Current Implementation Status**

- ✅ **Bun.inspect.table()** - Used for all table output
- ✅ **Bun.main** - Used for dynamic script paths
- ✅ **Bun.env** - Used for environment variables
- ✅ **Bun.which()** - Used for executable detection
- ✅ **Bun.file()** - Used for file operations
- ✅ **Bun.spawn()** - Used for process execution
- ✅ **Bun.nanoseconds()** - Used for timing
- ✅ **Bun.listen()** - Used for port checks
- ✅ **Bun.resolveSync()** - Used for path resolution
- ✅ **Bun.openInEditor()** - Used for opening files

---

## 🎯 **Summary**

The service mapper is now using **10 Bun-native utilities** throughout, making it:
- **Faster** - Native Zig implementations
- **More reliable** - Bun-specific optimizations
- **Cleaner** - Less code, better APIs
- **Cross-platform** - Works everywhere Bun runs

**Reference**: [Bun Utils Documentation](https://bun.com/docs/runtime/utils)

