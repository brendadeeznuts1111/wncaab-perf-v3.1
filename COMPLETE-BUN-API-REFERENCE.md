# Complete Bun Native API Reference

**Version**: Bun 1.3.1+  
**Last Updated**: 2025-11-09  
**Purpose**: Comprehensive reference for all native Bun APIs

---

## 📚 Table of Contents

1. [HTTP Server](#http-server)
2. [Shell](#shell)
3. [Bundler](#bundler)
4. [File I/O](#file-io)
5. [Child Processes](#child-processes)
6. [TCP Sockets](#tcp-sockets)
7. [UDP Sockets](#udp-sockets)
8. [WebSockets](#websockets)
9. [Transpiler](#transpiler)
10. [Routing](#routing)
11. [Streaming HTML](#streaming-html)
12. [Hashing](#hashing)
13. [SQLite](#sqlite)
14. [PostgreSQL Client](#postgresql-client)
15. [Redis (Valkey) Client](#redis-valkey-client)
16. [FFI](#ffi)
17. [DNS](#dns)
18. [Testing](#testing)
19. [Workers](#workers)
20. [Module Loaders](#module-loaders)
21. [Glob](#glob)
22. [Cookies](#cookies)
23. [Node-API](#node-api)
24. [import.meta](#importmeta)
25. [Utilities](#utilities)
26. [Sleep & Timing](#sleep--timing)
27. [Random & UUID](#random--uuid)
28. [System & Environment](#system--environment)
29. [Comparison & Inspection](#comparison--inspection)
30. [String & Text Processing](#string--text-processing)
31. [URL & Path Utilities](#url--path-utilities)
32. [Compression](#compression)
33. [Stream Processing](#stream-processing)
34. [Memory & Buffer Management](#memory--buffer-management)
35. [Module Resolution](#module-resolution)
36. [Parsing & Formatting](#parsing--formatting)
37. [Low-level / Internals](#low-level--internals)

---

## HTTP Server

```typescript
// ✅ Native Bun HTTP server
Bun.serve({
  port: 3000,
  fetch(request) {
    return new Response("Hello World");
  }
});

// ❌ Node.js http (avoid)
import { createServer } from "http";
```

**Features**:
- Built-in HTTP/1.1 and HTTP/2 support
- WebSocket support
- Automatic request parsing
- Zero dependencies

---

## Shell

```typescript
// ✅ Native Bun shell
import { $ } from "bun";

const result = await $`echo "Hello"`;
const output = result.stdout.toString();

// With options
await $`ls -la`.quiet(); // Suppress output
await $`cat file.txt`.text(); // Get text output
```

**Features**:
- Template literal syntax
- Automatic escaping
- Stream support
- Cross-platform

---

## Bundler

```typescript
// ✅ Native Bun bundler
const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "browser",
  minify: true,
  sourcemap: "external"
});
```

**Features**:
- Fast bundling
- Tree-shaking
- Source maps
- Multiple targets

---

## File I/O

```typescript
// ✅ Native Bun file I/O
const file = Bun.file("path/to/file.txt");
const content = await file.text();
const bytes = await file.bytes();
await Bun.write("output.txt", content);

// Standard streams
Bun.stdin.pipeTo(Bun.stdout);
Bun.stderr.write("Error message");
```

**Features**:
- Auto-closes on GC
- Streaming support
- Type detection
- Zero-copy operations

---

## Child Processes

```typescript
// ✅ Native Bun spawn
const proc = Bun.spawn(["ls", "-la"], {
  stdout: "pipe",
  stderr: "pipe"
});

const output = await new Response(proc.stdout).text();

// Synchronous spawn
const result = Bun.spawnSync(["echo", "Hello"]);
```

**Features**:
- Better than Node.js child_process
- Streaming support
- Cross-platform
- Type-safe

---

## TCP Sockets

```typescript
// ✅ Native Bun TCP server
const server = Bun.listen({
  hostname: "localhost",
  port: 3000,
  socket: {
    data(socket, data) {
      socket.write(data);
    },
    open(socket) {
      console.log("Client connected");
    }
  }
});

// TCP client
const socket = Bun.connect({
  hostname: "localhost",
  port: 3000,
  socket: {
    data(socket, data) {
      console.log("Received:", data);
    }
  }
});
```

---

## UDP Sockets

```typescript
// ✅ Native Bun UDP socket
const socket = Bun.udpSocket({
  hostname: "localhost",
  port: 3000,
  socket: {
    data(socket, data, rinfo) {
      socket.send(data, rinfo.port, rinfo.address);
    }
  }
});
```

---

## WebSockets

```typescript
// ✅ Client WebSocket
const ws = new WebSocket("ws://localhost:3000");
ws.onmessage = (event) => {
  console.log(event.data);
};

// ✅ Server WebSocket (via Bun.serve)
Bun.serve({
  fetch(req, server) {
    if (server.upgrade(req)) {
      return; // Upgrade to WebSocket
    }
    return new Response("Not a WebSocket");
  },
  websocket: {
    message(ws, message) {
      ws.send(message);
    }
  }
});
```

---

## Transpiler

```typescript
// ✅ Native Bun transpiler
const transpiler = new Bun.Transpiler({
  loader: "tsx"
});

const output = transpiler.transformSync(`
  import React from "react";
  export default () => <div>Hello</div>;
`);
```

---

## Routing

```typescript
// ✅ File system router
const router = new Bun.FileSystemRouter({
  style: "nextjs",
  dir: "./pages"
});

const route = router.match("/about");
// Returns: { filePath: "./pages/about.tsx", ... }
```

---

## Streaming HTML

```typescript
// ✅ HTML Rewriter (Cloudflare Workers API)
const rewriter = new HTMLRewriter()
  .on("a", {
    element(element) {
      element.setAttribute("target", "_blank");
    }
  });

const response = rewriter.transform(htmlResponse);
```

---

## Hashing

```typescript
// ✅ Password hashing
const hash = await Bun.password.hash("password123");
const isValid = await Bun.password.verify("password123", hash);

// ✅ General hashing
const hash1 = Bun.hash("data", "sha256");
const hash2 = Bun.hash("data", "md5");

// ✅ Crypto hasher (streaming)
const hasher = new Bun.CryptoHasher("sha256");
hasher.update("chunk1");
hasher.update("chunk2");
const digest = hasher.digest("hex");

// ✅ SHA shortcuts
const sha256 = Bun.sha("data", "sha256");
```

---

## SQLite

```typescript
// ✅ Native SQLite
import { Database } from "bun:sqlite";

const db = new Database("mydb.sqlite");
db.run("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)");
db.run("INSERT INTO users (name) VALUES (?)", ["Alice"]);

const users = db.query("SELECT * FROM users").all();
```

---

## PostgreSQL Client

```typescript
// ✅ Native PostgreSQL
const db = Bun.SQL`postgresql://user:pass@localhost/db`;

const users = await db`SELECT * FROM users WHERE id = ${id}`;
await db`INSERT INTO users (name) VALUES (${name})`;
```

---

## Redis (Valkey) Client

```typescript
// ✅ Native Redis client
const redis = Bun.RedisClient.create({
  hostname: "localhost",
  port: 6379
});

await redis.set("key", "value");
const value = await redis.get("key");

// Or use Bun.redis helper
const client = Bun.redis.create({
  hostname: "localhost"
});
```

---

## FFI

```typescript
// ✅ Foreign Function Interface
import { dlopen } from "bun:ffi";

const lib = dlopen("libmylib.so", {
  myFunction: {
    args: ["cstring"],
    returns: "cstring"
  }
});

const result = lib.symbols.myFunction("input");
```

---

## DNS

```typescript
// ✅ DNS operations
const address = await Bun.dns.lookup("example.com");
Bun.dns.prefetch("example.com"); // Prefetch DNS
const stats = Bun.dns.getCacheStats();
```

---

## Testing

```typescript
// ✅ Native test runner
import { test, expect } from "bun:test";

test("addition", () => {
  expect(1 + 1).toBe(2);
});

test("async", async () => {
  const result = await fetch("https://example.com");
  expect(result.ok).toBe(true);
});
```

---

## Workers

```typescript
// ✅ Web Workers
const worker = new Worker(new URL("worker.ts", import.meta.url));
worker.postMessage({ type: "start" });
worker.onmessage = (event) => {
  console.log(event.data);
};
```

---

## Module Loaders

```typescript
// ✅ Bun plugins
Bun.plugin({
  name: "my-plugin",
  setup(build) {
    build.onResolve({ filter: /\.custom$/ }, (args) => {
      return { path: args.path };
    });
  }
});
```

---

## Glob

```typescript
// ✅ Native glob
const glob = new Bun.Glob("**/*.{ts,tsx}");
for await (const file of glob.scan(".")) {
  console.log(file);
}
```

---

## Cookies

```typescript
// ✅ Cookie handling
const cookie = new Bun.Cookie("session", "abc123", {
  httpOnly: true,
  secure: true,
  maxAge: 3600
});

// Cookie map (from request)
const cookies = new Bun.CookieMap(request.headers);
const session = cookies.get("session");
```

---

## Node-API

```typescript
// ✅ Node-API support
// Bun supports Node-API (N-API) for native addons
// Compatible with Node.js native modules
```

---

## import.meta

```typescript
// ✅ import.meta utilities
import.meta.main // Is this the main entry point?
import.meta.dir // Directory of current file
import.meta.path // Path of current file
import.meta.file // Filename of current file
```

---

## Utilities

```typescript
// ✅ Version info
Bun.version // "1.3.1"
Bun.revision // Git revision

// ✅ Environment
Bun.env.NODE_ENV // Environment variables
Bun.main // Main entry point path

// ✅ System info
Bun.which("rg") // Find binary in PATH
```

---

## Sleep & Timing

```typescript
// ✅ Sleep
await Bun.sleep(1000); // Sleep 1 second
Bun.sleepSync(100); // Synchronous sleep

// ✅ High-precision timing
const start = Bun.nanoseconds();
await operation();
const end = Bun.nanoseconds();
const ms = (end - start) / 1_000_000;
```

---

## Random & UUID

```typescript
// ✅ UUID v7 (time-ordered)
const uuid = Bun.randomUUIDv7();
// Returns: "018a1b2c-3d4e-5f6a-7b8c-9d0e1f2a3b4c"
```

---

## System & Environment

```typescript
// ✅ Binary lookup
const rgPath = Bun.which("rg");
if (!rgPath) {
  throw new Error("ripgrep not found");
}
```

---

## Comparison & Inspection

```typescript
// ✅ Peek (synchronous promise value)
const value = Bun.peek(promise); // Get value if resolved

// ✅ Deep equality
const equal = Bun.deepEquals(obj1, obj2);

// ✅ Deep match (pattern matching)
const matched = Bun.deepMatch(obj, pattern);

// ✅ Inspect
const str = Bun.inspect(obj, { colors: true });
```

---

## String & Text Processing

```typescript
// ✅ HTML escaping
const safe = Bun.escapeHTML("<script>alert('xss')</script>");
// Returns: "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;"

// ✅ String width (Unicode-aware)
const width = Bun.stringWidth("Hello 世界"); // 9

// ✅ Index of line
const index = Bun.indexOfLine(text, lineNumber);
```

---

## URL & Path Utilities

```typescript
// ✅ URL to path
const path = Bun.fileURLToPath("file:///path/to/file");
const url = Bun.pathToFileURL("/path/to/file");
```

---

## Compression

```typescript
// ✅ Gzip
const compressed = Bun.gzipSync(data);
const decompressed = Bun.gunzipSync(compressed);

// ✅ Deflate
const deflated = Bun.deflateSync(data);
const inflated = Bun.inflateSync(deflated);

// ✅ Zstd (best compression)
const zstdCompressed = Bun.zstdCompressSync(data, { level: 3 });
const zstdDecompressed = Bun.zstdDecompressSync(zstdCompressed);

// ✅ Async Zstd
const compressed = await Bun.zstdCompress(data, { level: 3 });
const decompressed = await Bun.zstdDecompress(compressed);
```

---

## Stream Processing

```typescript
// ✅ Stream conversions
const bytes = await Bun.readableStreamToBytes(stream);
const blob = await Bun.readableStreamToBlob(stream);
const formData = await Bun.readableStreamToFormData(stream);
const json = await Bun.readableStreamToJSON(stream);
const array = await Bun.readableStreamToArray(stream);
```

---

## Memory & Buffer Management

```typescript
// ✅ ArrayBuffer sink (streaming)
const sink = new Bun.ArrayBufferSink();
sink.write(new Uint8Array([1, 2, 3]));
const result = sink.end();

// ✅ Unsafe allocation (faster, no zero-fill)
const buffer = Bun.allocUnsafe(1024);

// ✅ Concatenate ArrayBuffers
const combined = Bun.concatArrayBuffers([buf1, buf2, buf3]);
```

---

## Module Resolution

```typescript
// ✅ Synchronous resolution
const resolved = Bun.resolveSync("./module.ts", "/path/to/entry");
```

---

## Parsing & Formatting

```typescript
// ✅ Semantic version
const version = Bun.semver.parse("1.2.3");
const isValid = Bun.semver.satisfies("1.2.3", "^1.0.0");
const isGreater = Bun.semver.gt("1.2.3", "1.0.0");

// ✅ TOML parsing
const config = Bun.TOML.parse(tomlString);

// ✅ Color formatting
console.log(Bun.color.red("Error"));
console.log(Bun.color.green("Success"));
console.log(Bun.color.cyan("Info"));
```

---

## Low-level / Internals

```typescript
// ✅ Memory-mapped files
const mmap = Bun.mmap("large-file.bin", { shared: true });

// ✅ Garbage collection
Bun.gc(true); // Full GC
Bun.gc(false); // Incremental GC

// ✅ Heap snapshot
const snapshot = Bun.generateHeapSnapshot();
await Bun.write("heap.heapsnapshot", snapshot);

// ✅ JSC internals
import { jsc } from "bun:jsc";
jsc.describeArray([1, 2, 3]);
```

---

## 📊 Node.js → Bun Migration Map

| Node.js API | Bun Native API | Notes |
|-------------|----------------|-------|
| `http.createServer()` | `Bun.serve()` | Better performance |
| `child_process.exec()` | `$` template | Safer, faster |
| `fs.readFileSync()` | `Bun.file().text()` | Auto-close on GC |
| `fs.writeFileSync()` | `Bun.write()` | Auto-close on GC |
| `zlib.gzipSync()` | `Bun.gzipSync()` | Native, faster |
| `zlib.zstdCompressSync()` | `Bun.zstdCompressSync()` | Native binding |
| `crypto.createHash()` | `Bun.hash()` | Simpler API |
| `crypto.randomUUID()` | `Bun.randomUUIDv7()` | Time-ordered UUIDs |
| `semver` package | `Bun.semver.*` | Zero dependency |
| `toml` package | `Bun.TOML.parse()` | Zero dependency |
| `chalk` package | `Bun.color.*` | Zero dependency |
| `glob` package | `Bun.Glob` | Streaming support |
| `which` command | `Bun.which()` | Instant lookup |

---

## 🎯 Best Practices

1. **Always prefer native Bun APIs** over Node.js compatibility layers
2. **Use `Bun.file()`** for file operations (auto-closes on GC)
3. **Use `$` template** for shell commands (safer than exec)
4. **Use `Bun.nanoseconds()`** for benchmarks (1000x precision)
5. **Use `Bun.color.*`** for console output (terminal-aware)
6. **Use `Bun.semver.*`** for version validation (zero dependency)
7. **Use `Bun.Glob`** for file discovery (streaming support)
8. **Use `Bun.zstdCompressSync()`** for compression (native, faster)

---

**Complete reference for all Bun native APIs. Use this as your migration guide!** 🚀

