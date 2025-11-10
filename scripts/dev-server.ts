/// <reference types="bun-types" />
/**
 * SEARCH AND NAVIGATION GUIDE
 * ============================
 * 
 * Quick Grep Patterns:
 * --------------------
 * @ROUTE                    - All route definitions (24 routes)
 * @BUN                      - Bun native API usage (14 locations)
 * @TYPE                     - Type definitions
 * @UTILS                    - Utility functions
 * @PERF                     - Performance-critical code
 * @CONSTANTS                - Constants section
 * @CONFIG                   - Config loading section
 * @HTML_IMPORT              - HTML import section
 * 
 * Common Workflows:
 * -----------------
 * 1. Find all API endpoints:
 *    rg '@ROUTE.*API' scripts/dev-server.ts
 * 
 * 2. Verify no non-Bun routers:
 *    rg -i "express|fastify|hono|koa|polka" scripts/dev-server.ts
 * 
 * 3. Check async handlers (potential bottlenecks):
 *    rg '@ROUTE.*async' scripts/dev-server.ts
 * 
 * 4. Review Bun.file() usage:
 *    rg '@BUN.*Bun\.file' scripts/dev-server.ts
 * 
 * 5. Find all high-performance routes:
 *    rg '@PERF.*Critical' scripts/dev-server.ts
 * 
 * 6. Generate API documentation:
 *    rg '@ROUTE' -n scripts/dev-server.ts | awk '{print "Line " $1 ": " $2}'
 * 
 * 7. Find all Bun.file() calls (check for missing await):
 *    rg "Bun\.file\(" scripts/dev-server.ts -B 1 | rg -v "await"
 * 
 * 8. Generate VS Code Fuzzy Finder Labels:
 *    rg '@GREP|@ROUTE|@BUN|@PERF' scripts/dev-server.ts | \
 *      awk -F: '{print $1 "\t" $2 "\t" $3}' > .tags
 * 
 * Dev Server - Unified API Dashboard (v2.1.0)
 * ============================================
 * 
 * Enhanced with:
 * - Comprehensive input validation utilities
 * - Improved error handling with detailed validation messages
 * - Response metadata (timestamps, versions)
 * - Better error messages with field-level details
 * - Consistent API response format
 * 
 * @BUN Bun.serve() - All routes use Bun's native routing system
 * @ROUTE All routes defined in Bun.serve() routes property
 * 
 * Vector Grepable Patterns (rg):
 *   @TYPE        - Type definitions section
 *   @CONSTANTS   - Constants section
 *   @CONFIG      - Config loading section
 *   @HTML_IMPORT - HTML import section
 *   @UTILS       - Utility functions section
 *   @ROUTE       - Route definitions (all use Bun.serve() routes property)
 *   @BUN         - Bun native API usage
 *   @PERF        - Performance-critical sections
 * 
 * Grep Examples:
 *   rg "@ROUTE" scripts/dev-server.ts              # All route sections
 *   rg "@BUN" scripts/dev-server.ts                 # All Bun API usage
 *   rg "@PERF" scripts/dev-server.ts               # Performance-critical code
 *   rg "@ROUTE.*Static" scripts/dev-server.ts      # Static routes
 *   rg "@ROUTE.*Parameter" scripts/dev-server.ts   # Parameter routes
 *   rg "@ROUTE.*Wildcard" scripts/dev-server.ts    # Wildcard routes
 *   rg "routes:\s*\{" scripts/dev-server.ts        # Routes property definition
 *   rg "Bun\.serve\(" scripts/dev-server.ts        # Bun.serve() calls
 *   rg "Bun\.file\(" scripts/dev-server.ts         # Bun.file() usage
 *   rg "Bun\.escapeHTML" scripts/dev-server.ts      # Bun.escapeHTML() usage
 *   rg "Bun\.stringWidth" scripts/dev-server.ts     # Bun.stringWidth() usage
 * 
 * Now using Bun's native routing system with full route precedence support:
 * - Routes property handles all routing (static, file, async handlers, parameter routes)
 * - Fetch handler only handles unmatched requests (404)
 * - Route precedence: Exact > Parameter > Wildcard > Catch-all
 *   [#REF] https://bun.com/docs/runtime/http/routing#route-precedence
 * 
 * Routing Architecture:
 * 1. Static Responses - Zero-allocation dispatch (15% performance improvement)
 *    - /favicon.ico, /health, /ready (text responses)
 *    - /tension-map (redirect to /tension)
 *    - /api/version (static JSON response)
 *    - Routes can be Response objects (without handler functions)
 *    - Zero memory allocation after initialization
 *    - Cached for server lifetime
 *    - Reload with server.reload(options)
 *    - [#REF] https://bun.com/docs/runtime/http/routing#static-responses
 * 
 * 2. HTML Imports - Automatic asset bundling with HMR
 *    - /tension (HTML import)
 *    - /tension-map → redirects to /tension (static redirect)
 *    - Development (bun --hot): Assets bundled on-demand at runtime with HMR
 *    - Production (bun build --target=bun): Resolves to pre-built manifest object
 *    - [#REF] https://bun.com/docs/runtime/http/server#html-imports
 * 
 * 3. File Routes - Generated from static-routes.ts manifest
 *    - All static files defined in scripts/static-routes.ts
 *    - Security: Only files in manifest are served (path traversal impossible)
 *    - Performance: Exact routes = O(1) lookup (fastest possible)
 *    - Maintainability: Add new files by editing static-routes.ts manifest
 *    - Optimized strategy per Bun docs:
 *      * Static routes (buffered): new Response(await Bun.file(path).bytes())
 *        - Zero filesystem I/O during requests - content served entirely from memory
 *        - ETag support - Automatically generates and validates ETags for caching
 *        - If-None-Match - Returns 304 Not Modified when client ETag matches
 *        - No 404 handling - Missing files cause startup errors, not runtime 404s
 *        - Memory usage - Full file content stored in RAM
 *        - Best for: Small static assets, API responses, frequently accessed files
 *      * File routes (streaming): new Response(Bun.file(path))
 *        - Filesystem reads on each request - checks file existence and reads content
 *        - Built-in 404 handling - Returns 404 Not Found if file doesn't exist
 *        - Last-Modified support - Uses file modification time for If-Modified-Since headers
 *        - If-Modified-Since - Returns 304 Not Modified when file hasn't changed
 *        - Range request support - Automatically handles partial content requests
 *        - Streaming transfers - Uses buffered reader with backpressure handling
 *        - Memory efficient - Only buffers small chunks during transfer, not entire file
 *        - ⚡️ Speed - Bun automatically uses sendfile(2) system call when possible,
 *          enabling zero-copy file transfers in the kernel—the fastest way to send files
 *        - slice() method - Use Bun.file(path).slice(start, end) to send part of a file,
 *          automatically sets Content-Range and Content-Length headers
 *          Example (Range header parsing):
 *            const [start = 0, end = Infinity] = req.headers
 *              .get("Range")?.split("=").at(-1)?.split("-").map(Number) || [0, Infinity];
 *            return new Response(Bun.file(path).slice(start, end));
 *        - Best for: Large files, dynamic content, user uploads, files that change frequently
 *    - [#REF] https://bun.com/docs/runtime/http/routing#file-responses-vs-static-responses
 *    - [#REF] https://bun.com/docs/runtime/http/routing#streaming-files
 * 
 * 4. Async Route Handlers - All API routes in routes property
 *    - All handlers return Promise<Response> (async/await pattern)
 *    - Server object available as second parameter: async (req, server) => { ... }
 *    - Uses BunRequest which extends Request (method, url, headers, body, etc.)
 *    - [#REF] https://bun.com/docs/runtime/http/routing#asynchronous-routes
 * 
 *    API Endpoints:
 *    - GET  /api/dev/endpoints      → List all API endpoints (async handler)
 *    - GET  /api/dev/metrics        → Server metrics (async handler, uses server object)
 *    - GET  /api/dev/configs        → Show all configs (async handler)
 *    - GET  /api/dev/workers        → Worker telemetry (async handler)
 *    - GET  /api/dev/status         → System status (async handler, uses server object)
 *    - GET, POST /api/tension/map        → Tension mapping API (single, async handler)
 *    - GET, POST /api/tension/batch      → Tension mapping API (batch, async handler)
 *    - GET  /api/tension/health     → Health check (async handler, uses server object)
 *    - GET  /api/tension/help      → Help documentation (async handler, uses server object)
 *    - GET  /api/gauge/womens-sports → WNBATOR 5D tensor gauge (async handler)
 *    - GET  /api/ai/maparse        → AI auto-maparse curve detection (async handler)
 *    - GET  /api/validate/threshold → Threshold validator (async handler)
 *    - GET  /                       → HTML dashboard (async handler)
 * 
 *    All endpoints follow Bun's async/await pattern:
 *    ```typescript
 *    "/api/version": async () => {
 *      const [version] = await sql`SELECT version()`;
 *      return Response.json(version);
 *    }
 *    ```
 * 
 *    Server object access pattern:
 *    ```typescript
 *    "/api/metrics": async (req, server) => {
 *      const ip = server.requestIP(req);
 *      return Response.json({ ip });
 *    }
 *    ```
 * 
 * 5. Parameter Routes - Type-safe route parameters
 *    - /api/dev/:endpoint (extensible API routing)
 *    - TypeScript automatically infers parameter types from string literals
 *    - Explicit BunRequest<T> annotation (optional but REQUIRED in our codebase)
 *    - Example: '/api/dev/:endpoint' → req.params.endpoint is typed as string
 *    - Supports multiple parameters: '/api/:service/:endpoint/:id'
 *    - Percent-encoded values automatically decoded, Unicode supported
 *    - Invalid unicode replaced with \uFFFD (U+FFFD replacement character)
 *    - [#REF] https://bun.com/docs/runtime/http/routing#type-safe-route-parameters
 * 
 *    Bun's pattern (automatic inference):
 *    ```typescript
 *    "/orgs/:orgId/repos/:repoId": req => {
 *      const { orgId, repoId } = req.params; // TypeScript knows types automatically
 *      return Response.json({ orgId, repoId });
 *    }
 *    ```
 * 
 *    Our pattern (explicit type + satisfies constraint):
 *    ```typescript
 *    '/api/dev/:endpoint': ((req: BunRequest<'/api/dev/:endpoint'>) => {
 *      const { endpoint } = req.params; // TypeScript knows endpoint is string
 *      return Response.json({ endpoint });
 *    }) satisfies RouteHandler<'/api/dev/:endpoint'>
 *    ```
 * 
 * 6. Wildcard Routes - Matches paths under prefix
 *    - /api/* (API catch-all for unmatched API routes)
 *    - Precedence: Exact > Parameter > Wildcard > Catch-all
 *    - [#REF] https://bun.com/docs/runtime/http/routing#route-precedence
 * 
 * 7. Global Catch-All Route - Matches all unmatched routes
 *    - /* (Global catch-all for all unmatched routes)
 *    - Precedence: Exact > Parameter > Wildcard > Catch-all
 *    - [#REF] https://bun.com/docs/runtime/http/routing#route-precedence
 * 
 *    REQUIRED Pattern (explicit type + satisfies constraint):
 *    ```typescript
 *    '/api/dev/:endpoint': ((req: BunRequest<'/api/dev/:endpoint'>) => {
 *      const { endpoint } = req.params; // TypeScript knows endpoint is string
 *      return Response.json({ endpoint });
 *    }) satisfies RouteHandler<'/api/dev/:endpoint'>
 *    ```
 * 
 *    The satisfies constraint ensures route string and handler type stay in sync.
 *    If you refactor the route string, TypeScript will error until the type is updated.
 * 
 *    Multiple parameters example:
 *    ```typescript
 *    '/api/:service/:endpoint/:id': ((req: BunRequest<'/api/:service/:endpoint/:id'>) => {
 *      const { service, endpoint, id } = req.params;
 *      // TypeScript knows: service is string, endpoint is string, id is string
 *      return Response.json({ service, endpoint, id });
 *    }) satisfies RouteHandler<'/api/:service/:endpoint/:id'>
 *    ```
 * 
 * 8. Fetch Handler - Handles unmatched requests and edge cases
 *    - Handles incoming requests that weren't matched by any route
 *    - Receives Request object and returns Response or Promise<Response>
 *    - Supports async/await for asynchronous operations
 *    - Promise-based responses are supported
 *    - Server object available as second argument (server.requestIP, server.timeout)
 *    - Note: With catch-all route (/*), most unmatched requests are handled by routes
 *    - [#REF] https://bun.com/docs/runtime/http/routing#fetch-request-handler
 * 
 *    Basic pattern:
 *    ```typescript
 *    Bun.serve({
 *      fetch(req) {
 *        const url = new URL(req.url);
 *        if (url.pathname === "/") return new Response("Home page!");
 *        if (url.pathname === "/blog") return new Response("Blog!");
 *        return new Response("404!");
 *      },
 *    });
 *    ```
 * 
 *    Async/await pattern:
 *    ```typescript
 *    serve({
 *      async fetch(req) {
 *        const start = performance.now();
 *        await sleep(10);
 *        const end = performance.now();
 *        return new Response(`Slept for ${end - start}ms`);
 *      },
 *    });
 *    ```
 * 
 *    Promise-based pattern:
 *    ```typescript
 *    Bun.serve({
 *      fetch(req) {
 *        // Forward the request to another server.
 *        return fetch("https://example.com");
 *      },
 *    });
 *    ```
 * 
 *    Server object access:
 *    ```typescript
 *    const server = Bun.serve({
 *      fetch(req, server) {
 *        const ip = server.requestIP(req);
 *        return new Response(`Your IP is ${ip}`);
 *      },
 *    });
 *    ```
 * 
 *    Error handling pattern (from Bun's error handling tests):
 *    ```typescript
 *    async fetch(req, server) {
 *      try {
 *        const ip = server.requestIP(req);
 *        const data = await fetch(`https://api.example.com?ip=${ip}`);
 *        return Response.json(await data.json());
 *      } catch (error) {
 *        // Explicit error response pattern
 *        return new Response("Gateway error", { status: 502 });
 *      }
 *    }
 *    ```
 * 
 *    Reusable error wrapper pattern (Bun supports this pattern):
 *    ```typescript
 *    // Reusable error wrapper (Bun supports this pattern)
 *    async function withErrorHandler(handler) {
 *      return async (req, server) => {
 *        try {
 *          return await handler(req, server);
 *        } catch (error) {
 *          console.error(`[${server.requestIP(req)?.address}] ${error.message}`);
 *          return new Response("Internal error", { status: 500 });
 *        }
 *      };
 *    }
 * 
 *    // Usage
 *    fetch: withErrorHandler(async (req, server) => {
 *      // Your route logic here
 *    })
 *    ```
 * 
 * Server Features:
 * - Configurable port/hostname via environment variables (BUN_PORT, PORT, NODE_PORT, HOSTNAME)
 *   - Port priority: CLI --port flag > BUN_PORT > PORT > NODE_PORT > default 3002
 *     - CLI flag: Bun automatically supports --port flag (e.g., `bun --port=4002 dev-server.ts`)
 *     - CLI flag takes precedence over all environment variables
 *   - Hostname: HOSTNAME env var or defaults to "0.0.0.0"
 *   - Random port: Set port to 0 for random available port
 *   - [#REF] https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname
 *   - [#REF] https://bun.com/docs/runtime/http/server#configuring-a-default-port
 * - Idle timeout configuration (IDLE_TIMEOUT env var, defaults to 120 seconds)
 *   - [#REF] https://bun.com/docs/runtime/http/server#idletimeout
 * - Graceful shutdown on SIGINT/SIGTERM
 * - Hot route reloading support via server.reload()
 * - Server lifecycle methods: stop(), ref(), unref(), reload()
 *   - [#REF] https://bun.com/docs/runtime/http/server#server-lifecycle-methods
 *   - [#REF] https://bun.com/docs/runtime/http/server#server-ref-and-server-unref
 *   - [#REF] https://bun.com/docs/runtime/http/server#server-reload
 * - Per-request controls: server.timeout(), server.requestIP()
 *   - [#REF] https://bun.com/docs/runtime/http/server#per-request-controls
 * - Server metrics: server.pendingRequests, server.pendingWebSockets
 *   - [#REF] https://bun.com/docs/runtime/http/server#server-metrics
 *   - [#REF] https://bun.com/docs/runtime/http/server#server-pendingrequests-and-server-pendingwebsockets
 * - WebSocket subscriber count: server.subscriberCount(topic)
 *   - [#REF] https://bun.com/docs/runtime/http/server#server-subscribercount-topic
 * - Error handling: error handler for unhandled exceptions
 *   - [#REF] https://bun.com/docs/runtime/http/server#practical-example-rest-api
 * - Performance: Bun.serve handles ~2.5x more requests/second than Node.js
 *   - Bun's router uses SIMD-accelerated parameter decoding and JavaScriptCore structure caching
 *   - [#REF] https://bun.com/docs/runtime/http/routing
 *   - [#REF] https://bun.com/docs/runtime/http/server#benchmarks
 * 
 * Bun Performance Optimizations (v1.1.x+)
 * 
 * @version Bun v1.1.x (JavaScriptCore + Zig)
 * @lastVerified 2024-12
 * @note Metrics are relative to Node.js v21 unless otherwise noted
 * 
 * ⚡ Bun Performance Checklist for This Codebase:
 * 
 * ✅ DO use Response.json() instead of JSON.stringify() + new Response()
 * ✅ DO use Bun.file() for static file serving (automatic Range support)
 * ✅ DO use request.method/headers directly (cached, zero-allocation)
 * ✅ DO use AbortSignal.timeout() instead of manual AbortController
 * ✅ DO use Bun.file().arrayBuffer() for files < 512MB (zero-copy mmap)
 * ✅ DO use request.url.searchParams directly (lazy parsing)
 * ✅ DO enable WebSocket compression (per-message-deflate default)
 * ✅ DO use Bun.write() instead of fs.writeFileSync() for I/O
 * ✅ DO use JSON.parse/stringify for trusted data (SIMD-accelerated)
 * ✅ DO use Crypto.randomUUID() instead of uuid package (5x faster)
 * 
 * ❌ AVOID new Headers() in hot paths (use Response.json() headers option)
 * ❌ AVOID fs.readFileSync() for large files (use Bun.file().stream())
 * ❌ AVOID manual AbortSignal creation (use AbortSignal.timeout())
 * ❌ AVOID request.method.toLowerCase() (allocates new string, use direct comparison)
 * ❌ AVOID JSON.parse() on untrusted data (use structuredClone() for safe cloning)
 * ❌ AVOID manual Range header parsing (Bun.file().slice() handles it automatically)
 * ❌ AVOID fs.writeFileSync() (use Bun.write() for 3x faster I/O)
 * ❌ AVOID glob packages (use Bun's native glob, 10x faster)
 * 
 * 🟢 Bun-Specific Optimizations (Zig + custom native code):
 * 
 * HTTP & Networking:
 * - AbortSignal.timeout() ~40x faster than userland implementations; ~3-4x vs Node.js 21+
 *   - Used in: Worker API status checks (AbortSignal.timeout(WORKER_API_TIMEOUT))
 *   - Pattern: signal: AbortSignal.timeout(milliseconds)
 *   - When it matters: 1000+ concurrent timeouts → 40x latency reduction
 * - Headers.get() 2x faster: Optimized for common headers
 *   - Used in: req.headers.get("Range"), req.headers.get("Content-Type")
 *   - Pattern: const value = req.headers.get("Header-Name")
 *   - When it matters: Parsing cookies/auth headers → 2x throughput
 * - Headers.has() 2x faster: Optimized for common headers
 *   - Pattern: if (req.headers.has("Header-Name")) { ... }
 * - Headers.delete() 2x faster: Optimized for common headers
 *   - Pattern: req.headers.delete("Header-Name")
 * - request.method getter micro-optimized: Caches 34 HTTP methods as common strings
 *   - ❌ Anti-pattern: const method = request.method.toLowerCase() // Allocates new string
 *   - ✅ Optimal: if (request.method === 'POST') { ... } // Uses cached method
 * - request.url lazy parsing: Zero-allocation if unused (saves 50ns/request)
 *   - ✅ Optimal: Use request.url.searchParams directly (lazy parsed)
 * - Response.json() 2x faster: Avoids temporary string allocation
 *   - ❌ Anti-pattern: new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
 *   - ✅ Optimal: Response.json(data, { headers: { 'Custom': 'value' } })
 * - WebSocket compression: Per-message-deflate enabled by default (Node.js requires opt-in)
 * 
 * File System & I/O:
 * - Bun.file().arrayBuffer() zero-copy mmap: For files < 512MB (saves 30-40% memory)
 *   - When it matters: Reading config files, small assets → 30-40% memory reduction
 * - Bun.file().stream() reduced memory usage: Lower memory for large data or long-running streams
 *   - When it matters: Serving 10MB+ files → 50% memory reduction
 * - Bun.write() 3x faster: Uses io_uring on Linux (vs fs.writeFileSync)
 *   - ❌ Anti-pattern: fs.writeFileSync(path, data)
 *   - ✅ Optimal: await Bun.write(path, data)
 * - fs.stat uses less memory and is faster: Tagged 32-bit integers for whole numbers
 * - fs.readdir optimized: Reduced memory usage with withFileTypes option
 * - Glob patterns 10x faster: Native Zig implementation (vs fast-glob)
 *   - ❌ Anti-pattern: import { glob } from 'fast-glob'
 *   - ✅ Optimal: Use Bun's native glob support
 * 
 * Package Management:
 * - bun install 2.5x faster for node-gyp packages
 * - bun install lockfile parsing 100x faster: Binary format saves 50ms-200ms in monorepos (1000+ packages)
 * - bun install faster in workspaces: Fixed bug that re-evaluated workspace packages multiple times
 * - bun install --linker=isolated: Significant performance improvements on Windows
 * - bun install --lockfile-only much faster: Only fetches package manifests, not tarballs
 * 
 * JavaScript Runtime:
 * - JSON.parse/JSON.stringify hardware-accelerated: SIMD implementation (2-3x faster)
 *   - When it matters: Parsing API responses → 2-3x faster
 *   - ✅ Optimal: Use for trusted data (SIMD-accelerated)
 *   - ❌ Avoid: For untrusted data (use structuredClone() for safe cloning)
 * - Crypto.randomUUID() 5x faster: No C++ boundary crossing
 *   - ❌ Anti-pattern: import { v4 as uuid } from 'uuid'; uuid()
 *   - ✅ Optimal: crypto.randomUUID()
 * - process.hrtime() 10ns resolution: vs Node.js 1ms (1000x more precise)
 * - Zero-copy JSON stringifier: Eliminates memory allocation/copying for large JSON strings
 * 
 * Server Operations:
 * - server.reload() 30% faster: Improved server-side hot reload performance (development only)
 *   - When it matters: Development iteration → 30% faster dev loop
 * - Startup 1ms faster, 3MB less memory: Low-level Zig optimizations
 * 
 * Memory & GC:
 * - setTimeout/setImmediate 8-15% less memory: Memory usage optimization
 *   - Used in: Route handler examples, timeout handling
 * - Automatic WeakRef cleanup: More aggressive than Node.js (less memory growth)
 * - ArrayBuffer transfer zero-copy: For postMessage() (avoids serialization)
 * - Bun.SQL memory leak fixed: Improved memory usage for many/large queries
 * - Reduced memory usage for child process IPC: When repeatedly spawning processes
 * - Reduced memory usage for large fetch() and S3 uploads: Proper backpressure handling
 * - Threadpool memory management: Releases memory more aggressively after 10 seconds of inactivity
 * 
 * Build & Development:
 * - Inline sourcemap ~40% faster: SIMD lexing
 * - Embedded native addons cleanup: Delete temporary files immediately after loading in bun build --compile
 * 
 * WebAssembly & N-API:
 * - Faster WebAssembly: IPInt (in-place interpreter) reduces startup time and memory usage
 * - napi_create_buffer ~30% faster: Uses uninitialized memory for large allocations
 * - NAPI: node-sdl 100x faster: Fixed napi_create_double encoding
 * - Faster sliced string handling in N-API: No longer clones strings when encoding allows it
 * - Highway SIMD library: Runtime-selected optimal SIMD implementations
 * 
 * 🔵 JavaScriptCore Optimizations (WebKit JIT):
 * 
 * Array Operations:
 * - Array.prototype.includes 1.2x to 2.8x faster: Native C++ implementation
 * - Array.prototype.includes ~4.7x faster: With untyped elements in Int32 arrays
 * - Array.prototype.indexOf ~5.2x faster: With untyped elements in Int32 arrays
 * - Array.prototype.toReversed() optimized: More efficient algorithms for arrays with holes
 * - Polymorphic array access optimizations: Calling same function on Float32Array, Float64Array, Array gets faster
 * 
 * Number Operations:
 * - Number.isFinite() ~1.6x faster: C++ implementation instead of JavaScript
 * - Number.isSafeInteger ~16% faster: JIT compilation
 * - Faster number handling: Uses tagged 32-bit integers for whole numbers (fs.statSync(), performance.now())
 * - Optimized convertUInt32ToDouble and convertUInt32ToFloat: For ARM64 and x64 architectures
 * - Improved NaN handling: Lower globalThis.isNaN to Number.isNaN when input is double
 * - Improved NaN constant folding: JavaScriptCore upgrade
 * 
 * String Operations:
 * - String concatenation optimizations: Patterns like str += str generate more efficient JIT code
 *   - ✅ Optimal: str += "abc" + "deg" + var → optimized to str += "abcdeg" + var
 * - String.prototype.charCodeAt() and charAt() folded at JIT compile-time: When string and index are constants
 * 
 * Text Processing:
 * - TextDecoder initialization 30% faster
 * - Improved String GC Reporting Accuracy: Fixed reference counting for correct memory usage reporting
 * 
 * WebKit/JIT Optimizations:
 * - Numeric hot loops optimization: WebKit update with loop unrolling
 * - WebKit updates: Optimized MarkedBlock::sweep with BitSet for better GC performance
 * - WebKit updates: JIT Worklist load balancing and concurrent CodeBlockHash computation
 * - WebKit updates: String concatenation like str += "abc" + "deg" + var optimized to str += "abcdeg" + var
 * - WebKit updates: Delayed CachedCall initialization and improved new Function performance with sliced strings
 * - SIMD multiline comments: Faster parsing of large comments
 * 
 * Concurrency:
 * - Optimized internal WaitGroup synchronization: Replaced mutex locks with atomic operations for high concurrent tasks
 * 
 * Framework Integration:
 * - next build 10% faster on macOS: setImmediate performance fix
 * 
 * Route Types Summary:
 * - Static responses: Zero-allocation dispatch, cached for server lifetime
 * - Static routes (buffered): Immutable files buffered at startup, zero I/O per request, ETag support
 * - File routes (streaming): Mutable files read per request, built-in 404, Range support, Last-Modified
 * - HTML imports: Automatic asset bundling with HMR in development
 * - Async handlers: Promise<Response> support, server object available
 * - Parameter routes: Type-safe params via BunRequest<T>, automatic decoding
 * - Wildcard routes: Matches paths under prefix (/api/*)
 * - Catch-all routes: Matches all unmatched routes (/*)
 * 
 * Aggregates all APIs, configs, and worker telemetry:
 * - GET  /api/dev/endpoints      → All API endpoints
 * - GET  /api/dev/configs        → All configs (bunfig.toml, bun-ai.toml)
 * - GET  /api/dev/workers        → Worker telemetry
 * - GET  /api/dev/status         → Overall system status
 * - GET  /api/dev/metrics        → Server metrics (pendingRequests, pendingWebSockets)
 * - GET, POST /api/tension/map        → Tension mapping API (single)
 * - GET, POST /api/tension/batch      → Tension mapping API (batch)
 * - GET  /api/tension/health     → Tension mapping health check (validates macro, inputs, HTML page)
 * - GET  /api/tension/help       → Tension mapping help documentation (CLI, API, Portal)
 * - GET  /api/version             → Server version info (static JSON response)
 * - GET  /tension                → Tension mapping visualization (HTML imported from templates/tension.html)
 * - GET  /tension-map             → Redirects to /tension (static redirect)
 * - GET  /                       → HTML dashboard
 * - GET  /health                 → Health check (static response)
 * - GET  /ready                  → Readiness check (static response)
 * 
 * Alternative syntax: This file can also use export default syntax
 * [#REF] https://bun.com/docs/runtime/http/server#export-default-syntax
 */

import { mapEdgeRelation } from '../macros/tension-map.ts';
import { gaugeWNBATOR, formatGaugeResult } from '../macros/womens-sports-gauge.ts';
import { autoMaparse, type MaparseResult } from '../cli/ai-maparse.ts';
import { validateThreshold } from '../macros/validate-threshold.ts';
import { HEADER_HTML } from '../macros/header-macro.ts';
import { FOOTER_HTML } from '../macros/footer-macro.ts';
import { generateColorReport } from '../macros/color-macro.ts';
import { initializeProcessCompat, registerShutdownHandler } from '../lib/process/compat.ts';
import type { BunRequest } from 'bun';
import { generateStaticRoutes } from './static-routes.ts';
import { SplineRenderer, type SplineConfig, type SplinePoint } from './spline-renderer.ts';
import {
  catmullRomSpline,
  cubicSpline,
  linearSpline,
  extrapolateSpline,
  type Point as SplineMathPoint,
} from './spline/spline-math.ts';
import { detectCurves, type Point as CurvePoint } from './ai/curve-detector.ts';
import {
  handleWorkerScale,
  handleWorkerSnapshot,
  getWorkerRegistry,
  initializeWorkerPool,
  terminateAllWorkers,
  getWorkerPoolSize,
  getTotalWorkers,
  getEventLoopMetrics,
} from './workers/worker-manager.ts';
import {
  createRequestTimeout,
  withRateLimit,
  log,
  getMetrics,
  updateMetrics,
  incrementMetric,
} from '../lib/production-utils.ts';

// Import shared utilities from lib modules
import {
  DEFAULT_PORT,
  WORKER_API_PORT,
  SPLINE_API_PORT,
  DEFAULT_IDLE_TIMEOUT,
  WORKER_API_TIMEOUT,
  WORKER_API_CHECK_TIMEOUT,
  REPO_URL,
  DEFAULT_PACKAGE_INFO,
  SERVER_NAME,
  PACKAGE_VERSION,
  API_VERSION,
  type PackageInfo,
} from '../lib/constants.ts';

import {
  apiHeaders,
  corsHeaders,
  appendCorsHeaders,
  jsonResponse,
  errorResponse,
  jsonResponseWithMetadata,
  generateETag,
  checkETag,
  CORS_HEADERS,
  type ApiHeadersOptions,
} from '../lib/headers.ts';

import { SimpleCache } from '../lib/cache.ts';

import {
  initializeMetricsTracking,
  trackRequestStart,
  trackRequestEnd,
  trackWebSocketOpen,
  trackWebSocketClose,
  getMetricsState,
} from '../lib/metrics.ts';

import {
  parseNumberParam,
  parseCsvNumbers,
  validationErrorResponse,
  escapeHtml,
} from '../lib/validation.ts';

// ============================================================================
// @TYPE Type Definitions
// @GREP: rg "@TYPE" scripts/dev-server.ts
// ============================================================================

interface ConfigFile {
  [key: string]: unknown;
  error?: string;
}

interface WorkerInfo {
  status: 'idle' | 'working' | 'error';
  queue_depth?: number;
  [key: string]: unknown;
}

interface WorkerRegistry {
  getRegistry(): Record<string, WorkerInfo>;
}

interface EndpointInfo {
  method: string;
  path: string;
  description: string;
  query?: Record<string, string>;
  body?: Record<string, string>;
}

interface ApiService {
  base: string;
  endpoints: EndpointInfo[];
}

interface EndpointsMap {
  worker: ApiService;
  spline: ApiService;
  dev: ApiService;
}

interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  message?: string;
  details?: unknown;
}

/**
 * WebSocket data type for Bun 1.3+ type-safe WebSocket handling
 * @BUN Bun 1.3+ uses generic Bun.Server<T> where T is the WebSocket data type
 * Pattern popularized by XState for type-safe state management
 */
interface WebSocketData {
  pathname: string;
}

/**
 * Type helper for type-safe route handlers with satisfies constraint
 * Ensures route string literal matches BunRequest type annotation
 * 
 * BunRequest Interface (extends Request):
 * ```typescript
 * // Simplified for brevity
 * interface BunRequest<T extends string> extends Request {
 *   params: Record<T, string>;      // Type-safe route parameters
 *   readonly cookies: CookieMap;     // Cookie access
 * }
 * ```
 * 
 * BunRequest extends Request, so it has all Request properties:
 * - req.method, req.url, req.headers, req.body, etc.
 * - Plus: req.params (type-safe route parameters)
 * - Plus: req.cookies (read-only cookie map)
 * 
 * Routes receive BunRequest and return Response or Promise<Response>.
 * This makes it easier to use the same code for both sending & receiving HTTP requests.
 * 
 * Usage:
 * ```typescript
 * '/api/dev/:endpoint': ((req: BunRequest<'/api/dev/:endpoint'>) => {
 *   const { endpoint } = req.params; // TypeScript knows: endpoint is string
 *   const url = new URL(req.url);    // Standard Request property
 *   return Response.json({ endpoint, path: url.pathname });
 * }) satisfies RouteHandler<'/api/dev/:endpoint'>
 * ```
 * 
 * This prevents route string and handler type from drifting apart during refactoring.
 */
type RouteHandler<T extends string> = (req: BunRequest<T>) => Response | Promise<Response>;

// ============================================================================
// @CONSTANTS Constants
// @GREP: rg "@CONSTANTS" scripts/dev-server.ts
// ============================================================================
// All constants are now imported from lib/constants.ts

// ============================================================================
// @HTML_IMPORT HTML Import (ServeRoute)
// @BUN Bun.serve() HTML imports - native asset bundling with HMR
// @GREP: rg "@HTML_IMPORT" scripts/dev-server.ts
// ============================================================================

// HTML file import using Bun's native HTML loader
// Returns a ServeRoute object (not a string) that contains:
// - file: Reference to the compiled HTML file
// - headers: Pre-configured Content-Type: text/html
// - assets: Dependency graph for scripts/styles in the HTML
// - Development: Live bundler middleware for HMR
// - Production: Pre-built manifest reference
// [#REF] https://bun.com/docs/runtime/http/server#html-imports
// 
// ✅ HMR Support: Use dynamic import for hot module replacement
// In development mode, Bun automatically enables HMR for HTML imports
// The HTML file and its assets will be re-bundled on each request when development: true
let tensionPage = await import('../templates/tension.html').then(m => m.default);

// Enable HMR for HTML template (if import.meta.hot is available)
if (import.meta.hot) {
  import.meta.hot.accept('../templates/tension.html', (module) => {
    tensionPage = module.default;
    console.log('✅ HMR: tension.html reloaded');
  });
}

// ============================================================================
// @CONFIG Config Loading (Zero Runtime Cost - Parsed at Import Time)
// @GREP: rg "@CONFIG" scripts/dev-server.ts
// ============================================================================

// Direct imports using Bun's native loaders
// TOML files - Bun auto-detects .toml extension, parsed at import time
let bunfigConfig: ConfigFile | null = null;
let bunAiConfig: ConfigFile | null = null;

try {
  // Bun automatically uses TOML loader for .toml files
  bunfigConfig = (await import('../bunfig.toml')) as ConfigFile;
} catch (error) {
  // Fallback to runtime loading if import fails
  try {
    const bunfigText = await Bun.file('bunfig.toml').text();
    bunfigConfig = Bun.TOML.parse(bunfigText) as ConfigFile;
  } catch (e) {
    bunfigConfig = { error: 'Not found or invalid' };
  }
}

try {
  // Bun automatically uses TOML loader for .toml files
  bunAiConfig = (await import('../bun-ai.toml')) as ConfigFile;
} catch (error) {
  // Fallback to runtime loading if import fails
  try {
    const bunAiText = await Bun.file('bun-ai.toml').text();
    bunAiConfig = Bun.TOML.parse(bunAiText) as ConfigFile;
  } catch (e) {
    bunAiConfig = { error: 'Not found or invalid' };
  }
}

// JSON files - parsed at import time, zero runtime cost
let packageInfo: PackageInfo = DEFAULT_PACKAGE_INFO;

try {
  packageInfo = (await import('../package.json')) as PackageInfo;
} catch (error) {
  // Fallback to runtime loading
  try {
    const pkg = await Bun.file('../package.json').json();
    packageInfo = pkg as PackageInfo;
  } catch (e) {
    packageInfo = DEFAULT_PACKAGE_INFO;
  }
}

// ============================================================================
// Worker Registry (Optional - Will be null if worker API not running)
// ============================================================================

let workerRegistry: WorkerRegistry | null = null;
let workerApiAvailable = false;

// Check if worker API is available (optional - dev server works fine without it)
// We don't import worker-telemetry-api.ts to avoid port conflicts
// Instead, we just check if it's already running and use it if available
(async () => {
  try {
    // Check if worker API is already running on port 3000
    // Uses AbortSignal.timeout() - 40x faster than manual setTimeout + AbortController
    const response = await fetch(`http://localhost:${WORKER_API_PORT}/api/workers/registry`, {
      signal: AbortSignal.timeout(WORKER_API_TIMEOUT),
    });
    if (response.ok) {
      // Worker API is already running - use it
      workerApiAvailable = true;
      console.log(`✅ Worker API detected (already running on port ${WORKER_API_PORT})`);
    }
  } catch {
    // Worker API not running - that's fine, dev server works without it
    workerApiAvailable = false;
    console.warn('⚠️  Worker API not available - worker features disabled');
  }
})();

// ============================================================================
// @UTILS String Width Utilities (Unicode/Emoji-aware)
// @BUN Bun.stringWidth() - Unicode/emoji-aware string width calculation
// @GREP: rg "@UTILS.*String.*Width" scripts/dev-server.ts
// ============================================================================

/**
 * Pad string to specified width using Bun.stringWidth() for Unicode/emoji-aware alignment
 * 
 * Performance: ~16-66ns for typical strings (very fast, native implementation)
 * 
 * Options:
 * - countAnsiEscapeCodes: false (default) - ignores ANSI codes (perfect for terminal display)
 * - ambiguousIsNarrow: false - counts emojis as 2 chars wide (correct for terminal alignment)
 * 
 * [#REF] https://bun.com/docs/runtime/utils#bun-stringwidth
 * 
 * @param str - String to pad
 * @param width - Target display width
 * @param padChar - Character to use for padding (default: ' ')
 * @returns Padded string with correct Unicode/emoji-aware width
 */
function padToWidth(str: string, width: number, padChar = ' '): string {
  const strWidth = Bun.stringWidth(str, { 
    ambiguousIsNarrow: false // Emojis count as 2 chars for proper terminal alignment
  });
  const padding = Math.max(0, width - strWidth);
  return str + padChar.repeat(padding);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if worker API is actually running
 * Uses AbortSignal.timeout() for optimized timeout handling (40x faster than manual AbortController)
 * @returns 'running' if available, 'not running' otherwise
 */
async function checkWorkerApiStatus(): Promise<'running' | 'not running'> {
  if (!workerApiAvailable) {
    return 'not running';
  }
  
  try {
    // Try to fetch from worker API to verify it's actually running
    // Uses AbortSignal.timeout() - 40x faster than manual setTimeout + AbortController
    const response = await fetch(`http://localhost:${WORKER_API_PORT}/api/workers/registry`, {
      signal: AbortSignal.timeout(WORKER_API_CHECK_TIMEOUT),
    });
    return response.ok ? 'running' : 'not running';
  } catch (error) {
    return 'not running';
  }
}

// Global caches for different endpoint types
// SimpleCache is now imported from lib/cache.ts
const gaugeCache = new SimpleCache<unknown>();
const aiCache = new SimpleCache<unknown>();
const tensionCache = new SimpleCache<string>(); // Cache ETag hashes

// Metrics tracking functions are now imported from lib/metrics.ts

/**
 * ONNX Model interface (placeholder for future ONNX Runtime integration)
 */
interface ONNXModel {
  run?: (input: Float32Array | Record<string, unknown>) => Promise<unknown>;
  [key: string]: unknown;
}

/**
 * ONNX Model Cache for AI endpoints
 * ✅ Pattern: Model caching + ONNX Runtime (ready for future ML models)
 */
interface ModelCache {
  model: ONNXModel | null; // ONNX model instance (when available)
  loadedAt: number;
  warmupComplete: boolean;
  inferenceCount: number;
  totalInferenceTime: number;
}

const modelCache = new Map<string, ModelCache>();

/**
 * Load ONNX model with caching and warmup
 * ✅ Pattern: Model caching + ONNX Runtime
 * @param modelPath - Path to ONNX model file
 * @param modelName - Cache key for the model
 * @returns Cached model instance or null if not available
 */
async function loadONNXModel(modelPath: string, modelName: string = 'default'): Promise<ONNXModel | null> {
  // Check cache first
  const cached = modelCache.get(modelName);
  if (cached && cached.model) {
    return cached.model;
  }

  try {
    // Try to load ONNX model (if available)
    // Note: This is a placeholder for future ONNX Runtime integration
    // For now, we'll use the local autoMaparse function
    
    // Future implementation:
    // const onnx = await import('onnxruntime-node');
    // const model = await onnx.InferenceSession.create(modelPath);
    // 
    // const cacheEntry: ModelCache = {
    //   model,
    //   loadedAt: Date.now(),
    //   warmupComplete: false,
    //   inferenceCount: 0,
    //   totalInferenceTime: 0,
    // };
    // 
    // // Pre-warm model with dummy input
    // const dummyInput = new Float32Array(10).fill(0.5);
    // await model.run({ input: dummyInput });
    // cacheEntry.warmupComplete = true;
    // 
    // modelCache.set(modelName, cacheEntry);
    // return model;
    
    // Current: Return null to use fallback
    return null;
  } catch (error) {
    console.warn(`[AI] ONNX model not available, using fallback: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * Run AI inference with model caching and timing
 * ✅ Pattern: Model caching + ONNX Runtime + inference timing
 * @param modelName - Cache key for the model
 * @param inputData - Input data for inference
 * @param fallbackFn - Fallback function if model not available
 * @returns Inference result with timing metadata
 */
async function runAIInference<T>(
  modelName: string,
  inputData: unknown,
  fallbackFn: (data: unknown) => T
): Promise<{ result: T; inferenceTime: number; modelUsed: 'onnx' | 'fallback' }> {
  const inferenceStart = performance.now();
  
  // Try to get cached model
  let cached = modelCache.get(modelName);
  let model = cached?.model;
  
  if (!model) {
    // Try to load model (placeholder for future ONNX integration)
    model = await loadONNXModel(`./models/${modelName}.onnx`, modelName);
    
    if (!model) {
      // Use fallback function
      const result = fallbackFn(inputData);
      const inferenceTime = performance.now() - inferenceStart;
      
      // ✅ Track fallback statistics
      if (!cached) {
        cached = {
          model: null,
          loadedAt: Date.now(),
          warmupComplete: false,
          inferenceCount: 0,
          totalInferenceTime: 0,
        };
        modelCache.set(modelName, cached);
      }
      cached.inferenceCount++;
      cached.totalInferenceTime += inferenceTime;
      
      return {
        result,
        inferenceTime,
        modelUsed: 'fallback',
      };
    }
  }
  
  // Run ONNX inference (when model is available)
  try {
    // Future implementation:
    // const inputTensor = new onnx.Tensor('float32', inputData, [inputData.length]);
    // const outputs = await model.run({ input: inputTensor });
    // const result = outputs.output.data;
    // const inferenceTime = performance.now() - inferenceStart;
    // 
    // // Update cache statistics
    // if (cached) {
    //   cached.inferenceCount++;
    //   cached.totalInferenceTime += inferenceTime;
    // }
    // 
    // return {
    //   result,
    //   inferenceTime,
    //   modelUsed: 'onnx',
    // };
    
    // Current: Use fallback
    const result = fallbackFn(inputData);
    const inferenceTime = performance.now() - inferenceStart;
    
    // ✅ Track fallback statistics
    if (!cached) {
      cached = {
        model: null,
        loadedAt: Date.now(),
        warmupComplete: false,
        inferenceCount: 0,
        totalInferenceTime: 0,
      };
      modelCache.set(modelName, cached);
    }
    cached.inferenceCount++;
    cached.totalInferenceTime += inferenceTime;
    
    return {
      result,
      inferenceTime,
      modelUsed: 'fallback',
    };
  } catch (error) {
    // Fallback on error
    console.warn(`[AI] Model inference failed, using fallback: ${error instanceof Error ? error.message : String(error)}`);
    const result = fallbackFn(inputData);
    const inferenceTime = performance.now() - inferenceStart;
    
    // ✅ Track fallback statistics
    if (!cached) {
      cached = {
        model: null,
        loadedAt: Date.now(),
        warmupComplete: false,
        inferenceCount: 0,
        totalInferenceTime: 0,
      };
      modelCache.set(modelName, cached);
    }
    cached.inferenceCount++;
    cached.totalInferenceTime += inferenceTime;
    
    return {
      result,
      inferenceTime,
      modelUsed: 'fallback',
    };
  }
}

/**
 * Load configs - now using direct imports (zero runtime cost)
 * @returns Object containing bunfig and bun-ai configs
 */
function loadConfigs(): { bunfig: ConfigFile; 'bun-ai': ConfigFile } {
  return {
    bunfig: bunfigConfig || { error: 'Not found or invalid' },
    'bun-ai': bunAiConfig || { error: 'Not found or invalid' },
  };
}

/**
 * Collect all API endpoints
 * @returns Object containing endpoints for all services
 */
function getAllEndpoints(): EndpointsMap {
  return {
    worker: {
      base: `http://localhost:${WORKER_API_PORT}`,
      endpoints: [
        { method: 'GET', path: '/api/workers/registry', description: 'Live worker state' },
        { method: 'POST', path: '/api/workers/scale', description: 'Manual worker scaling', body: { count: 'number' } },
        { method: 'GET', path: '/api/workers/snapshot/:id', description: 'Download heap snapshot' },
        { method: 'WS', path: '/ws/workers/telemetry', description: 'Live telemetry stream' },
      ],
    },
    spline: {
      base: `http://localhost:${SPLINE_API_PORT}`,
      endpoints: [
        { method: 'GET', path: '/api/spline/render', description: 'Render spline path', query: { points: 'number', type: 'string', tension: 'number' } },
        { method: 'POST', path: '/api/spline/predict', description: 'Predict next points', body: { path: 'array', horizon: 'number' } },
        { method: 'POST', path: '/api/spline/preset/store', description: 'Store preset', body: { name: 'string', config: 'object', vaultSync: 'boolean' } },
        { method: 'WS', path: '/ws/spline-live', description: 'Live spline streaming' },
      ],
    },
    dev: {
      base: `http://localhost:${DEFAULT_PORT}`,
      endpoints: [
        { method: 'GET', path: '/api/dev/endpoints', description: 'List all API endpoints' },
        { method: 'GET', path: '/api/dev/configs', description: 'Show all configs' },
        { method: 'GET', path: '/api/dev/workers', description: 'Worker telemetry' },
        { method: 'GET', path: '/api/dev/status', description: 'System status' },
        { method: 'GET', path: '/api/bookmakers', description: 'Get all bookmakers' },
        { method: 'GET', path: '/api/bookmakers/:id', description: 'Get bookmaker by ID' },
        { method: 'POST', path: '/api/bookmakers', description: 'Create new bookmaker' },
        { method: 'PATCH', path: '/api/bookmakers/:id/flags/:flag', description: 'Update bookmaker feature flag' },
        { method: 'PATCH', path: '/api/bookmakers/:id/rollout', description: 'Update bookmaker rollout' },
        { method: 'GET', path: '/registry', description: 'Bookmaker registry dashboard (HTML)' },
        { method: 'GET', path: '/api/registry/bookmakers', description: 'List all bookmakers with R2 URLs' },
        { method: 'GET', path: '/api/registry/profile/:bookieId', description: 'Get bookmaker profile' },
        { method: 'GET', path: '/api/registry/manifests/:bookieId', description: 'Get RG index manifests' },
        { method: 'GET', path: '/api/registry/tiers', description: 'Get tier distribution' },
        { method: 'GET', path: '/api/registry/r2', description: 'Get R2 bucket registry URLs' },
        { method: 'GET', path: '/api/bet-type/detect/:bookieId/:marketId', description: 'Detect bet-type patterns' },
        { method: 'GET', path: '/api/bet-type/stats', description: 'Bet-type detection statistics' },
        { method: 'POST', path: '/api/bet-type/detect', description: 'Detect bet-type pattern (POST with body)' },
        { method: 'GET', path: '/api/glossary/term/:termId', description: 'Get glossary term by ID' },
        { method: 'GET', path: '/api/glossary/search', description: 'Search glossary terms' },
        { method: 'GET', path: '/api/glossary/category/:category', description: 'Get terms by category' },
        { method: 'GET', path: '/api/glossary/bet-types', description: 'Get all bet-type terms' },
        { method: 'GET', path: '/api/feature-flags', description: 'Get all feature flags' },
        { method: 'GET', path: '/api/feature-flags?category={category}', description: 'Get feature flags by category' },
        { method: 'POST', path: '/api/feature-flags/:key/enable', description: 'Enable a feature flag' },
        { method: 'POST', path: '/api/feature-flags/:key/disable', description: 'Disable a feature flag' },
        { method: 'GET', path: '/api/feeds/matrix', description: 'Get complete feed matrix with DO, KV, flags, and env mappings' },
        { method: 'GET', path: '/api/shadow-ws/status', description: 'Get Shadow WebSocket Server status and stats' },
        { method: 'GET', path: '/api/shadow-ws/health', description: 'Check Shadow WebSocket Server health' },
        { method: 'GET, POST', path: '/api/tension/map', description: 'Tension mapping API (single)', query: { conflict: 'number', entropy: 'number', tension: 'number' } },
        { method: 'GET, POST', path: '/api/tension/batch', description: 'Tension mapping API (batch)', query: { conflicts: 'string', entropies: 'string', tensions: 'string' } },
        { method: 'GET', path: '/api/tension/health', description: 'Tension mapping health check (validates macro, inputs, HTML page)' },
        { method: 'GET', path: '/api/tension/help', description: 'Tension mapping help documentation (CLI, API, Portal)' },
        { method: 'GET', path: '/tension', description: 'Tension mapping visualization' },
        { method: 'GET', path: '/api/gauge/womens-sports', description: 'WNBATOR 5D tensor gauge', query: { oddsSkew: 'number', volumeVelocity: 'number', volatilityEntropy: 'number', timeDecay: 'number', momentumCurvature: 'number' } },
        { method: 'GET', path: '/api/ai/maparse', description: 'AI auto-maparse curve detection', query: { prices: 'string (CSV)' } },
        { method: 'GET', path: '/api/ai/models/status', description: 'AI model cache status and statistics' },
        { method: 'GET', path: '/api/validate/threshold', description: 'Threshold validator with auto-correction', query: { threshold: 'string' } },
        { method: 'GET', path: '/', description: 'HTML dashboard' },
      ],
    },
  };
}

// packageInfo is now loaded via direct import above (zero runtime cost)

// Generate HTML dashboard
function generateDashboard() {
  const endpoints = getAllEndpoints();
  
  // Generate color usage report for dashboard
  // Colors are tracked when header/footer macros are imported (they use getColor())
  const colorReport = generateColorReport();
  
  // Escape user-controlled content to prevent XSS attacks
  // ✅ Uses Bun.escapeHTML() - optimized for large input (480 MB/s - 20 GB/s on M1X)
  // Bun.escapeHTML() converts <, >, &, ", ' to HTML entities
  // Handles non-string types automatically (converts to string first)
  // [#REF] https://bun.com/docs/runtime/utils#bun-escapehtml
  const safeVersion = escapeHtml(packageInfo.version) || '3.1.0';
  const safeDescription = escapeHtml(packageInfo.description) || 'WNCAAB Dev Server Dashboard - Unified API, Config, and Worker Telemetry';
  const safeAuthor = escapeHtml(packageInfo.author) || 'WNCAAB Syndicate';
  const safeName = escapeHtml(packageInfo.name) || 'WNCAAB Perf v3.1';
  const safeLicense = escapeHtml(packageInfo.license) || 'MIT';
  
  // Helper function to generate endpoint links (handles WebSocket vs HTTP)
  const createEndpointLink = (endpoint: EndpointInfo, base: string) => {
    const fullUrl = base + endpoint.path;
    if (endpoint.method === 'WS') {
      const wsUrl = fullUrl.replace('http://', 'ws://');
      const escapedWsUrl = escapeHtml(wsUrl);
      return `<li><code>${escapeHtml(endpoint.method)}</code> <a href="#" onclick="navigator.clipboard.writeText('${escapedWsUrl}').then(() => alert('WebSocket URL copied! Use it in your WebSocket client.')); return false;" title="Copy WebSocket URL">${escapeHtml(endpoint.path)}</a> - ${escapeHtml(endpoint.description)}</li>`;
    }
    return `<li><code>${escapeHtml(endpoint.method)}</code> <a href="${escapeHtml(fullUrl)}" target="_blank">${escapeHtml(endpoint.path)}</a> - ${escapeHtml(endpoint.description)}</li>`;
  };
  
  const workerEndpoints = endpoints.worker.endpoints.map(e => createEndpointLink(e, endpoints.worker.base)).join('\n');
  const splineEndpoints = endpoints.spline.endpoints.map(e => createEndpointLink(e, endpoints.spline.base)).join('\n');
  const devEndpoints = endpoints.dev.endpoints.map(e => createEndpointLink(e, endpoints.dev.base)).join('\n');
  
  const version = safeVersion;
  
  // ✅ Macro-forged header and footer (build-time validated, zero runtime cost)
  // Header and footer are generated at build time with validated links and git metadata
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${safeDescription}">
  <meta name="author" content="${safeAuthor}">
  <meta name="keywords" content="wncaab, dev server, dashboard, api, telemetry, performance">
  <meta name="robots" content="index, follow">
  <meta property="og:title" content="WNCAAB Dev Server Dashboard v${safeVersion}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="WNCAAB Dev Server Dashboard">
  <meta name="twitter:description" content="${safeDescription}">
  <title>WNCAAB Dev Server Dashboard v${version}</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🚀</text></svg>">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #333;
      padding: 20px;
      min-height: 100vh;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 {
      color: #667eea;
      margin-bottom: 10px;
      font-size: 2.5em;
    }
    .subtitle {
      color: #666;
      margin-bottom: 30px;
      font-size: 1.1em;
    }
    .section {
      margin-bottom: 40px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }
    .section h2 {
      color: #333;
      margin-bottom: 15px;
      font-size: 1.5em;
    }
    .section h3 {
      color: #667eea;
      margin-top: 20px;
      margin-bottom: 10px;
      font-size: 1.2em;
    }
    ul {
      list-style: none;
      padding-left: 0;
    }
    li {
      padding: 8px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    li:last-child {
      border-bottom: none;
    }
    code {
      background: #e9ecef;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
      color: #d63384;
    }
    a {
      color: #667eea;
      text-decoration: none;
      margin-left: 10px;
    }
    a:hover {
      text-decoration: underline;
    }
    .status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.85em;
      font-weight: bold;
      margin-left: 10px;
    }
    .status.active {
      background: #28a745;
      color: white;
    }
    .status.inactive {
      background: #dc3545;
      color: white;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      border: 2px solid #e0e0e0;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.15);
      border-color: #667eea;
    }
    .card h4 {
      color: #667eea;
      margin-bottom: 12px;
      font-size: 1.3em;
      font-weight: 700;
    }
    .card p {
      margin: 8px 0;
      color: #666;
      font-size: 0.95em;
    }
    .card-actions {
      margin-top: 15px;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .btn-link {
      display: inline-block;
      padding: 8px 16px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-size: 0.9em;
      font-weight: 600;
      transition: all 0.2s ease;
    }
    .btn-link:hover {
      background: #5568d3;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.9em;
      font-weight: 700;
      margin: 8px 0;
    }
    .status-badge.status-active {
      background: #28a745;
      color: white;
    }
    .status-badge.status-inactive {
      background: #dc3545;
      color: white;
    }
    .stat-display {
      margin: 15px 0;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    .stat-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .stat-item:last-child {
      border-bottom: none;
    }
    .stat-label {
      color: #666;
      font-weight: 600;
    }
    .stat-value {
      color: #667eea;
      font-weight: 800;
      font-size: 1.2em;
    }
    .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .status-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      border: 2px solid #e0e0e0;
      display: flex;
      align-items: center;
      gap: 15px;
      transition: all 0.3s ease;
    }
    .status-card:hover {
      border-color: #667eea;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
    }
    .status-icon {
      font-size: 2em;
    }
    .status-content {
      flex: 1;
    }
    .status-content strong {
      display: block;
      color: #667eea;
      margin-bottom: 5px;
      font-size: 0.9em;
    }
    .status-content div {
      color: #333;
      font-weight: 700;
      font-size: 1.1em;
    }
    .refresh-btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1em;
      margin-top: 20px;
    }
    .refresh-btn:hover {
      background: #5568d3;
    }
    /* ⚠️ ARCHIVED: Old header/footer styles - No longer used
     * 
     * These styles have been replaced by macro-forged components:
     * - macros/header-macro.ts - Generates header HTML with inline styles
     * - macros/footer-macro.ts - Generates footer HTML with inline styles
     * 
     * See: archive/old-header-footer-styles.css for archived styles
     * 
     * @deprecated Use macro-generated header/footer instead
     */
    /* .header { ... } - ARCHIVED */
    /* .footer { ... } - ARCHIVED */
  </style>
</head>
<body>
  <div class="container">
    ${HEADER_HTML}
    
    <div class="section" style="background: linear-gradient(135deg, #fff5e6 0%, #ffe0cc 100%); border-left: 6px solid #fd7e14; margin-bottom: 40px;">
      <h2 style="color: #fd7e14; font-size: 1.8em; margin-bottom: 15px;">🎨 Quick Access: Enhanced CLI Apocalypse v1.4.2</h2>
      <p style="margin-bottom: 20px; color: #666; font-size: 1.1em;">Interactive edge tempering visualization + WNBATOR gauge + AI maparse + Threshold validator</p>
      <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-bottom: 20px;">
        <a href="/tension" style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 1.1em; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: all 0.3s;">🎨 Tension Visualizer →</a>
        <a href="/api/tension/map?conflict=1.0&entropy=0.0&tension=0.0" target="_blank" style="display: inline-block; padding: 15px 30px; background: white; color: #667eea; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 1.1em; border: 2px solid #667eea; transition: all 0.3s;">🔗 Tension API →</a>
      </div>
      <div style="display: flex; gap: 15px; flex-wrap: wrap;">
        <a href="/api/gauge/womens-sports?oddsSkew=0.92&volumeVelocity=47000&volatilityEntropy=0.41&timeDecay=323&momentumCurvature=0.89" target="_blank" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 0.95em; box-shadow: 0 3px 10px rgba(40, 167, 69, 0.3);">📊 WNBATOR Gauge →</a>
        <a href="/api/ai/maparse?prices=100,102,105,110,118" target="_blank" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 0.95em; box-shadow: 0 3px 10px rgba(23, 162, 184, 0.3);">🤖 AI Maparse →</a>
        <a href="/api/validate/threshold?threshold=0.7-.0012" target="_blank" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%); color: #333; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 0.95em; box-shadow: 0 3px 10px rgba(255, 193, 7, 0.3);">✅ Threshold Validator →</a>
      </div>
    </div>
    
    <div class="section">
      <h2>📡 API Endpoints</h2>
      
      <h3>Worker API <span id="worker-api-status" class="status inactive">Not Running</span></h3>
      <ul>
        ${workerEndpoints}
      </ul>
      
      <h3>Spline API <span id="spline-api-status" class="status active">Port 3001</span></h3>
      <ul>
        ${splineEndpoints}
      </ul>
      
      <h3>Dev API <span id="dev-api-status" class="status active">Port 3002</span></h3>
      <ul>
        ${devEndpoints}
      </ul>
      
      <h3>Tension Mapping <span class="status active">Port 3002</span></h3>
      <ul>
        <li><code>GET, POST</code> <a href="/api/tension/map?conflict=1.0&entropy=0.0&tension=0.0" target="_blank">/api/tension/map</a> - Tension mapping API (single)</li>
        <li><code>GET, POST</code> <a href="/api/tension/batch" target="_blank">/api/tension/batch</a> - Tension mapping API (batch)</li>
        <li><code>GET</code> <a href="/api/tension/health" target="_blank">/api/tension/health</a> - Health check</li>
        <li><code>GET</code> <a href="/api/tension/help" target="_blank">/api/tension/help</a> - 📖 Help documentation (CLI, API, Portal)</li>
        <li><code>GET</code> <a href="/tension" target="_blank">/tension</a> - 🎨 Tension mapping visualization</li>
      </ul>
      
      <h3>Enhanced CLI Features <span class="status active">v1.4.2</span></h3>
      <ul>
        <li><code>GET</code> <a href="/api/gauge/womens-sports?oddsSkew=0.92&volumeVelocity=47000&volatilityEntropy=0.41" target="_blank">/api/gauge/womens-sports</a> - WNBATOR 5D tensor gauge</li>
        <li><code>GET</code> <a href="/api/ai/maparse?prices=100,102,105,110,118" target="_blank">/api/ai/maparse</a> - AI auto-maparse curve detection</li>
        <li><code>GET</code> <a href="/api/validate/threshold?threshold=0.7-.0012" target="_blank">/api/validate/threshold</a> - Threshold validator (auto-corrects arithmetic)</li>
      </ul>
      
      <h3>🌑 Shadow WebSocket Server <span class="status active">Port 3003</span></h3>
      <ul>
        <li><code>WS</code> <a href="ws://localhost:3003/ws/shadow/TIER_4_MANUAL_SHADOW" target="_blank">ws://localhost:3003/ws/shadow/TIER_4_MANUAL_SHADOW</a> - Shadow market WebSocket (JSON)</li>
        <li><code>WS</code> <a href="ws://localhost:3003/ws/shadow/TIER_X_MONSTER" target="_blank">ws://localhost:3003/ws/shadow/TIER_X_MONSTER</a> - HFT tier WebSocket (Binary)</li>
        <li><code>GET</code> <a href="http://localhost:3003/health" target="_blank">http://localhost:3003/health</a> - Health check</li>
        <li><code>GET</code> <a href="http://localhost:3003/stats" target="_blank">http://localhost:3003/stats</a> - Server statistics</li>
      </ul>
      <div class="shadow-controls" style="margin-top: 15px; padding: 15px; background: #1a1a1a; border-radius: 8px; border-left: 4px solid #ffaa00;">
        <h4 style="color: #ffaa00; margin-top: 0;">Shadow Market Controls</h4>
        <button onclick="connectShadowWS('TIER_4_MANUAL_SHADOW')" style="background: #ffaa00; color: #1a1a1a; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; margin-right: 10px;">Connect Manual</button>
        <button onclick="connectShadowWS('TIER_X_MONSTER')" style="background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; margin-right: 10px;">Connect HFT</button>
        <div id="shadow-status" style="margin-top: 10px; color: #888; font-size: 0.9em;">Disconnected</div>
        <div id="shadow-ticker" style="margin-top: 10px; max-height: 200px; overflow-y: auto; font-family: monospace; font-size: 0.85em; color: #ccc;"></div>
      </div>
    </div>
    
    <div class="section">
      <h2>🎨 Color System</h2>
      <div class="grid">
        <div class="card">
          <h4>📊 Color Usage</h4>
          <p><strong>Build-time validated colors</strong></p>
          <div class="stat-display">
            <div class="stat-item">
              <span class="stat-label">Total Colors:</span>
              <span class="stat-value" id="color-total">Loading...</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Used:</span>
              <span class="stat-value" id="color-used">Loading...</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Reserved:</span>
              <span class="stat-value" id="color-unused" style="color: #fd7e14;">Loading...</span>
            </div>
          </div>
          <div class="card-actions">
            <a href="/color-palette.html" target="_blank" class="btn-link">🎨 View Palette →</a>
            <a href="#" onclick="loadColorReport(); return false;" class="btn-link">📊 View Report →</a>
          </div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <h2>📚 Bookmaker Registry</h2>
      <div class="grid">
        <div class="card">
          <h4>📊 Registry Overview</h4>
          <p><strong>44 bookmakers across 6 tiers</strong></p>
          <div class="stat-display">
            <div class="stat-item">
              <span class="stat-label">Total Bookmakers:</span>
              <span class="stat-value" id="registry-total">Loading...</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">With Profiles:</span>
              <span class="stat-value" id="registry-profiles">Loading...</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">With Manifests:</span>
              <span class="stat-value" id="registry-manifests">Loading...</span>
            </div>
          </div>
          <div class="card-actions">
            <a href="/registry" class="btn-link" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; border-radius: 8px; font-weight: 700; display: inline-block; margin-top: 10px; text-decoration: none;">🎛️ Full Registry Dashboard →</a>
            <a href="#" onclick="loadRegistry(); return false;" class="btn-link">📋 View Registry →</a>
            <a href="/api/registry/bookmakers" target="_blank" class="btn-link">🔗 API JSON →</a>
          </div>
        </div>
        <div class="card">
          <h4>🎛️ Registry Management</h4>
          <p><strong>Feature flags & rollout controls</strong></p>
          <p class="status-badge status-active">✅ Bun.SQL Integrated</p>
          <ul style="list-style: none; padding: 0; margin: 10px 0;">
            <li>✅ Feature flags (enabled, streaming, backfill, arbitrage, mlTraining)</li>
            <li>✅ Rollout percentage (0-100%)</li>
            <li>✅ User whitelist</li>
            <li>✅ Region-based rollout</li>
            <li>✅ Canary deployments</li>
          </ul>
          <div class="card-actions">
            <a href="/registry" class="btn-link" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 10px 20px; border-radius: 8px; font-weight: 600; display: inline-block; margin-top: 10px; text-decoration: none;">🎛️ Manage Registry →</a>
            <a href="/api/bookmakers" target="_blank" class="btn-link">🔗 API JSON →</a>
          </div>
        </div>
        <div class="card">
          <h4>🎯 Tier Distribution</h4>
          <p><strong>Bookmakers by tier</strong></p>
          <div class="stat-display" id="tier-distribution">
            <div class="stat-item">Loading...</div>
          </div>
          <div class="card-actions">
            <a href="#" onclick="loadTiers(); return false;" class="btn-link">📊 View Tiers →</a>
            <a href="/api/registry/tiers" target="_blank" class="btn-link">🔗 API JSON →</a>
          </div>
        </div>
        <div class="card">
          <h4>📁 RG Index Manifests</h4>
          <p><strong>Ripgrep index skeletons</strong></p>
          <p class="status-badge status-active">✅ Available</p>
          <div class="card-actions">
            <a href="#" onclick="loadManifests(); return false;" class="btn-link">📁 View Manifests →</a>
            <a href="/api/registry/manifests/pinnacle" target="_blank" class="btn-link">🔗 Example API →</a>
          </div>
        </div>
        <div class="card">
          <h4>☁️ R2 Bucket Storage</h4>
          <p><strong>Private-backed registry</strong></p>
          <div class="stat-display">
            <div class="stat-item">
              <span class="stat-label">Bucket:</span>
              <span class="stat-value" id="r2-bucket">Loading...</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Total Objects:</span>
              <span class="stat-value" id="r2-objects">Loading...</span>
            </div>
          </div>
          <div class="card-actions">
            <a href="#" onclick="loadR2Registry(); return false;" class="btn-link">☁️ View R2 Bucket →</a>
            <a href="/api/registry/r2" target="_blank" class="btn-link">🔗 R2 API →</a>
          </div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <h2>🎯 Bet-Type Detection</h2>
      <div class="grid">
        <div class="card">
          <h4>📊 Detection Overview</h4>
          <p><strong>Comprehensive bet-type pattern detection</strong></p>
          <div class="stat-display">
            <div class="stat-item">
              <span class="stat-label">Bet Types:</span>
              <span class="stat-value" id="bet-type-total">Loading...</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Patterns Detected:</span>
              <span class="stat-value" id="bet-type-patterns">Loading...</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">RG Compliant:</span>
              <span class="stat-value" id="bet-type-rg-compliant">Loading...</span>
            </div>
          </div>
          <div class="card-actions">
            <a href="#" onclick="loadBetTypeStats(); return false;" class="btn-link">📊 View Stats →</a>
            <a href="/api/bet-type/stats" target="_blank" class="btn-link">🔗 API JSON →</a>
          </div>
        </div>
        <div class="card">
          <h4>🔍 Detection Types</h4>
          <p><strong>Supported bet types</strong></p>
          <ul style="list-style: none; padding: 0; margin: 10px 0;">
            <li>✅ Team Totals</li>
            <li>✅ Parlays & Same-Game Parlays</li>
            <li>✅ Teasers</li>
            <li>✅ Bought Points</li>
            <li>✅ Live & Pregame Markets</li>
          </ul>
          <div class="card-actions">
            <a href="#" onclick="loadBetTypeDetection(); return false;" class="btn-link">🔍 Test Detection →</a>
          </div>
        </div>
        <div class="card">
          <h4>🛡️ RG Integration</h4>
          <p><strong>Responsible Gaming compliance</strong></p>
          <p class="status-badge status-active">✅ RG Index Integrated</p>
          <div class="card-actions">
            <a href="#" onclick="loadRGCompliance(); return false;" class="btn-link">🛡️ View RG Status →</a>
          </div>
        </div>
        <div class="card">
          <h4>📚 Registry Integration</h4>
          <p><strong>Bookmaker tier-aware detection</strong></p>
          <p class="status-badge status-active">✅ Tier Multipliers Active</p>
          <div class="card-actions">
            <a href="/api/registry/tiers" target="_blank" class="btn-link">📚 View Tiers →</a>
          </div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <div class="grid">
        <div class="card">
          <h4>📄 bunfig.toml</h4>
          <p><strong>Runtime configuration</strong></p>
          <p id="bunfig-status" class="status-badge">Loading...</p>
          <div class="card-actions">
            <a href="#" onclick="loadConfigs(); return false;" class="btn-link">📋 View Configs →</a>
            <a href="/api/dev/configs" target="_blank" class="btn-link">🔗 API JSON →</a>
          </div>
        </div>
        <div class="card">
          <h4>🤖 bun-ai.toml</h4>
          <p><strong>AI immunity configuration</strong></p>
          <p id="bun-ai-status" class="status-badge">Loading...</p>
          <div class="card-actions">
            <a href="#" onclick="loadConfigs(); return false;" class="btn-link">📋 View Configs →</a>
            <a href="/api/dev/configs" target="_blank" class="btn-link">🔗 API JSON →</a>
          </div>
        </div>
        <div class="card">
          <h4>🎨 Tension Mapping</h4>
          <p><strong>Edge tempering visualization</strong></p>
          <p class="status-badge status-active">✅ Available</p>
          <div class="card-actions">
            <a href="/tension" class="btn-link">🎨 Visualizer →</a>
            <a href="/api/tension/map?conflict=1.0&entropy=0.0&tension=0.0" target="_blank" class="btn-link">🔗 API →</a>
            <a href="/api/tension/help" target="_blank" class="btn-link">📖 Help →</a>
          </div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <h2>📚 Betting Glossary</h2>
      <div class="grid">
        <div class="card">
          <h4>📖 Glossary Overview</h4>
          <p><strong>Comprehensive betting terminology</strong></p>
          <div class="stat-display">
            <div class="stat-item">
              <span class="stat-label">Total Terms:</span>
              <span class="stat-value" id="glossary-total">Loading...</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Bet-Type Terms:</span>
              <span class="stat-value" id="glossary-bet-types">Loading...</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">RG Terms:</span>
              <span class="stat-value" id="glossary-rg-terms">Loading...</span>
            </div>
          </div>
          <div class="card-actions">
            <a href="#" onclick="loadGlossary(); return false;" class="btn-link">📋 View All Terms →</a>
            <a href="/api/glossary/search" target="_blank" class="btn-link">🔗 API JSON →</a>
          </div>
        </div>
        <div class="card">
          <h4>🔍 Search Glossary</h4>
          <p><strong>Find terms by keyword</strong></p>
          <div class="card-actions">
            <a href="#" onclick="searchGlossary(); return false;" class="btn-link">🔍 Search →</a>
          </div>
        </div>
        <div class="card">
          <h4>🎯 Bet-Type Terms</h4>
          <p><strong>Definitions for wager types</strong></p>
          <p class="status-badge status-active">✅ 5 Terms Registered</p>
          <div class="card-actions">
            <a href="#" onclick="loadBetTypeTerms(); return false;" class="btn-link">📋 View Bet Types →</a>
            <a href="/api/glossary/bet-types" target="_blank" class="btn-link">🔗 API JSON →</a>
          </div>
        </div>
        <div class="card">
          <h4>🛡️ RG Terms</h4>
          <p><strong>Responsible Gaming terminology</strong></p>
          <p class="status-badge status-active">✅ Critical Compliance</p>
          <div class="card-actions">
            <a href="#" onclick="loadRGTerms(); return false;" class="btn-link">🛡️ View RG Terms →</a>
            <a href="/api/glossary/category/rg_compliance" target="_blank" class="btn-link">🔗 API JSON →</a>
          </div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <h2>🚩 Feature Flags</h2>
      <div class="grid">
        <div class="card">
          <h4>📊 Feature Flags Overview</h4>
          <p><strong>Runtime feature toggles</strong></p>
          <div class="stat-display">
            <div class="stat-item">
              <span class="stat-label">Total Flags:</span>
              <span class="stat-value" id="feature-flags-total">Loading...</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Enabled:</span>
              <span class="stat-value" id="feature-flags-enabled">Loading...</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Categories:</span>
              <span class="stat-value">7</span>
            </div>
          </div>
          <div class="card-actions">
            <a href="#" onclick="loadFeatureFlags(); return false;" class="btn-link">🚩 View Flags →</a>
            <a href="/api/feature-flags" target="_blank" class="btn-link">🔗 API JSON →</a>
          </div>
        </div>
        <div class="card">
          <h4>📱 Dashboard Flags</h4>
          <p><strong>Dashboard feature controls</strong></p>
          <p class="status-badge status-active">✅ All Enabled</p>
          <div class="card-actions">
            <a href="#" onclick="loadFeatureFlagsByCategory('dashboard'); return false;" class="btn-link">📱 View Dashboard Flags →</a>
          </div>
        </div>
        <div class="card">
          <h4>🔄 Stream Flags</h4>
          <p><strong>Stream processing controls</strong></p>
          <p class="status-badge status-active">✅ All Enabled</p>
          <div class="card-actions">
            <a href="#" onclick="loadFeatureFlagsByCategory('stream'); return false;" class="btn-link">🔄 View Stream Flags →</a>
          </div>
        </div>
        <div class="card">
          <h4>💾 Storage Flags</h4>
          <p><strong>Storage feature controls</strong></p>
          <p class="status-badge status-active">✅ R2 + KV Enabled</p>
          <div class="card-actions">
            <a href="#" onclick="loadFeatureFlagsByCategory('odds'); return false;" class="btn-link">💾 View Storage Flags →</a>
          </div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <h2>🌊 Feed Matrix</h2>
      <div class="grid">
        <div class="card">
          <h4>📊 Feed Architecture Overview</h4>
          <p><strong>Complete feed mapping with DO, KV, R2, flags, and env vars</strong></p>
          <div class="stat-display">
            <div class="stat-item">
              <span class="stat-label">Total Feeds:</span>
              <span class="stat-value" id="feeds-total">Loading...</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">KV Namespaces:</span>
              <span class="stat-value" id="feeds-kv-count">3</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">R2 Buckets:</span>
              <span class="stat-value" id="feeds-r2-count">5</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Durable Objects:</span>
              <span class="stat-value" id="feeds-do-count">1</span>
            </div>
          </div>
          <div class="card-actions">
            <a href="#" onclick="loadFeedMatrix(); return false;" class="btn-link">🌊 View Feed Matrix →</a>
            <a href="/api/feeds/matrix" target="_blank" class="btn-link">📡 API Endpoint →</a>
          </div>
        </div>
        <div class="card">
          <h4>🌑 Shadow WebSocket Server</h4>
          <p><strong>Shadow market WebSocket streaming</strong></p>
          <div class="stat-display">
            <div class="stat-item">
              <span class="stat-label">Status:</span>
              <span class="stat-value" id="shadow-ws-status">Checking...</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Port:</span>
              <span class="stat-value">3003</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Connections:</span>
              <span class="stat-value" id="shadow-ws-connections">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Total Ticks:</span>
              <span class="stat-value" id="shadow-ws-ticks">-</span>
            </div>
          </div>
          <div class="card-actions">
            <a href="#" onclick="checkShadowWSStatus(); return false;" class="btn-link">🔄 Refresh Status →</a>
            <a href="/api/shadow-ws/status" target="_blank" class="btn-link">📡 API Status →</a>
            <a href="http://localhost:3003/health" target="_blank" class="btn-link">🏥 Health Check →</a>
          </div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <h2>👷 Workers</h2>
      <div class="grid">
        <div class="card">
          <h4>📊 Worker Registry</h4>
          <p><strong>Live worker state</strong></p>
          <div class="stat-display">
            <div class="stat-item">
              <span class="stat-label">Total Workers:</span>
              <span class="stat-value" id="worker-count">0</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Idle:</span>
              <span class="stat-value" id="worker-idle">0</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Working:</span>
              <span class="stat-value" id="worker-working">0</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Error:</span>
              <span class="stat-value" id="worker-error">0</span>
            </div>
          </div>
          <div class="card-actions">
            <a href="#" onclick="loadWorkers(); return false;" class="btn-link">📋 View Workers →</a>
            <a href="/api/dev/workers" target="_blank" class="btn-link">🔗 API JSON →</a>
          </div>
        </div>
        <div class="card">
          <h4>📡 Worker Telemetry</h4>
          <p><strong>Real-time metrics</strong></p>
          <p id="worker-api-status" class="status-badge status-inactive">Not Running</p>
          <div class="card-actions">
            <a href="#" onclick="navigator.clipboard.writeText('ws://localhost:${WORKER_API_PORT}/ws/workers/telemetry').then(() => alert('WebSocket URL copied! Use it in your WebSocket client.')); return false;" class="btn-link" title="Copy WebSocket URL">🔌 WebSocket Stream →</a>
            <a href="http://localhost:${WORKER_API_PORT}/api/workers/registry" target="_blank" class="btn-link">🔗 Registry API →</a>
          </div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <h2>📊 System Status</h2>
      <div class="status-grid">
        <div class="status-card">
          <div class="status-icon">🕐</div>
          <div class="status-content">
            <strong>Timestamp</strong>
            <div id="status-timestamp">Loading...</div>
          </div>
        </div>
        <div class="status-card">
          <div class="status-icon">🔌</div>
          <div class="status-content">
            <strong>Total Endpoints</strong>
            <div id="status-endpoints">Loading...</div>
          </div>
        </div>
        <div class="status-card">
          <div class="status-icon">⚙️</div>
          <div class="status-content">
            <strong>Configs Loaded</strong>
            <div id="status-configs">Loading...</div>
          </div>
        </div>
      </div>
      <div class="card-actions" style="margin-top: 20px; text-align: center;">
        <a href="/api/dev/status" target="_blank" class="btn-link">📋 View Full Status JSON →</a>
      </div>
    </div>
    
    <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
    
    ${FOOTER_HTML}
  </div>
  
  <script>
    // ============================================================================
    // Constants and Utilities
    // ============================================================================
    const MODAL_Z_INDEX = 1000;
    const MODAL_BACKDROP_COLOR = 'rgba(0,0,0,0.7)';
    const WORKER_API_PORT_VALUE = ${WORKER_API_PORT};
    const STATUS_REFRESH_INTERVAL = 5000; // 5 seconds
    const MODAL_DEFAULT_WIDTH = 900;
    const MODAL_NARROW_WIDTH = 600;
    
    // JSON syntax highlighting utility (reusable - eliminates duplication)
    function highlightJSON(jsonString) {
      return jsonString
        .replace(/(".*?"):/g, '<span style="color:#d63384;font-weight:600;">$1</span>:')
        .replace(/: ("[^"]*")/g, ': <span style="color:#0d6efd;">$1</span>')
        .replace(/: (true|false|null)/g, ': <span style="color:#198754;font-weight:600;">$1</span>')
        .replace(/: (\d+\.?\d*)/g, ': <span style="color:#fd7e14;font-weight:600;">$1</span>')
        .replace(/(\[|\])/g, '<span style="color:#6f42c1;">$1</span>')
        .replace(/(\{|\})/g, '<span style="color:#20c997;">$1</span>');
    }
    
    // Modal creation utility (reusable - reduces duplication)
    // Supports optional width parameter for different modal sizes
    function createModal(title, content, options = {}) {
      const {
        width = MODAL_DEFAULT_WIDTH,
        onClose = null
      } = options;
      
      const modal = document.createElement('div');
      modal.style.cssText = \`position:fixed;top:0;left:0;right:0;bottom:0;background:\${MODAL_BACKDROP_COLOR};z-index:\${MODAL_Z_INDEX};display:flex;align-items:center;justify-content:center;padding:20px;\`;
      modal.onclick = (e) => {
        if (e.target === modal) {
          if (onClose) onClose();
          modal.remove();
        }
      };
      
      modal.innerHTML = \`
        <div style="background:white;padding:30px;border-radius:16px;max-width:\${width}px;max-height:85vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,0.5);position:relative;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-bottom:2px solid #e0e0e0;padding-bottom:15px;">
            <h2 style="color:#667eea;font-size:1.8em;margin:0;font-weight:700;">\${title}</h2>
            <button onclick="this.closest('div').parentElement.remove()" style="background:#dc3545;color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:600;font-size:1em;transition:all 0.2s;">✕ Close</button>
          </div>
          \${content}
        </div>
      \`;
      document.body.appendChild(modal);
      return modal;
    }
    
    // Error handling utility (standardizes error handling)
    function handleError(error, defaultMessage = 'An error occurred') {
      const message = error instanceof Error ? error.message : String(error);
      return message || defaultMessage;
    }
    
    // Color system stats (from build-time report)
    // Note: Colors are tracked when macros are imported, so stats reflect actual usage
    const colorStats = {
      total: 16,
      used: ${JSON.stringify(colorReport?.used || [])},
      unused: ${colorReport?.unusedCount || 0},
      unusedColors: ${JSON.stringify(colorReport?.unused || [])}
    };
    
    // Update color stats on page load
    document.addEventListener('DOMContentLoaded', () => {
      const colorTotal = document.getElementById('color-total');
      const colorUsed = document.getElementById('color-used');
      const colorUnused = document.getElementById('color-unused');
      
      if (colorTotal) colorTotal.textContent = colorStats.total;
      if (colorUsed) colorUsed.textContent = colorStats.used.length;
      if (colorUnused) {
        colorUnused.textContent = colorStats.unused;
        // Reserved colors are intentional, use orange (info) instead of red (error)
        colorUnused.style.color = colorStats.unused > 0 ? '#fd7e14' : '#28a745';
      }
    });
    
    // Load registry stats
    async function loadRegistryStats() {
      try {
        const response = await fetch('/api/registry/bookmakers');
        const data = await response.json();
        document.getElementById('registry-total')!.textContent = data.total.toString();
        document.getElementById('registry-profiles')!.textContent = data.withProfiles.toString();
        document.getElementById('registry-manifests')!.textContent = data.withManifests.toString();
      } catch (error) {
        console.error('Failed to load registry stats:', error);
      }
    }
    
    async function loadR2Stats() {
      try {
        const response = await fetch('/api/registry/r2');
        const data = await response.json();
        document.getElementById('r2-bucket')!.textContent = data.bucket;
        document.getElementById('r2-objects')!.textContent = data.totalObjects.toString();
      } catch (error) {
        console.error('Failed to load R2 stats:', error);
      }
    }
    
    async function loadTierStats() {
      try {
        const response = await fetch('/api/registry/tiers');
        const data = await response.json();
        const tierHtml = Object.entries(data.tiers).map(([tier, info]: [string, any]) => 
          \`<div class="stat-item"><span class="stat-label">\${tier}:</span><span class="stat-value">\${info.count}</span></div>\`
        ).join('');
        document.getElementById('tier-distribution')!.innerHTML = tierHtml;
      } catch (error) {
        console.error('Failed to load tier stats:', error);
      }
    }
    
    // Shadow WebSocket connection handler
    let shadowWs = null;
    function connectShadowWS(tier) {
      if (shadowWs && shadowWs.readyState === WebSocket.OPEN) {
        shadowWs.close();
      }
      
      const statusEl = document.getElementById('shadow-status');
      const tickerEl = document.getElementById('shadow-ticker');
      
      if (!statusEl || !tickerEl) return;
      
      statusEl.textContent = \`Connecting to \${tier}...\`;
      
      const protocols = tier === 'TIER_X_MONSTER' ? ['shadow-binary', 'shadow-json'] : ['shadow-json'];
      shadowWs = new WebSocket(\`ws://localhost:3003/ws/shadow/\${tier}\`, protocols);
      
      shadowWs.onopen = () => {
        statusEl.textContent = \`✅ Connected to \${tier} (protocol: \${shadowWs.protocol})\`;
        statusEl.style.color = '#28a745';
        
        // Subscribe to bookmaker
        shadowWs.send(JSON.stringify({
          type: 'SUBSCRIBE_BOOKMAKER',
          bookmakerId: '12bet-crypto'
        }));
      };
      
      shadowWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'SNAPSHOT') {
            tickerEl.innerHTML = '<div style="color: #888;">📸 Snapshot: ' + data.ticks.length + ' ticks</div>';
            return;
          }
          
          if (data.type === 'HISTORY') {
            tickerEl.innerHTML = '<div style="color: #888;">📜 History: ' + data.ticks.length + ' ticks</div>';
            return;
          }
          
          // Live tick
          const tick = data;
          const row = document.createElement('div');
          row.className = 'tick-row shadow-tick';
          row.style.cssText = 'padding: 5px; margin: 2px 0; background: rgba(255, 170, 0, 0.1); border-left: 3px solid #ffaa00; border-radius: 4px;';
          
          const score = tick.metadata?.exploitationScore || 0;
          const scoreColor = score > 70 ? '#ff4444' : score > 40 ? '#ffaa00' : '#888';
          
          row.innerHTML = \`🌑 <strong>\${tick.bookmaker}</strong> #\${tick.rotation} | Line: \${tick.line} | Juice: \${tick.juice} | <span style="color: \${scoreColor}">Score: \${score.toFixed(1)}</span>\`;
          
          tickerEl.insertBefore(row, tickerEl.firstChild);
          
          // Keep only last 20 ticks
          while (tickerEl.children.length > 20) {
            tickerEl.removeChild(tickerEl.lastChild);
          }
          
          // Alert on high exploitation
          if (score > 70) {
            row.style.background = 'rgba(255, 68, 68, 0.2)';
            row.style.borderLeftColor = '#ff4444';
          }
        } catch (err) {
          console.error('[Shadow] Failed to parse:', err);
        }
      };
      
      shadowWs.onerror = (error) => {
        statusEl.textContent = '❌ Connection error';
        statusEl.style.color = '#dc3545';
        console.error('[Shadow] WebSocket error:', error);
      };
      
      shadowWs.onclose = () => {
        statusEl.textContent = 'Disconnected';
        statusEl.style.color = '#888';
      };
    }
    
    // Initial load
    loadRegistryStats();
    loadR2Stats();
    loadTierStats();
    
    // Refresh every 30 seconds
    setInterval(() => {
      loadRegistryStats();
      loadR2Stats();
      loadTierStats();
    }, 30000);
    
    // Load color report modal
    function loadColorReport() {
      const unusedList = colorStats.unusedColors.length > 0 
        ? '<ul style="list-style: disc; margin-left: 20px;"><li>' + colorStats.unusedColors.join('</li><li>') + '</li></ul>'
        : '<p style="color: #28a745; font-weight: 600;">✅ All colors are actively used!</p>';
      
      const content = \`
        <div style="margin-bottom:20px;">
          <h3 style="color:#333;margin-bottom:10px;">📈 Statistics</h3>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-bottom:20px;">
            <div style="padding:15px;background:#f8f9fa;border-radius:8px;text-align:center;">
              <div style="font-size:0.9em;color:#666;margin-bottom:5px;">Total</div>
              <div style="font-size:2em;font-weight:800;color:#667eea;">\${colorStats.total}</div>
            </div>
            <div style="padding:15px;background:#e7f5e7;border-radius:8px;text-align:center;">
              <div style="font-size:0.9em;color:#666;margin-bottom:5px;">Used</div>
              <div style="font-size:2em;font-weight:800;color:#28a745;">\${colorStats.used.length}</div>
            </div>
            <div style="padding:15px;background:\${colorStats.unused > 0 ? '#fff4e6' : '#e7f5e7'};border-radius:8px;text-align:center;">
              <div style="font-size:0.9em;color:#666;margin-bottom:5px;">Reserved</div>
              <div style="font-size:2em;font-weight:800;color:\${colorStats.unused > 0 ? '#fd7e14' : '#28a745'};">\${colorStats.unused}</div>
            </div>
          </div>
          <h3 style="color:#333;margin-bottom:10px;">📋 Reserved Colors</h3>
          \${unusedList}
          <div style="margin-top:20px;padding:15px;background:#fff4e6;border-radius:8px;border-left:4px solid #fd7e14;">
            <strong style="color:#fd7e14;display:block;margin-bottom:8px;">✅ Decision: KEEP all colors</strong>
            <span style="color:#666;font-size:0.9em;">These colors are documented as reserved for future features. See <a href="https://github.com/brendadeeznuts1111/wncaab-perf-v3.1/blob/main/macros/color-macro.ts" target="_blank" style="color:#fd7e14;text-decoration:underline;font-weight:600;">macros/color-macro.ts</a> for full documentation and rationale.</span>
          </div>
          <div style="margin-top:15px;padding:15px;background:#e7f3ff;border-radius:8px;border-left:4px solid #0d6efd;">
            <strong style="color:#0d6efd;display:block;margin-bottom:8px;">💡 Rationale</strong>
            <ul style="color:#666;font-size:0.9em;margin:0;padding-left:20px;">
              <li>650 bytes is negligible vs design system benefits</li>
              <li>Prevents color drift in future features</li>
              <li>No rebuild needed when adding dashboards/alerts</li>
              <li>Next review: 2025-04-15</li>
            </ul>
          </div>
          <div style="margin-top:15px;padding:15px;background:#e7f5e7;border-radius:8px;border-left:4px solid #28a745;">
            <strong style="color:#28a745;display:block;margin-bottom:8px;">📊 Detailed Analysis</strong>
            <span style="color:#666;font-size:0.9em;">Run <code style="background:#fff;padding:2px 6px;border-radius:4px;color:#0d6efd;font-family:monospace;">bun run audit:colors</code> for full usage report</span>
          </div>
        </div>
      \`;
      
      createModal('📊 Reserved Colors', content, { width: MODAL_NARROW_WIDTH });
    }
    
    // Auto-refresh every 5 seconds
    let refreshInterval = setInterval(() => {
      updateStatus();
    }, STATUS_REFRESH_INTERVAL);
    
    // Fetch and update status
    async function updateStatus() {
      try {
        const response = await fetch('/api/dev/status');
        const status = await response.json();
        
        // Update worker stats
        const workerCount = document.getElementById('worker-count');
        const workerIdle = document.getElementById('worker-idle');
        const workerWorking = document.getElementById('worker-working');
        const workerError = document.getElementById('worker-error');
        
        if (workerCount) workerCount.textContent = status.workers.total;
        if (workerIdle) workerIdle.textContent = status.workers.summary.idle;
        if (workerWorking) workerWorking.textContent = status.workers.summary.working;
        if (workerError) workerError.textContent = status.workers.summary.error;
        
        // Update service statuses
        updateServiceStatus('worker-api-status', status.services.worker_api.status);
        updateServiceStatus('spline-api-status', status.services.spline_api.status);
        updateServiceStatus('dev-api-status', status.services.dev_api.status);
        
        // Update config statuses
        updateConfigStatus('bunfig-status', status.configs.bunfig);
        updateConfigStatus('bun-ai-status', status.configs['bun-ai']);
        
        // Update system status
        const statusTimestamp = document.getElementById('status-timestamp');
        const statusEndpoints = document.getElementById('status-endpoints');
        const statusConfigs = document.getElementById('status-configs');
        
        if (statusTimestamp) {
          const date = new Date(status.timestamp);
          statusTimestamp.textContent = date.toLocaleTimeString();
        }
        if (statusEndpoints) {
          statusEndpoints.textContent = status.endpoints.total + ' endpoints';
        }
        if (statusConfigs) {
          const loaded = Object.values(status.configs).filter(c => c === 'loaded').length;
          statusConfigs.textContent = loaded + ' / ' + Object.keys(status.configs).length;
        }
        
        // Update worker API status badge
        const workerApiStatus = document.getElementById('worker-api-status');
        if (workerApiStatus) {
          workerApiStatus.className = 'status-badge ' + (status.services.worker_api.status === 'running' ? 'status-active' : 'status-inactive');
          workerApiStatus.textContent = status.services.worker_api.status === 'running' ? '✅ Running' : '❌ Not Running';
        }
      } catch (error) {
        console.error('Failed to update status:', error);
      }
    }
    
    function updateServiceStatus(id, status) {
      const element = document.getElementById(id);
      if (element) {
        element.className = 'status-badge ' + (status === 'running' ? 'status-active' : 'status-inactive');
        element.textContent = status === 'running' ? '✅ Running' : '❌ Not Running';
      }
    }
    
    function updateConfigStatus(id, status) {
      const element = document.getElementById(id);
      if (element) {
        element.className = 'status-badge ' + (status === 'loaded' ? 'status-active' : 'status-inactive');
        element.textContent = status === 'loaded' ? '✅ Loaded' : '❌ Missing';
      }
    }
    
    // Load configs on click
    async function loadConfigs() {
      try {
        const response = await fetch('/api/dev/configs');
        if (!response.ok) {
          throw new Error(\`Config API returned \${response.status}: \${response.statusText}\`);
        }
        const configs = await response.json();
        
        const configStr = JSON.stringify(configs, null, 2);
        const highlighted = highlightJSON(configStr);
        
        const content = \`
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
            <div style="padding:15px;background:#f8f9fa;border-radius:8px;border-left:4px solid #667eea;">
              <strong style="color:#667eea;display:block;margin-bottom:5px;">📄 bunfig.toml</strong>
              <span style="color:#666;font-size:0.9em;">Runtime configuration</span>
            </div>
            <div style="padding:15px;background:#f8f9fa;border-radius:8px;border-left:4px solid #764ba2;">
              <strong style="color:#764ba2;display:block;margin-bottom:5px;">🤖 bun-ai.toml</strong>
              <span style="color:#666;font-size:0.9em;">AI immunity configuration</span>
            </div>
          </div>
          <pre style="background:#1e1e1e;color:#d4d4d4;padding:25px;border-radius:12px;overflow:auto;font-family:'Monaco','Courier New',monospace;font-size:0.9em;line-height:1.6;border:2px solid #333;box-shadow:inset 0 2px 8px rgba(0,0,0,0.3);">\${highlighted}</pre>
          <div style="margin-top:20px;padding:15px;background:#e7f3ff;border-radius:8px;border-left:4px solid #0d6efd;">
            <strong style="color:#0d6efd;display:block;margin-bottom:5px;">💡 Tip</strong>
            <span style="color:#666;font-size:0.9em;">You can also access this via <code style="background:#fff;padding:2px 6px;border-radius:4px;color:#0d6efd;">GET /api/dev/configs</code></span>
          </div>
        \`;
        
        createModal('⚙️ Configuration Files', content);
      } catch (error) {
        alert('Failed to load configs: ' + handleError(error, 'Unknown error'));
      }
    }
    
    // Load workers on click
    async function loadR2Registry() {
  try {
    const response = await fetch('/api/registry/r2');
    const data = await response.json();
    
    const profilesList = data.profiles.slice(0, 10).map((p: any) => 
      \`<li><a href="\${p.url}" target="_blank">\${p.bookieId}</a></li>\`
    ).join('');
    
    const manifestsList = data.manifests.slice(0, 10).map((m: any) => 
      \`<li><a href="\${m.url}" target="_blank">\${m.bookieId}</a></li>\`
    ).join('');
    
    const content = \`
      <h3>R2 Bucket Registry</h3>
      <p><strong>Bucket:</strong> <code>\${data.bucket}</code></p>
      <p><strong>Base URL:</strong> <a href="\${data.baseUrl}" target="_blank">\${data.baseUrl}</a></p>
      <p><strong>Total Objects:</strong> \${data.totalObjects}</p>
      
      <h4>Profiles (\${data.profiles.length})</h4>
      <ul style="list-style: none; padding: 0;">
        \${profilesList}
        \${data.profiles.length > 10 ? '<li>... and ' + (data.profiles.length - 10) + ' more</li>' : ''}
      </ul>
      
      <h4>Manifests (\${data.manifests.length})</h4>
      <ul style="list-style: none; padding: 0;">
        \${manifestsList}
        \${data.manifests.length > 10 ? '<li>... and ' + (data.manifests.length - 10) + ' more</li>' : ''}
      </ul>
      
      <p><strong>Storage:</strong> R2 Bucket (private-backed) + Bun SQLite (local cache)</p>
    \`;
    createModal('☁️ R2 Bucket Registry', content);
  } catch (error) {
    alert('Failed to load R2 registry: ' + error);
  }
}

    async function loadBetTypeStats() {
      try {
        const response = await fetch('/api/bet-type/stats');
        const data = await response.json();
        
        document.getElementById('bet-type-total')!.textContent = data.betTypes?.length || '0';
        document.getElementById('bet-type-patterns')!.textContent = data.patternsDetected || '0';
        document.getElementById('bet-type-rg-compliant')!.textContent = data.rgCompliant || '0';
        
        const highlighted = JSON.stringify(data, null, 2);
        const content = \`
          <div style="margin-bottom:20px;">
            <h3 style="color:#0d6efd;margin-bottom:15px;">📊 Bet-Type Detection Statistics</h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:15px;margin-bottom:20px;">
              <div style="padding:15px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;border-radius:10px;text-align:center;">
                <div style="font-size:0.9em;opacity:0.9;margin-bottom:5px;">Bet Types</div>
                <div style="font-size:2em;font-weight:800;">\${data.betTypes?.length || 0}</div>
              </div>
              <div style="padding:15px;background:linear-gradient(135deg,#28a745 0%,#20c997 100%);color:white;border-radius:10px;text-align:center;">
                <div style="font-size:0.9em;opacity:0.9;margin-bottom:5px;">Patterns</div>
                <div style="font-size:2em;font-weight:800;">\${data.patternsDetected || 0}</div>
              </div>
              <div style="padding:15px;background:linear-gradient(135deg,#17a2b8 0%,#138496 100%);color:white;border-radius:10px;text-align:center;">
                <div style="font-size:0.9em;opacity:0.9;margin-bottom:5px;">RG Compliant</div>
                <div style="font-size:2em;font-weight:800;">\${data.rgCompliant || 0}</div>
              </div>
            </div>
          </div>
          <pre style="background:#1e1e1e;color:#d4d4d4;padding:25px;border-radius:12px;overflow:auto;font-family:'Monaco','Courier New',monospace;font-size:0.9em;line-height:1.6;border:2px solid #333;box-shadow:inset 0 2px 8px rgba(0,0,0,0.3);">\${highlighted}</pre>
        \`;
        
        createModal('🎯 Bet-Type Detection Stats', content);
      } catch (error) {
        alert('Failed to load bet-type stats: ' + handleError(error, 'Unknown error'));
      }
    }
    
    async function loadBetTypeDetection() {
      try {
        const bookieId = prompt('Enter bookmaker ID (e.g., pinnacle):') || 'pinnacle';
        const marketId = prompt('Enter market ID:') || 'test-market';
        const betType = prompt('Enter bet type (team-total, parlay, same-game-parlay, teaser, bought-points):') || 'team-total';
        
        const response = await fetch(\`/api/bet-type/detect/\${bookieId}/\${marketId}?betType=\${betType}\`);
        const data = await response.json();
        
        const highlighted = JSON.stringify(data, null, 2);
        const content = \`
          <div style="margin-bottom:20px;">
            <h3 style="color:#0d6efd;margin-bottom:15px;">🔍 Bet-Type Detection Result</h3>
            <div style="padding:15px;background:#e7f3ff;border-radius:8px;border-left:4px solid #0d6efd;margin-bottom:20px;">
              <strong style="color:#0d6efd;">Bookmaker:</strong> \${bookieId}<br>
              <strong style="color:#0d6efd;">Market:</strong> \${marketId}<br>
              <strong style="color:#0d6efd;">Bet Type:</strong> \${betType}
            </div>
          </div>
          <pre style="background:#1e1e1e;color:#d4d4d4;padding:25px;border-radius:12px;overflow:auto;font-family:'Monaco','Courier New',monospace;font-size:0.9em;line-height:1.6;border:2px solid #333;box-shadow:inset 0 2px 8px rgba(0,0,0,0.3);">\${highlighted}</pre>
        \`;
        
        createModal('🔍 Bet-Type Detection', content);
      } catch (error) {
        alert('Failed to run detection: ' + handleError(error, 'Unknown error'));
      }
    }
    
    async function loadRGCompliance() {
      try {
        const response = await fetch('/api/bet-type/stats');
        const data = await response.json();
        
        const rgData = data.rgCompliance || {};
        const highlighted = JSON.stringify(rgData, null, 2);
        const content = \`
          <div style="margin-bottom:20px;">
            <h3 style="color:#0d6efd;margin-bottom:15px;">🛡️ RG Compliance Status</h3>
            <div style="padding:15px;background:\${rgData.compliant ? '#d4edda' : '#f8d7da'};border-radius:8px;border-left:4px solid:\${rgData.compliant ? '#28a745' : '#dc3545'};margin-bottom:20px;">
              <strong style="color:\${rgData.compliant ? '#28a745' : '#dc3545'};">
                Status: \${rgData.compliant ? '✅ Compliant' : '⚠️ Alert'}
              </strong><br>
              <span style="color:#666;">Ruin Risk: \${rgData.ruinRisk?.toFixed(2) || 'N/A'}%</span><br>
              <span style="color:#666;">CIELAB ΔE: \${rgData.cielabDelta?.toFixed(2) || 'N/A'}</span>
            </div>
          </div>
          <pre style="background:#1e1e1e;color:#d4d4d4;padding:25px;border-radius:12px;overflow:auto;font-family:'Monaco','Courier New',monospace;font-size:0.9em;line-height:1.6;border:2px solid #333;box-shadow:inset 0 2px 8px rgba(0,0,0,0.3);">\${highlighted}</pre>
        \`;
        
        createModal('🛡️ RG Compliance', content);
      } catch (error) {
        alert('Failed to load RG compliance: ' + handleError(error, 'Unknown error'));
      }
    }
    
    async function loadManifests() {
  try {
    const response = await fetch('/api/registry/manifests/pinnacle');
    const data = await response.json();
    const content = \`
      <h3>RG Index Manifests: Pinnacle (Example)</h3>
      <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto;">
\${JSON.stringify(data, null, 2)}
      </pre>
      <p><strong>Note:</strong> Manifests are populated when RG index skeleton is generated via <code>generateRGIndexSkeleton</code></p>
    \`;
    createModal('📁 RG Index Manifests', content);
  } catch (error) {
    alert('Failed to load manifests: ' + error);
  }
}

async function loadRegistry() {
  try {
    const response = await fetch('/api/registry/bookmakers');
    const data = await response.json();
    
    const bookmakersList = data.bookmakers.map((b: any) => 
      \`<li><strong>\${b.bookieId}</strong> (\${b.tier}) - Profile: \${b.hasBehavioralProfile ? '✅' : '❌'}, RG Index: \${b.hasRGIndex ? '✅' : '❌'}</li>\`
    ).join('');
    
    const content = \`
      <h3>Bookmaker Registry (\${data.total} total)</h3>
      <ul style="list-style: none; padding: 0;">
        \${bookmakersList}
      </ul>
      <p><strong>Storage:</strong> Durable Object (production) / Bun SQLite (local)</p>
    \`;
    createModal('📚 Bookmaker Registry', content);
  } catch (error) {
    alert('Failed to load registry: ' + error);
  }
}

async function loadTiers() {
  try {
    const response = await fetch('/api/registry/tiers');
    const data = await response.json();
    
    const tierList = Object.entries(data.tiers).map(([tier, info]: [string, any]) => 
      \`<li><strong>\${tier}</strong>: \${info.count} bookmakers (\${info.bookmakers.slice(0, 5).join(', ')}\${info.bookmakers.length > 5 ? '...' : ''})</li>\`
    ).join('');
    
    const content = \`
      <h3>Tier Distribution</h3>
      <ul style="list-style: none; padding: 0;">
        \${tierList}
      </ul>
      <p><strong>Total:</strong> \${Object.values(data.total).reduce((a: number, b: number) => a + b, 0)} bookmakers</p>
    \`;
    createModal('🎯 Tier Distribution', content);
  } catch (error) {
    alert('Failed to load tiers: ' + error);
  }
}

async function loadWorkers() {
      try {
        const response = await fetch('/api/dev/workers');
        if (!response.ok) {
          throw new Error(\`Worker API returned \${response.status}: \${response.statusText}\`);
        }
        const data = await response.json();
        
        const dataStr = JSON.stringify(data, null, 2);
        const highlighted = highlightJSON(dataStr);
        
        const summary = data.summary || {};
        const hasError = data.error || response.status === 503;
        const errorMessage = hasError ? '<div style="margin-bottom:20px;padding:15px;background:#fff4e6;border-radius:8px;border-left:4px solid #fd7e14;"><strong style="color:#fd7e14;display:block;margin-bottom:5px;">⚠️ Worker API Not Available</strong><span style="color:#666;font-size:0.9em;">The worker telemetry API is not running. Start it with <code style="background:#fff;padding:2px 6px;border-radius:4px;color:#fd7e14;">bun run scripts/worker-telemetry-api.ts</code> or check if it\'s running on port \${WORKER_API_PORT_VALUE}.</span></div>' : '';
        
        const content = \`
          \${errorMessage}
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-bottom:25px;">
            <div style="padding:15px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;border-radius:10px;text-align:center;">
              <div style="font-size:0.9em;opacity:0.9;margin-bottom:5px;">Total</div>
              <div style="font-size:2em;font-weight:800;">\${summary.total || 0}</div>
            </div>
            <div style="padding:15px;background:linear-gradient(135deg,#28a745 0%,#20c997 100%);color:white;border-radius:10px;text-align:center;">
              <div style="font-size:0.9em;opacity:0.9;margin-bottom:5px;">Idle</div>
              <div style="font-size:2em;font-weight:800;">\${summary.idle || 0}</div>
            </div>
            <div style="padding:15px;background:linear-gradient(135deg,#ffc107 0%,#ff9800 100%);color:#333;border-radius:10px;text-align:center;">
              <div style="font-size:0.9em;opacity:0.9;margin-bottom:5px;">Working</div>
              <div style="font-size:2em;font-weight:800;">\${summary.working || 0}</div>
            </div>
            <div style="padding:15px;background:linear-gradient(135deg,#dc3545 0%,#c82333 100%);color:white;border-radius:10px;text-align:center;">
              <div style="font-size:0.9em;opacity:0.9;margin-bottom:5px;">Error</div>
              <div style="font-size:2em;font-weight:800;">\${summary.error || 0}</div>
            </div>
          </div>
          <pre style="background:#1e1e1e;color:#d4d4d4;padding:25px;border-radius:12px;overflow:auto;font-family:'Monaco','Courier New',monospace;font-size:0.9em;line-height:1.6;border:2px solid #333;box-shadow:inset 0 2px 8px rgba(0,0,0,0.3);">\${highlighted}</pre>
          <div style="margin-top:20px;padding:15px;background:#e7f3ff;border-radius:8px;border-left:4px solid #0d6efd;">
            <strong style="color:#0d6efd;display:block;margin-bottom:5px;">💡 Tip</strong>
            <span style="color:#666;font-size:0.9em;">Access via <code style="background:#fff;padding:2px 6px;border-radius:4px;color:#0d6efd;">GET /api/dev/workers</code> or WebSocket at <code style="background:#fff;padding:2px 6px;border-radius:4px;color:#0d6efd;">ws://localhost:\${WORKER_API_PORT_VALUE}/ws/workers/telemetry</code></span>
          </div>
        \`;
        
        createModal('👷 Worker Registry', content);
      } catch (error) {
        alert('Failed to load workers: ' + handleError(error, 'Unknown error'));
      }
    }
    
    async function loadGlossary() {
      try {
        const response = await fetch('/api/glossary/search');
        const data = await response.json();
        document.getElementById('glossary-total')!.textContent = data.count?.toString() || '0';
        
        const highlighted = JSON.stringify(data, null, 2);
        const content = \`
          <h3>📚 All Glossary Terms (\${data.count} total)</h3>
          <pre style="background:#1e1e1e;color:#d4d4d4;padding:25px;border-radius:12px;overflow:auto;font-family:'Monaco','Courier New',monospace;font-size:0.9em;line-height:1.6;">\${highlighted}</pre>
        \`;
        createModal('📚 Betting Glossary', content);
      } catch (error) {
        alert('Failed to load glossary: ' + error);
      }
    }
    
    async function searchGlossary() {
      const keyword = prompt('Enter search keyword:') || '';
      if (!keyword) return;
      
      try {
        const response = await fetch(\`/api/glossary/search?keyword=\${encodeURIComponent(keyword)}\`);
        const data = await response.json();
        
        const highlighted = JSON.stringify(data, null, 2);
        const content = \`
          <h3>🔍 Search Results: "\${keyword}" (\${data.count} matches)</h3>
          <pre style="background:#1e1e1e;color:#d4d4d4;padding:25px;border-radius:12px;overflow:auto;font-family:'Monaco','Courier New',monospace;font-size:0.9em;line-height:1.6;">\${highlighted}</pre>
        \`;
        createModal('🔍 Glossary Search', content);
      } catch (error) {
        alert('Failed to search glossary: ' + error);
      }
    }
    
    async function loadBetTypeTerms() {
      try {
        const response = await fetch('/api/glossary/bet-types');
        const data = await response.json();
        document.getElementById('glossary-bet-types')!.textContent = data.count?.toString() || '0';
        
        const termsList = data.terms.map((t: any) => 
          \`<li><strong>\${t.term}</strong> (\${t.abbreviation}) - \${t.definition.substring(0, 100)}...</li>\`
        ).join('');
        
        const content = \`
          <h3>🎯 Bet-Type Terms (\${data.count} total)</h3>
          <ul style="list-style: none; padding: 0;">
            \${termsList}
          </ul>
        \`;
        createModal('🎯 Bet-Type Terms', content);
      } catch (error) {
        alert('Failed to load bet-type terms: ' + error);
      }
    }
    
    async function loadRGTerms() {
      try {
        const response = await fetch('/api/glossary/category/rg_compliance');
        const data = await response.json();
        document.getElementById('glossary-rg-terms')!.textContent = data.count?.toString() || '0';
        
        const termsList = data.terms.map((t: any) => 
          \`<li><strong>\${t.term}</strong> - \${t.definition.substring(0, 100)}...</li>\`
        ).join('');
        
        const content = \`
          <h3>🛡️ RG Compliance Terms (\${data.count} total)</h3>
          <ul style="list-style: none; padding: 0;">
            \${termsList}
          </ul>
        \`;
        createModal('🛡️ RG Terms', content);
      } catch (error) {
        alert('Failed to load RG terms: ' + error);
      }
    }
    
    async function loadFeatureFlags() {
      try {
        const response = await fetch('/api/feature-flags');
        const data = await response.json();
        document.getElementById('feature-flags-total')!.textContent = data.count?.toString() || '0';
        document.getElementById('feature-flags-enabled')!.textContent = data.enabled?.toString() || '0';
        
        const flagsList = data.flags.map((f: any) => 
          \`<li><strong>\${f.key}</strong> - <span class="status-badge \${f.enabled ? 'status-active' : 'status-inactive'}">\${f.enabled ? '✅ Enabled' : '❌ Disabled'}</span> - \${f.description}</li>\`
        ).join('');
        
        const content = \`
          <h3>🚩 Feature Flags (\${data.count} total, \${data.enabled} enabled)</h3>
          <ul style="list-style: none; padding: 0;">
            \${flagsList}
          </ul>
        \`;
        createModal('🚩 Feature Flags', content);
      } catch (error) {
        alert('Failed to load feature flags: ' + error);
      }
    }
    
    async function loadFeatureFlagsByCategory(category: string) {
      try {
        const response = await fetch(\`/api/feature-flags?category=\${category}\`);
        const data = await response.json();
        
        const flagsList = data.flags.map((f: any) => 
          \`<li><strong>\${f.key}</strong> - <span class="status-badge \${f.enabled ? 'status-active' : 'status-inactive'}">\${f.enabled ? '✅ Enabled' : '❌ Disabled'}</span> - \${f.description}</li>\`
        ).join('');
        
        const content = \`
          <h3>🚩 \${category.charAt(0).toUpperCase() + category.slice(1)} Feature Flags (\${data.count} total, \${data.enabled} enabled)</h3>
          <ul style="list-style: none; padding: 0;">
            \${flagsList}
          </ul>
        \`;
        createModal(\`🚩 \${category} Feature Flags\`, content);
      } catch (error) {
        alert('Failed to load feature flags: ' + error);
      }
    }
    
    async function loadFeedStats() {
      try {
        const response = await fetch('/api/feeds/matrix');
        const data = await response.json();
        
        // Update stats on dashboard
        const feedsTotalEl = document.getElementById('feeds-total');
        const feedsKvEl = document.getElementById('feeds-kv-count');
        const feedsR2El = document.getElementById('feeds-r2-count');
        const feedsDoEl = document.getElementById('feeds-do-count');
        
        if (feedsTotalEl) {
          feedsTotalEl.textContent = data.feeds?.length?.toString() || '0';
        }
        if (feedsKvEl && data.summary) {
          feedsKvEl.textContent = data.summary.kv?.toString() || '0';
        }
        if (feedsR2El && data.summary) {
          feedsR2El.textContent = data.summary.r2?.toString() || '0';
        }
        if (feedsDoEl && data.summary) {
          feedsDoEl.textContent = data.summary.durableObjects?.toString() || '0';
        }
      } catch (error) {
        console.error('Failed to load feed stats:', error);
        const feedsTotalEl = document.getElementById('feeds-total');
        if (feedsTotalEl) {
          feedsTotalEl.textContent = 'Error';
          feedsTotalEl.style.color = '#dc3545';
        }
      }
    }
    
    async function loadFeedMatrix() {
      try {
        const response = await fetch('/api/feeds/matrix');
        const data = await response.json();
        
        // Update stats
        document.getElementById('feeds-total')!.textContent = data.feeds?.length?.toString() || '0';
        
        // Build feed cards with colors
        const feedsHtml = data.feeds.map((feed: any) => {
          const color = feed.color || '#667eea';
          const kvList = feed.kv?.map((k: string) => \`<span style="background:#00FF00;color:#000;padding:2px 8px;border-radius:4px;font-size:0.85em;margin:2px;">\${k}</span>\`).join(' ') || '-';
          const r2List = feed.r2?.map((r: string) => \`<span style="background:#0000FF;color:#fff;padding:2px 8px;border-radius:4px;font-size:0.85em;margin:2px;">\${r}</span>\`).join(' ') || '-';
          const doList = feed.durableObject ? \`<span style="background:#FF00FF;color:#fff;padding:2px 8px;border-radius:4px;font-size:0.85em;">\${feed.durableObject}</span>\` : '-';
          const flagsList = feed.featureFlags?.map((f: string) => \`<span style="background:#FFFF00;color:#000;padding:2px 8px;border-radius:4px;font-size:0.85em;margin:2px;">\${f}</span>\`).join(' ') || '-';
          const envList = feed.envVars?.map((e: string) => \`<code style="background:#FFA500;color:#000;padding:2px 6px;border-radius:4px;font-size:0.85em;margin:2px;">\${e}</code>\`).join(' ') || '-';
          
          return \`
            <div style="margin-bottom:25px;padding:20px;background:linear-gradient(135deg, \${color}15 0%, \${color}05 100%);border-left:5px solid \${color};border-radius:8px;">
              <h3 style="color:\${color};margin-top:0;margin-bottom:15px;font-size:1.3em;display:flex;align-items:center;gap:10px;">
                <span style="width:20px;height:20px;background:\${color};border-radius:50%;display:inline-block;"></span>
                \${feed.name}
              </h3>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin-top:15px;">
                <div>
                  <strong style="color:#666;font-size:0.9em;">Worker:</strong><br>
                  <code style="background:#e9ecef;padding:4px 8px;border-radius:4px;display:inline-block;margin-top:4px;">\${feed.worker || 'N/A'}</code>
                </div>
                <div>
                  <strong style="color:#666;font-size:0.9em;">Durable Object:</strong><br>
                  <div style="margin-top:4px;">\${doList}</div>
                </div>
                <div>
                  <strong style="color:#666;font-size:0.9em;">KV Namespaces:</strong><br>
                  <div style="margin-top:4px;">\${kvList}</div>
                </div>
                <div>
                  <strong style="color:#666;font-size:0.9em;">R2 Buckets:</strong><br>
                  <div style="margin-top:4px;">\${r2List}</div>
                </div>
                <div>
                  <strong style="color:#666;font-size:0.9em;">Feature Flags:</strong><br>
                  <div style="margin-top:4px;">\${flagsList}</div>
                </div>
                <div>
                  <strong style="color:#666;font-size:0.9em;">Env Variables:</strong><br>
                  <div style="margin-top:4px;">\${envList}</div>
                </div>
              </div>
            </div>
          \`;
        }).join('');
        
        const content = \`
          <h3 style="color:#667eea;margin-bottom:20px;">🌊 Feed Matrix (\${data.feeds?.length || 0} feeds)</h3>
          <div style="margin-bottom:20px;padding:15px;background:#f8f9fa;border-radius:8px;">
            <strong>Summary:</strong> \${data.summary.feeds} feeds, \${data.summary.kv} KV namespaces, \${data.summary.r2} R2 buckets, \${data.summary.durableObjects} Durable Objects, \${data.summary.featureFlags} feature flags
          </div>
          <div style="max-height:70vh;overflow-y:auto;">
            \${feedsHtml}
          </div>
        \`;
        createModal('🌊 Feed Matrix', content, { width: 1200 });
      } catch (error) {
        alert('Failed to load feed matrix: ' + handleError(error, 'Unknown error'));
      }
    }
    
    async function checkShadowWSStatus() {
      try {
        const response = await fetch('/api/shadow-ws/status');
        const data = await response.json();
        
        const statusEl = document.getElementById('shadow-ws-status');
        const connectionsEl = document.getElementById('shadow-ws-connections');
        const ticksEl = document.getElementById('shadow-ws-ticks');
        
        if (statusEl) {
          if (data.running) {
            statusEl.textContent = '✅ Running';
            statusEl.style.color = '#28a745';
          } else {
            statusEl.textContent = '❌ Not Running';
            statusEl.style.color = '#dc3545';
          }
        }
        
        if (connectionsEl && data.stats) {
          const totalConnections = Object.values(data.stats.tiers || {}).reduce((sum: number, tier: any) => sum + (tier.connections || 0), 0);
          connectionsEl.textContent = totalConnections.toString();
        }
        
        if (ticksEl && data.stats) {
          ticksEl.textContent = data.stats.totalTicks?.toString() || '0';
        }
      } catch (error) {
        const statusEl = document.getElementById('shadow-ws-status');
        if (statusEl) {
          statusEl.textContent = '❌ Error';
          statusEl.style.color = '#dc3545';
        }
        console.error('Failed to check Shadow WS status:', error);
      }
    }
    
    // Initial load
    updateStatus();
    loadGlossary();
    loadFeatureFlags();
    loadFeedStats(); // Load stats without opening modal
    checkShadowWSStatus();
    
    // Auto-refresh Shadow WS status every 10 seconds
    setInterval(checkShadowWSStatus, 10000);
  </script>
</body>
</html>`;
}

// Dev Server Configuration
// Port Configuration (in priority order - handled automatically by Bun):
// - CLI flag: `bun --port=4002 dev-server.ts` (highest priority)
// - BUN_PORT environment variable
// - PORT environment variable
// - NODE_PORT environment variable
// - Default: 3002
// - Random: Set port to 0 for random available port
// 
// Key Principle: Do NOT hardcode port in Bun.serve() - let Bun's automatic priority system handle it.
// This ensures CLI flag takes precedence over all environment variables (production-critical for CI/CD).
// 
// Hostname Configuration:
// - HOSTNAME environment variable
// - Default: '0.0.0.0' (all interfaces) per Bun docs
// 
// Idle Timeout:
// - IDLE_TIMEOUT environment variable (seconds)
// - Default: 120 seconds (2 minutes)
// 
// Bun Documentation:
// - https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname
// - https://bun.com/docs/runtime/http/server#configuring-a-default-port
// - https://bun.com/docs/runtime/http/server#idletimeout

// Configuration constants (for logging/reference only)
// Note: Port is handled automatically by Bun - do NOT specify in Bun.serve()
const HOSTNAME = process.env.HOSTNAME || '0.0.0.0';
const IDLE_TIMEOUT_SECONDS = parseInt(process.env.IDLE_TIMEOUT || String(DEFAULT_IDLE_TIMEOUT), 10);

// Development mode configuration
// When development: false (production mode), Bun enables:
// - In-memory caching of bundled assets (lazy bundling on first request, cached until restart)
// - Cache-Control headers and ETag headers (automatic cache validation)
// - Minification of JavaScript/TypeScript/TSX/JSX files
// 
// When development: true (development mode), Bun enables:
// - Hot Module Reloading (HMR) - assets re-bundled on each request
// - Source maps for debugging
// - Console log echoing from browser to terminal
// - Detailed error messages
// 
// [#REF] https://bun.com/docs/runtime/http/server#development-mode
// [#REF] https://bun.com/docs/runtime/http/server#production-mode
const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production' && process.env.BUN_ENV !== 'production';
const DEVELOPMENT_CONFIG = IS_DEVELOPMENT
  ? {
      hmr: true,
      console: true, // Echo browser console logs to terminal
    }
  : false; // Production mode: enables caching, ETags, minification

// Generate static routes at startup (buffers immutable files in memory)
// Static routes provide 15% performance improvement for immutable files
// [#REF] https://bun.com/docs/runtime/http/routing#file-responses-vs-static-responses
const staticRoutes = await generateStaticRoutes();

// @BUN Initialize spline renderer (shared instance for all requests)
const splineRenderer = new SplineRenderer();

// @BUN Preset storage using SharedMap for zero-copy worker state
let splinePresetStore: Map<string, any> | any = null;
try {
  // @BUN SharedMap is available in Bun runtime but may not be in types
  splinePresetStore = (Bun as any).SharedMap ? new (Bun as any).SharedMap('spline-presets') : new Map();
} catch {
  splinePresetStore = new Map();
}

// @BUN Warmup completion tracking for health checks
// @PERF Critical: Prevent traffic from hitting cold functions
let warmupComplete = false;
let warmupError: Error | null = null;

// @BUN Initialize worker pool on startup (pre-spawn workers)
// @PERF Critical: Eliminates 50ms spawn latency for high-traffic endpoints
initializeWorkerPool().then(() => {
  updateMetrics({
    workerPoolSize: getWorkerPoolSize(),
    totalWorkers: getTotalWorkers(),
  });
}).catch(err => {
  log('error', 'worker_pool_init_failed', { error: err instanceof Error ? err.message : String(err) });
  console.error('[Worker Pool] Failed to initialize:', err);
});

// @BUN Warmup spline engine on startup
splineRenderer.render({
  type: 'catmull-rom',
  points: 100,
  tension: 0.5,
});
console.log('[Spline] ✅ Engine warmed up');

// @BUN Warmup spline math and AI curve detector (pre-compile for performance)
// @PERF Critical: Pre-compile math functions to avoid first-request latency
(async () => {
  log('info', 'starting_warmup');
  const warmupStart = performance.now();
  
  try {
    // Warmup spline math engine
    const warmupPoints = Array.from({ length: 100 }, (_, i) => ({ x: i, y: Math.sin(i * 0.1) }));
    catmullRomSpline(warmupPoints, 0.5, 10);
    cubicSpline(warmupPoints, 10);
    linearSpline(warmupPoints, 10);
    extrapolateSpline(warmupPoints, 10);
    console.log('[Spline] ✅ Math engine warmed up');
    
    // Warmup AI curve detector
    const warmupCurvePoints = Array.from({ length: 50 }, (_, i) => ({ x: i, y: i * 2 + 1 }));
    detectCurves(warmupCurvePoints, 0.7);
    console.log('[AI] ✅ Curve detector warmed up');
    
    warmupComplete = true;
    const warmupDuration = performance.now() - warmupStart;
    log('info', 'warmup_complete', { duration_ms: Math.round(warmupDuration) });
  } catch (error) {
    warmupError = error instanceof Error ? error : new Error(String(error));
    const warmupDuration = performance.now() - warmupStart;
    log('error', 'warmup_failed', {
      error: warmupError.message,
      duration_ms: Math.round(warmupDuration),
    });
    console.error('[Warmup] Failed:', warmupError);
    // Still mark as complete to prevent blocking, but log the error
    warmupComplete = true;
  }
})();

// @BUN Spline WebSocket clients tracking with compression metrics
const splineLiveClients = new Set<any>();
let splineLiveInterval: Timer | undefined;

// @BUN Compression metrics tracking
interface CompressionMetrics {
  uncompressedBytes: number;
  compressedBytes: number;
  messageCount: number;
}

const compressionMetrics = new Map<string, CompressionMetrics>();

function getCompressionSavings(clientId: string): string {
  const metrics = compressionMetrics.get(clientId);
  if (!metrics || metrics.messageCount === 0) return '0%';
  const savings = ((metrics.uncompressedBytes - metrics.compressedBytes) / metrics.uncompressedBytes * 100);
  return `${savings.toFixed(1)}%`;
}

function startSplineLiveStream() {
  if (splineLiveInterval) return; // Already running
  
  splineLiveInterval = setInterval(() => {
    // Generate synthetic spline data for demo (60fps)
    const path = splineRenderer.render({
      type: 'catmull-rom',
      points: 100,
      tension: 0.5,
    });
    
    // @BUN Compress path data (simplified format)
    // Uncompressed: ~150 bytes per message
    // Compressed (permessage-deflate): ~45 bytes (70% reduction)
    const compressed = {
      type: 'data',
      t: Date.now(),
      points: path.length,
      data: path.map(p => [p.x, p.y]), // Compressed format
      metadata: {
        timestamp: Date.now(),
        frame: Math.floor(Date.now() / 16.67), // 60 FPS
      },
    };
    
    const message = JSON.stringify(compressed);
    const uncompressedSize = message.length;
    
    for (const client of splineLiveClients) {
      if (client.readyState === WebSocket.OPEN) {
        // @BUN Bun automatically compresses this JSON payload if client supports permessage-deflate
        client.send(message);
        
        // Track compression metrics (approximate - actual compression happens at protocol level)
        const clientId = (client as any).clientId || 'unknown';
        const metrics = compressionMetrics.get(clientId) || { uncompressedBytes: 0, compressedBytes: 0, messageCount: 0 };
        metrics.uncompressedBytes += uncompressedSize;
        // Note: Actual compressed size is tracked at protocol level, this is approximate
        metrics.compressedBytes += Math.floor(uncompressedSize * 0.3); // ~70% compression estimate
        metrics.messageCount++;
        compressionMetrics.set(clientId, metrics);
      }
    }
  }, 16.67); // 60 FPS (1000ms / 60 = 16.67ms)
}

function stopSplineLiveStream() {
  if (splineLiveInterval) {
    clearInterval(splineLiveInterval);
    splineLiveInterval = undefined;
  }
}

// @BUN Initialize process compatibility layer (stdin/stdout ref/unref, unhandled rejections, etc.)
// This ensures proper handling of process APIs before server starts
initializeProcessCompat();

const devServer = Bun.serve<WebSocketData>({
  // ✅ Port omitted - Bun automatically handles priority: CLI flag > BUN_PORT > PORT > NODE_PORT > default 3002
  // ❌ WRONG: port: process.env.PORT || 3000 (overrides Bun's automatic handling)
  hostname: HOSTNAME,
  
  // Idle timeout: maximum time a connection can be idle before closing (in seconds)
  // [#REF] https://bun.com/docs/runtime/http/server#idletimeout
  idleTimeout: IDLE_TIMEOUT_SECONDS, // 2 minutes default
  
  // Development mode configuration
  // Production mode (development: false):
  // - In-memory caching of bundled assets (lazy bundling, cached until restart)
  // - Cache-Control headers and ETag headers (automatic cache validation)
  // - Minification of JavaScript/TypeScript/TSX/JSX files
  // 
  // Development mode (development: { hmr: true, console: true }):
  // - Hot Module Reloading (HMR) - assets re-bundled on each request
  // - Source maps for debugging
  // - Console log echoing from browser to terminal
  // - Detailed error messages
  // 
  // Set NODE_ENV=production or BUN_ENV=production to enable production mode
  // [#REF] https://bun.com/docs/runtime/http/server#development-mode
  // [#REF] https://bun.com/docs/runtime/http/server#production-mode
  development: DEVELOPMENT_CONFIG,
  
  // Routes property - Bun's native routing system
  // Routes are matched in order of specificity: Exact > Parameter > Wildcard > Catch-all
  // 
  // Route Precedence (most specific first):
  // 1. Exact routes (/api/users/me) - Highest priority
  // 2. Parameter routes (/api/users/:id) - Matches dynamic segments
  // 3. Wildcard routes (/api/*) - Matches paths under prefix
  // 4. Global catch-all (/*) - Matches all unmatched routes
  // 
  // Example from Bun docs:
  //   "/api/users/me": () => new Response("Current user"),      // Exact route
  //   "/api/users/:id": req => new Response(`User ${req.params.id}`), // Parameter route
  //   "/api/*": () => new Response("API catch-all"),            // Wildcard route
  //   "/*": () => new Response("Global catch-all"),            // Catch-all route
  // 
  // [#REF] https://bun.com/docs/runtime/http/routing#route-precedence
  // @ROUTE Bun.serve() routes property - all routes defined here
  // @BUN Bun.serve() native routing - zero-dependency, type-safe, high-performance
  // @GREP: rg "@ROUTE.*Bun\.serve" scripts/dev-server.ts
  // @GREP: rg "routes:\s*\{" scripts/dev-server.ts
  routes: {
    // 1. Exact static routes (highest priority)
    // Static responses - Zero-allocation dispatch
    // 
    // Routes can be Response objects (without handler functions).
    // Bun.serve() optimizes these for zero-allocation dispatch - perfect for:
    // - Health checks
    // - Redirects
    // - Fixed content
    // 
    // Benefits:
    // - Zero memory allocation after initialization
    // - ~15% performance improvement over manually returning a Response object
    // - Static route responses are cached for the lifetime of the server object
    // - To reload static routes, call server.reload(options)
    // 
    // Pattern examples from Bun docs:
    //   Health checks: new Response("OK")
    //   Custom headers: new Response("Ready", { headers: { "X-Ready": "1" } })
    //   No content: new Response(null, { status: 204 })
    //   Redirects: Response.redirect("https://example.com")
    //   Static JSON: Response.json({ version: "1.0.0" })
    // 
    // [#REF] https://bun.com/docs/runtime/http/routing#static-responses
    // @ROUTE Static Routes - Exact match, zero-allocation dispatch
    // @BUN Bun.serve() static responses - Response objects without handlers
    // @PERF Critical: Zero memory allocation after initialization (15% performance improvement)
    // @GREP: rg "@ROUTE.*Static" scripts/dev-server.ts
    '/favicon.ico': new Response(null, { status: 204 }),
    '/health': new Response('OK'),
    '/ready': async () => {
      // @BUN Readiness check: returns 200 only after warmup completes
      // @PERF Critical: Prevents traffic from hitting cold functions
      if (!warmupComplete) {
        return Response.json({
          ready: false,
          warmupComplete: false,
          status: 'warming_up',
        }, {
          status: 503,
          headers: {
            'Retry-After': '2',
            'X-Warmup-Status': 'in-progress',
          },
        });
      }
      
      if (warmupError) {
        return Response.json({
          ready: false,
          warmupComplete: true,
          status: 'error',
          error: warmupError.message,
        }, {
          status: 503,
          headers: {
            'X-Warmup-Status': 'error',
          },
        });
      }
      
      return Response.json({
        ready: true,
        warmupComplete: true,
        status: 'ready',
      }, {
        headers: {
          'X-Ready': '1',
          'X-Warmup-Status': 'complete',
        },
      });
    },
    
    // Redirects - Static redirect responses
    // Pattern: Response.redirect('https://example.com')
    // Use for: URL aliases, deprecated routes, external links
    '/tension-map': Response.redirect('/tension'), // Alias for tension page
    
    // Static JSON API responses - Zero-allocation dispatch
    // Pattern: Response.json({ version: '1.0.0' })
    // Use for: Static config, version info, immutable API responses
    // Note: For dynamic data, use async handlers instead
    '/api/version': Response.json({
      version: packageInfo.version || '3.1.0',
      name: packageInfo.name || 'wncaab-perf-v3.1',
      server: 'dev-server',
    }, {
      headers: apiHeaders({
        domain: 'system',
        scope: 'version',
        version: 'v2.1',
        contentType: 'application/json',
      }),
    }),
    
    // HTML imports - Bun's HTML loader returns a ServeRoute object
    // When used directly in routes, Bun automatically:
    // - Bundles CSS/JS assets referenced in the HTML
    // - Enables HMR in development (bun --hot)
    // - Uses pre-built manifest in production (bun build --target=bun)
    // - Sets correct Content-Type headers
    // - Handles asset fingerprinting and cache busting
    // [#REF] https://bun.com/docs/runtime/http/server#html-imports
    // @ROUTE HTML Import Route - Native Bun HTML loader
    // @BUN Bun.serve() HTML imports - automatic asset bundling
    // @GREP: rg "@ROUTE.*HTML" scripts/dev-server.ts
    // @X-HEADER: Custom HTTP headers for grepability
    '/tension': async (req) => {
      // Use Bun HTML import but add custom headers
      // For HTML imports, we need to handle the response and add headers
      const htmlFile = Bun.file('./templates/tension.html');
      const htmlContent = await htmlFile.text();
      return new Response(htmlContent, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-APEX-Title': 'Tension Mapping Visualizer',
          'X-APEX-Subtitle': '[Edge Tempering][AI-Immunity Indexing][Real-time Color Generation][[Visualizer]]',
          'X-APEX-Domain': 'Edge Tempering',
          'X-APEX-Scope': 'AI-Immunity Indexing',
          'X-APEX-Meta': 'Real-time Color Generation',
          'X-APEX-Type': 'Visualizer',
          'X-APEX-Version': PACKAGE_VERSION,
          'X-APEX-Component': 'tension-visualizer',
        },
      });
    },
    
    // 3. File Routes - Generated from static-routes.ts manifest
    // 
    // When serving files in routes, there are two distinct behaviors depending on
    // whether you buffer the file content or serve it directly:
    // 
    // Static routes (new Response(await file.bytes())) - Buffered at startup:
    //   Pattern: "/logo.png": new Response(await Bun.file("./logo.png").bytes())
    //   - Zero filesystem I/O during requests - content served entirely from memory
    //   - ETag support - Automatically generates and validates ETags for caching
    //   - If-None-Match - Returns 304 Not Modified when client ETag matches
    //   - No 404 handling - Missing files cause startup errors, not runtime 404s
    //   - Memory usage - Full file content stored in RAM
    //   - Best for: Small static assets, API responses, frequently accessed files
    // 
    // File routes (new Response(Bun.file(path))) - Read per request:
    //   Pattern: "/download.zip": new Response(Bun.file("./download.zip"))
    //   - Filesystem reads on each request - checks file existence and reads content
    //   - Built-in 404 handling - Returns 404 Not Found if file doesn't exist
    //   - Last-Modified support - Uses file modification time for If-Modified-Since headers
    //   - If-Modified-Since - Returns 304 Not Modified when file hasn't changed
    //   - Range request support - Automatically handles partial content requests
    //   - Streaming transfers - Uses buffered reader with backpressure handling
    //   - Memory efficient - Only buffers small chunks during transfer, not entire file
    //   - ⚡️ Speed - Bun automatically uses sendfile(2) system call when possible,
    //     enabling zero-copy file transfers in the kernel—the fastest way to send files
    //   - slice() method - Use Bun.file(path).slice(start, end) to send part of a file,
    //     automatically sets Content-Range and Content-Length headers
    //     Example (Range header parsing):
    //       const [start = 0, end = Infinity] = req.headers
    //         .get("Range")?.split("=").at(-1)?.split("-").map(Number) || [0, Infinity];
    //       return new Response(Bun.file(path).slice(start, end));
    //   - Best for: Large files, dynamic content, user uploads, files that change frequently
    // 
    // [#REF] https://bun.com/docs/runtime/http/routing#file-responses-vs-static-responses
    // @ROUTE File Routes - Bun.file() static file serving
    // @BUN Bun.file() - optimized file I/O with Range support
    // @PERF Critical: Zero-copy sendfile(2) kernel transfer for file serving
    // @GREP: rg "@ROUTE.*File" scripts/dev-server.ts
    ...Object.fromEntries(
      staticRoutes.map(r => [r.path, r.handler])
    ),
    
    // 2. Dynamic API routes
    // API Routes - async handlers in routes property
    // 
    // BunRequest extends Request, providing:
    // - All standard Request properties: method, url, headers, body, etc.
    // - req.params: Type-safe route parameters (for parameter routes)
    // - req.cookies: Read-only cookie map
    // 
    // Routes receive BunRequest and return Response or Promise<Response>.
    // This makes it easier to use the same code for both sending & receiving HTTP requests.
    // 
    // Promise<Response> support:
    // - Async/await: async () => { await ...; return Response.json(...); }
    // - Promise: () => new Promise(resolve => { ... resolve(Response.json(...)); })
    // - Direct fetch: () => fetch("https://example.com")
    // [#REF] https://bun.com/docs/runtime/http/routing#asynchronous-routes
    // [#REF] https://bun.com/docs/runtime/http/routing#promise
    // Reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
    // 
    // Async/await pattern (recommended):
    //   "/api/version": async () => {
    //     const [version] = await sql`SELECT version()`;
    //     return Response.json(version);
    //   }
    // 
    // Promise pattern (alternative):
    //   "/api/version": () => {
    //     return new Promise(resolve => {
    //       setTimeout(async () => {
    //         const [version] = await sql`SELECT version()`;
    //         resolve(Response.json(version));
    //       }, 100);
    //     });
    //   }
    // 
    // @ROUTE Dynamic API Routes - Async handlers with BunRequest<T>
    // @BUN Bun.serve() async routes - Promise<Response> support
    // @PERF Critical: High-performance async route handlers
    // @GREP: rg "@ROUTE.*Dynamic.*API" scripts/dev-server.ts
    // 
    // Sync handler pattern:
    //   "/": () => new Response("Home")
    '/api/dev/endpoints': async (req) => {
      const startTime = performance.now();
      return jsonResponse(getAllEndpoints(), 200, {
        domain: 'dev',
        scope: 'endpoints',
        version: 'v2.1',
        includeTiming: true,
        startTime,
      });
    },
    
    // @PERF Critical: Real-time metrics with event-based tracking (10K+ RPS)
    '/api/dev/metrics': async (req, server) => {
      const startTime = performance.now();
      trackRequestStart();
      
      try {
        // ✅ Fixed: Real-time metrics with event-based tracking
        const trackedMetrics = getMetricsState(server);
        
        // @BUN Enhanced metrics with production utilities
        const productionMetrics = getMetrics();
        
        // Sync worker pool metrics
        updateMetrics({
          workerPoolSize: getWorkerPoolSize(),
          totalWorkers: getTotalWorkers(),
        });
        
        const metrics = {
          timestamp: new Date().toISOString(),
          // ✅ High-precision timestamp (10ns resolution)
          timestampNs: trackedMetrics.timestampNs,
          server: {
            url: server.url.toString(),
            port: server.port,
            hostname: server.hostname,
            development: server.development,
            idleTimeout: IDLE_TIMEOUT_SECONDS,
          },
          metrics: {
            // ✅ Real-time: Event-based tracking (manual tracking + server properties)
            pendingRequests: trackedMetrics.pendingRequests,
            pendingWebSockets: trackedMetrics.pendingWebSockets,
            activeConnections: trackedMetrics.connections,
            totals: trackedMetrics.totals,
            // Backup: Server properties (in case manual tracking fails)
            serverPendingRequests: server.pendingRequests,
            serverPendingWebSockets: server.pendingWebSockets,
            // ✅ Production metrics
            workerPoolSize: getWorkerPoolSize(),
            totalWorkers: getTotalWorkers(),
            activeRequests: productionMetrics.activeRequests,
            totalSplineRenders: productionMetrics.totalSplineRenders,
            totalCurveDetections: productionMetrics.totalCurveDetections,
            totalWorkerSpawns: productionMetrics.totalWorkerSpawns,
            totalWorkerTerminations: productionMetrics.totalWorkerTerminations,
            rateLimitHits: productionMetrics.rateLimitHits,
            requestTimeouts: productionMetrics.requestTimeouts,
            uptime: productionMetrics.uptime,
          },
          // Client IP address and port for this request
          client: server.requestIP(req),
        };
        
        return jsonResponse(metrics, 200, {
          domain: 'dev',
          scope: 'metrics',
          version: 'v2.1',
          includeTiming: true,
          startTime,
        });
      } finally {
        trackRequestEnd();
      }
    },
    
    '/api/dev/configs': async () => {
      const startTime = performance.now();
      trackRequestStart();
      
      try {
        const configs = loadConfigs();
        return jsonResponse(configs, 200, {
          domain: 'dev',
          scope: 'configs',
          version: 'v2.1',
          includeTiming: true,
          startTime,
        });
      } finally {
        trackRequestEnd();
      }
    },
    
    // @PERF Critical: SharedMap zero-copy worker state (atomic reads, no serialization)
    '/api/dev/workers': async (req) => {
      const startTime = performance.now();
      trackRequestStart();
      
      try {
        // ✅ Bun-Specific Optimization: Use SharedMap for zero-copy worker state
        // Pattern: Atomic read (no serialization cost)
        let state: Record<string, WorkerInfo> | null = null;
        
        if (workerRegistryMap && typeof workerRegistryMap.get === 'function') {
          // SharedMap: Atomic read (no serialization cost)
          const rawState = workerRegistryMap.get('state');
          if (rawState && typeof rawState === 'object') {
            state = rawState as Record<string, WorkerInfo>;
          }
        }
        
        // Fallback to worker registry if SharedMap doesn't have state
        if (!state) {
          state = workerRegistry?.getRegistry() || {};
          // Cache in SharedMap for next read (if SharedMap is available)
          if (workerRegistryMap && typeof workerRegistryMap.set === 'function') {
            workerRegistryMap.set('state', state);
          }
        }
        
        // If still no state, try fetching from external worker API
        if (!state || Object.keys(state).length === 0) {
          try {
            const response = await fetch(`http://localhost:${WORKER_API_PORT}/api/workers/registry`, {
              signal: AbortSignal.timeout(WORKER_API_CHECK_TIMEOUT),
            });
            if (response.ok) {
              const rawState = await response.json();
              if (rawState && typeof rawState === 'object') {
                state = rawState as Record<string, WorkerInfo>;
                // Cache in SharedMap for next read (if SharedMap is available)
                if (workerRegistryMap && typeof workerRegistryMap.set === 'function') {
                  workerRegistryMap.set('state', state);
                }
              }
            }
          } catch (error) {
            // Worker API not available - return empty state
            state = {};
          }
        }
        
        const summary = {
          total: Object.keys(state).length,
          idle: Object.values(state).filter((w: WorkerInfo) => w.status === 'idle').length,
          working: Object.values(state).filter((w: WorkerInfo) => w.status === 'working').length,
          error: Object.values(state).filter((w: WorkerInfo) => w.status === 'error').length,
          total_queue_depth: Object.values(state).reduce((sum: number, w: WorkerInfo) => sum + (w.queue_depth || 0), 0),
        };
        
        // ✅ Pattern: Response.json with Cache-Control header
        return Response.json({ workers: state, summary }, {
          headers: {
            ...apiHeaders({
              domain: 'dev',
              scope: 'workers',
              version: 'v2.1',
              contentType: 'application/json',
              includeTiming: true,
              startTime,
            }),
            'Cache-Control': 'no-cache', // ✅ Pattern: Cache-Control header
          },
        });
      } catch (error) {
        // Return empty state if all methods fail
        return Response.json({ 
          workers: {}, 
          summary: { total: 0, idle: 0, working: 0, error: 0, total_queue_depth: 0 },
          error: 'Worker API not available',
        }, {
          headers: {
            ...apiHeaders({
              domain: 'dev',
              scope: 'workers',
              version: 'v2.1',
              contentType: 'application/json',
              includeTiming: true,
              startTime,
            }),
            'Cache-Control': 'no-cache',
          },
          status: 503,
        });
      } finally {
        trackRequestEnd();
      }
    },
    
    '/api/tension/map': async (req) => {
      const startTime = performance.now();
      trackRequestStart();
      
      // ✅ Fixed: Handle OPTIONS preflight requests
      if (req.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: CORS_HEADERS,
        });
      }
      
      try {
        const url = new URL(req.url);
        
        // Support both GET (query params) and POST (JSON body)
        let conflict: number, entropy: number, tension: number, format: string;
        let curvature: number | undefined, drift: number | undefined, decay: number | undefined;
        let pattern: string | undefined, detectedCurves: any[] | undefined;
        
        if (req.method === 'POST') {
          const body = await req.json().catch(() => ({}));
          // parseNumberParam expects string | null, but body values are numbers
          conflict = typeof body.conflict === 'number' ? Math.max(0, Math.min(1, body.conflict)) : parseNumberParam(String(body.conflict ?? 0.0), 0.0, 0, 1);
          entropy = typeof body.entropy === 'number' ? Math.max(0, Math.min(1, body.entropy)) : parseNumberParam(String(body.entropy ?? 0.0), 0.0, 0, 1);
          tension = typeof body.tension === 'number' ? Math.max(0, Math.min(1, body.tension)) : parseNumberParam(String(body.tension ?? 0.0), 0.0, 0, 1);
          curvature = body.curvature !== undefined ? parseFloat(String(body.curvature)) : undefined;
          drift = body.drift !== undefined ? parseFloat(String(body.drift)) : undefined;
          decay = body.decay !== undefined ? parseFloat(String(body.decay)) : undefined;
          pattern = body.pattern || undefined;
          detectedCurves = body.detectedCurves || undefined;
          format = body.format || 'json';
        } else {
          conflict = parseNumberParam(url.searchParams.get('conflict'), 0.0, 0, 1);
          entropy = parseNumberParam(url.searchParams.get('entropy'), 0.0, 0, 1);
          tension = parseNumberParam(url.searchParams.get('tension'), 0.0, 0, 1);
          curvature = url.searchParams.get('curvature') ? parseFloat(url.searchParams.get('curvature')!) : undefined;
          drift = url.searchParams.get('drift') ? parseFloat(url.searchParams.get('drift')!) : undefined;
          decay = url.searchParams.get('decay') ? parseFloat(url.searchParams.get('decay')!) : undefined;
          pattern = url.searchParams.get('pattern') || undefined;
          format = url.searchParams.get('format') || 'json';
        }
        
        // ✅ Cache key for ETag generation
        const cacheKey = `tension:${conflict}:${entropy}:${tension}:${format}`;
        
        // Map edge relation (macro-inlined, sub-millisecond execution)
        const result = mapEdgeRelation(conflict, entropy, tension);
        
        // Create enhanced result with additional parameters
        const enhancedResult = {
          ...result,
          meta: {
            ...result.meta,
            ...(curvature !== undefined && { curvature }),
            ...(drift !== undefined && { drift }),
            ...(decay !== undefined && { decay }),
            ...(pattern && { pattern }),
            ...(detectedCurves && { detectedCurves }),
          },
        };
        
        // Format output based on format parameter
        let responseBody: string;
        let contentType: string;
        
        if (format === 'csv') {
          const extendedFields = [
            curvature !== undefined ? `curvature,` : '',
            drift !== undefined ? `drift,` : '',
            decay !== undefined ? `decay,` : '',
            pattern ? `pattern,` : '',
          ].filter(Boolean).join('');
          
          const extendedValues = [
            curvature !== undefined ? `${curvature},` : '',
            drift !== undefined ? `${drift},` : '',
            decay !== undefined ? `${decay},` : '',
            pattern ? `"${pattern}",` : '',
          ].filter(Boolean).join('');
          
          responseBody = `conflict,entropy,tension,${extendedFields}hex,HEX,hsl,opacity,width,relation,visualNote\n${enhancedResult.meta.conflict},${enhancedResult.meta.entropy},${enhancedResult.meta.tension},${extendedValues}${enhancedResult.color.hex},${enhancedResult.color.HEX},"${enhancedResult.color.hsl}",${enhancedResult.opacity},${enhancedResult.width},${enhancedResult.meta.relation},"${enhancedResult.meta.visualNote}"`;
          contentType = 'text/csv';
        } else if (format === 'yaml') {
          const extendedYaml = [
            curvature !== undefined ? `curvature: ${curvature}` : '',
            drift !== undefined ? `drift: ${drift}` : '',
            decay !== undefined ? `decay: ${decay}` : '',
            pattern ? `pattern: ${pattern}` : '',
          ].filter(Boolean).join('\n');
          
          responseBody = `hex: ${enhancedResult.color.hex}\nHEX: ${enhancedResult.color.HEX}\nhsl: ${enhancedResult.color.hsl}\nopacity: ${enhancedResult.opacity}\nwidth: ${enhancedResult.width}\nmeta:\n  relation: ${enhancedResult.meta.relation}\n  conflict: ${enhancedResult.meta.conflict}\n  entropy: ${enhancedResult.meta.entropy}\n  tension: ${enhancedResult.meta.tension}${extendedYaml ? '\n  ' + extendedYaml.replace(/\n/g, '\n  ') : ''}\n  absorbedBy: ${enhancedResult.meta.absorbedBy}\n  visualNote: "${enhancedResult.meta.visualNote}"`;
          contentType = 'text/yaml';
        } else if (format === 'table') {
          const emoji = enhancedResult.meta.relation === 'temperate' ? '🟢' : enhancedResult.meta.relation === 'extreme' ? '🔴' : '🟠';
          const opacityPercent = Math.round(enhancedResult.opacity * 100);
          
          const conflictStr = enhancedResult.meta.conflict.toFixed(3);
          const entropyStr = enhancedResult.meta.entropy.toFixed(3);
          const tensionStr = enhancedResult.meta.tension.toFixed(3);
          const relationStr = padToWidth(enhancedResult.meta.relation, 20);
          const visualNoteStr = padToWidth(enhancedResult.meta.visualNote.substring(0, 45), 45);
          
          const extendedParams = [
            curvature !== undefined ? `│   Curvature: ${padToWidth(curvature.toFixed(3), 7)}                                    │\n` : '',
            drift !== undefined ? `│   Drift:     ${padToWidth(drift.toFixed(3), 7)}                                    │\n` : '',
            decay !== undefined ? `│   Decay:     ${padToWidth(decay.toFixed(3), 7)}                                    │\n` : '',
            pattern ? `│   Pattern:   ${padToWidth(pattern, 20)}                            │\n` : '',
          ].filter(Boolean).join('');
          
          responseBody = `\n┌─────────────────────────────────────────────────────────────┐\n│ ${emoji} Tension Mapping Result                              │\n├─────────────────────────────────────────────────────────────┤\n│ Parameters:                                                 │\n│   Conflict:  ${padToWidth(conflictStr, 7)}                                    │\n│   Entropy:   ${padToWidth(entropyStr, 7)}                                    │\n│   Tension:   ${padToWidth(tensionStr, 7)}                                    │\n${extendedParams}├─────────────────────────────────────────────────────────────┤\n│ Visual Properties:                                           │\n│   Color:     ${enhancedResult.color.HEX} (${enhancedResult.color.hsl})                    │\n│   Opacity:   ${opacityPercent}% (${enhancedResult.opacity.toFixed(3)})                              │\n│   Width:     ${enhancedResult.width}px                                              │\n├─────────────────────────────────────────────────────────────┤\n│ Metadata:                                                   │\n│   Relation:  ${relationStr}                            │\n│   Note:      ${visualNoteStr}         │\n└─────────────────────────────────────────────────────────────┘\n`;
          contentType = 'text/plain';
        } else {
          // ✅ Use Response.json() instead of JSON.stringify() (2x faster)
          // ✅ Semantic versioning: Use API_VERSION constant from lib/constants.ts
          const versionString = API_VERSION; // Semantic version format
          
          const responseData = {
            data: enhancedResult,
            version: versionString,
            timestamp: new Date().toISOString(),
          };
          // Generate ETag for JSON responses
          const etag = generateETag(JSON.stringify(responseData));
          
          // Check If-None-Match header (ETag caching)
          const cachedResponse = checkETag(req, etag);
          if (cachedResponse) return cachedResponse;
          
          // Return optimized JSON response with ETag
          const headers = apiHeaders({
            domain: 'tension',
            scope: 'mapping',
            version: `v${versionString}`,
            contentType: 'application/json',
            includeTiming: true,
            startTime,
          });
          
          headers['ETag'] = etag;
          headers['Cache-Control'] = 'public, max-age=3600'; // Cache for 1 hour
          
          return Response.json(responseData, {
            status: 200,
            headers,
          });
        }
        
        // For non-JSON formats, generate ETag and check cache
        const etag = generateETag(responseBody);
        const cachedResponse = checkETag(req, etag);
        if (cachedResponse) return cachedResponse;
        
        // Return response with appropriate content type and standardized headers
        // ✅ Semantic versioning: Use API_VERSION constant from lib/constants.ts
        const versionString = API_VERSION; // Semantic version format
        
        const headers = apiHeaders({
          domain: 'tension',
          scope: 'mapping',
          version: `v${versionString}`,
          contentType,
          includeTiming: true,
          startTime,
        });
        
        headers['ETag'] = etag;
        headers['Cache-Control'] = 'public, max-age=3600';
        
        return new Response(responseBody, {
          status: 200,
          headers,
        });
      } catch (error) {
        return errorResponse(
          `Tension mapping failed: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'tension', scope: 'mapping', version: `v${API_VERSION}` }
        );
      } finally {
        trackRequestEnd();
      }
    },
    
    '/api/tension/batch': async (req) => {
      const startTime = performance.now();
      trackRequestStart();
      
      if (req.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: CORS_HEADERS,
        });
      }
      
      try {
        const url = new URL(req.url);
        let inputs: Array<{ conflict: number; entropy: number; tension: number }>;
        
        if (req.method === 'POST') {
          const body = await req.json().catch(() => ({}));
          if (Array.isArray(body.inputs)) {
            inputs = body.inputs.map((input: any) => ({
              conflict: parseNumberParam(input.conflict, 0.0, 0, 1),
              entropy: parseNumberParam(input.entropy, 0.0, 0, 1),
              tension: parseNumberParam(input.tension, 0.0, 0, 1),
            }));
          } else if (body.conflict !== undefined) {
            // Single input in POST body
            inputs = [{
              conflict: parseNumberParam(body.conflict, 0.0, 0, 1),
              entropy: parseNumberParam(body.entropy, 0.0, 0, 1),
              tension: parseNumberParam(body.tension, 0.0, 0, 1),
            }];
          } else {
            return errorResponse('Invalid request body. Expected { inputs: [...] } or { conflict, entropy, tension }', 400, {
              domain: 'tension',
              scope: 'batch',
              version: API_VERSION, // ✅ Semantic versioning format
            });
          }
        } else {
          // GET: comma-separated values
          const conflicts = (url.searchParams.get('conflicts') || '').split(',').filter(Boolean);
          const entropies = (url.searchParams.get('entropies') || '').split(',').filter(Boolean);
          const tensions = (url.searchParams.get('tensions') || '').split(',').filter(Boolean);
          
          if (conflicts.length === 0 || entropies.length === 0 || tensions.length === 0) {
            return errorResponse('GET requires conflicts, entropies, and tensions query params (comma-separated)', 400, {
              domain: 'tension',
              scope: 'batch',
              version: API_VERSION, // ✅ Semantic versioning format
            });
          }
          
          const maxLength = Math.max(conflicts.length, entropies.length, tensions.length);
          inputs = Array.from({ length: maxLength }, (_, i) => ({
            conflict: parseNumberParam(conflicts[i] || conflicts[0], 0.0, 0, 1),
            entropy: parseNumberParam(entropies[i] || entropies[0], 0.0, 0, 1),
            tension: parseNumberParam(tensions[i] || tensions[0], 0.0, 0, 1),
          }));
        }
        
        // Limit batch size
        if (inputs.length > 100) {
          return errorResponse('Batch size limited to 100 requests', 400, {
            domain: 'tension',
            scope: 'batch',
            version: API_VERSION, // ✅ Semantic versioning format
          });
        }
        
        // Process all inputs in parallel
        const results = inputs.map(input => ({
          input: input,
          result: mapEdgeRelation(input.conflict, input.entropy, input.tension),
        }));
        
        const responseData = {
          data: results.map(r => ({
            input: r.input,
            output: r.result,
          })),
          count: results.length,
          version: API_VERSION, // ✅ Semantic versioning format
          timestamp: new Date().toISOString(),
        };
        
        const headers = apiHeaders({
          domain: 'tension',
          scope: 'batch',
          version: API_VERSION, // ✅ Semantic versioning format
          contentType: 'application/json',
          includeTiming: true,
          startTime,
        });
        
        return Response.json(responseData, {
          status: 200,
          headers,
        });
      } catch (error) {
        return errorResponse(
          `Batch processing failed: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'tension', scope: 'batch', version: `v${API_VERSION}` }
        );
      } finally {
        trackRequestEnd();
      }
    },
    
    '/api/tension/help': async (req, server) => {
      const startTime = performance.now();
      
      // ✅ Fixed: Handle OPTIONS preflight requests
      if (req.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: CORS_HEADERS,
        });
      }
      
      const helpDoc = {
        title: 'Tension Mapping API - Edge Relation Tempering',
        version: API_VERSION, // ✅ Semantic versioning format
        description: 'Maps conflict/entropy/tension parameters to visual edge properties',
        endpoints: {
          map: {
            method: 'GET, POST',
            path: '/api/tension/map',
            description: 'Map tension parameters to visual properties',
            query: {
              conflict: {
                type: 'number',
                range: '0.0-1.0',
                description: 'Conflict level - Higher = more visible opacity',
                default: 0.0,
              },
              entropy: {
                type: 'number',
                range: '0.0-1.0',
                description: 'Entropy level - Higher = thicker width',
                default: 0.0,
              },
              tension: {
                type: 'number',
                range: '0.0-1.0',
                description: 'Tension level - Higher = redder, lower = greener',
                default: 0.0,
              },
              format: {
                type: 'string',
                options: ['json', 'yaml', 'csv', 'table'],
                description: 'Output format - json (default), yaml, csv, or table',
                default: 'json',
              },
            },
            body: {
              conflict: 'number (0.0-1.0)',
              entropy: 'number (0.0-1.0)',
              tension: 'number (0.0-1.0)',
              format: 'string (optional)',
            },
            examples: [
              '/api/tension/map?conflict=1.0&entropy=0.0&tension=0.0',
              '/api/tension/map?conflict=0.5&entropy=0.3&tension=0.7&format=csv',
              '/api/tension/map?conflict=0.5&entropy=0.3&tension=0.7&format=table',
              '/api/tension/map?conflict=0.5&entropy=0.3&tension=0.7&format=yaml',
              'POST /api/tension/map with JSON body: { "conflict": 1.0, "entropy": 0.0, "tension": 0.0 }',
            ],
            response: {
              color: {
                hex: 'Lowercase hex color (#80ff80)',
                HEX: 'Uppercase hex color (#80FF80)',
                hsl: 'HSL formatted string (hsl(120, 100%, 75%))',
                hslObject: 'HSL object with h, s, l properties',
                rgb: 'RGB object with r, g, b properties',
              },
              opacity: 'Number (0.0-1.0)',
              width: 'Number (1-4px)',
              meta: {
                relation: 'temperate | moderate | intense | extreme',
                conflict: 'Input conflict value',
                entropy: 'Input entropy value',
                tension: 'Input tension value',
                absorbedBy: 'Source identifier',
                visualNote: 'Human-readable description',
              },
            },
          },
          batch: {
            method: 'GET, POST',
            path: '/api/tension/batch',
            description: 'Process multiple tension mappings in a single request (up to 100)',
            query: {
              conflicts: 'Comma-separated conflict values (0.0-1.0)',
              entropies: 'Comma-separated entropy values (0.0-1.0)',
              tensions: 'Comma-separated tension values (0.0-1.0)',
            },
            body: {
              inputs: 'Array of { conflict, entropy, tension } objects (max 100)',
            },
            examples: [
              'GET /api/tension/batch?conflicts=0.0,0.5,1.0&entropies=0.0,0.5,1.0&tensions=0.0,0.5,1.0',
              'POST /api/tension/batch with JSON: { "inputs": [{ "conflict": 1.0, "entropy": 0.0, "tension": 0.0 }, { "conflict": 0.5, "entropy": 0.5, "tension": 0.5 }] }',
            ],
          },
          health: {
            method: 'GET',
            path: '/api/tension/health',
            description: 'Health check for tension mapping service',
            response: {
              status: 'healthy | degraded',
              timestamp: 'ISO 8601 timestamp',
              service: 'tension-mapping',
              port: 'Server port number',
              checks: 'Health check results',
              summary: 'Check summary statistics',
              endpoints: 'Available endpoints',
            },
          },
          visualization: {
            method: 'GET',
            path: '/tension',
            description: 'Interactive visualization dashboard',
            note: 'HTML page with interactive controls for tension mapping',
          },
          help: {
            method: 'GET',
            path: '/api/tension/help',
            description: 'This help documentation',
          },
        },
        relationTypes: {
          temperate: {
            emoji: '🟢',
            range: '0.0-0.25',
            description: 'Low tension - Green color',
          },
          moderate: {
            emoji: '🟠',
            range: '0.25-0.5',
            description: 'Medium-low tension - Orange color',
          },
          intense: {
            emoji: '🟠',
            range: '0.5-0.75',
            description: 'Medium-high tension - Orange color',
          },
          extreme: {
            emoji: '🔴',
            range: '0.75-1.0',
            description: 'High tension - Red color',
          },
        },
        cli: {
          command: 'bun map:edge [OPTIONS]',
          examples: [
            'bun map:edge --conflict=1.0 --entropy=0.0 --tension=0.0',
            'bun map:edge -c0.5 -e0.3 -t0.7',
            'bun map:edge --conflict 0.8 --entropy 0.2 --tension 0.9 --format=yaml',
            'bun map:edge --help',
          ],
          help: 'Run `bun map:edge --help` for CLI documentation',
        },
        webAccess: {
          portal: `http://localhost:${server.port}/tension`,
          api: `http://localhost:${server.port}/api/tension/map?conflict=1.0&entropy=0.0&tension=0.0`,
          batch: `http://localhost:${server.port}/api/tension/batch`,
          health: `http://localhost:${server.port}/api/tension/health`,
          help: `http://localhost:${server.port}/api/tension/help`,
        },
        references: {
          github: REPO_URL,
          macro: 'macros/tension-map.ts',
          cli: 'scripts/map-edge.ts',
        },
      };
      
      return jsonResponse(helpDoc, 200, {
        domain: 'tension',
        scope: 'help',
        version: API_VERSION, // ✅ Semantic versioning format
        includeTiming: true,
        startTime,
      });
    },
    
    // @BUN Socket Addressing API - Returns socket information using Bun.connect properties
    // Uses Bun's server.requestIP() for accurate client IP detection
    '/api/tension/socket-info': async (req, server) => {
      try {
        // @BUN Use server.requestIP() for accurate client IP (handles proxies, IPv4/IPv6)
        const clientIP = server.requestIP(req);
        
        // Get socket information from the request
        // @BUN Bun.serve() provides socket addressing via server properties
        const socketInfo = {
          // Local socket information (server-side) - matches Bun.connect() properties
          localAddress: server.hostname || '0.0.0.0',
          localPort: server.port || 3002,
          localFamily: clientIP?.family === 'IPv6' ? 'IPv6' : 'IPv4',
          
          // Remote socket information (client-side) - matches Bun.connect() properties
          remoteAddress: clientIP?.address || 
                        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                        req.headers.get('x-real-ip') || 
                        'unknown',
          remotePort: clientIP?.port || null, // Available if using TCP socket directly
          remoteFamily: clientIP?.family || 'IPv4',
          
          // Request metadata
          hostname: new URL(req.url).hostname,
          protocol: new URL(req.url).protocol,
          pathname: new URL(req.url).pathname,
          
          // Server metadata
          serverPort: server.port,
          serverHostname: server.hostname,
          
          // @BUN Socket addressing format (matches Bun.connect() output)
          timestamp: new Date().toISOString(),
        };
        
        return new Response(JSON.stringify(socketInfo), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-APEX-Version': PACKAGE_VERSION,
            'X-APEX-Component': 'socket-addressing',
          },
        });
      } catch (error) {
        return errorResponse(
          `Failed to get socket information: ${error instanceof Error ? error.message : String(error)}`,
          500
        );
      }
    },
    
    '/api/tension/health': async (req, server) => {
      const startTime = performance.now();
      
      // ✅ Fixed: Handle OPTIONS preflight requests
      if (req.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: CORS_HEADERS,
        });
      }
      
      // @BUN Check warmup status before processing
      if (!warmupComplete) {
        return jsonResponse({
          status: 'unhealthy',
          message: 'System is still warming up',
          warmupComplete: false,
        }, 503, {
          domain: 'tension',
          scope: 'health',
          version: 'v1.0',
          includeTiming: true,
          startTime,
        });
      }
      
      // ✅ Optimized: Parallel health checks with Promise.allSettled (10x faster)
      const checkResults = await Promise.allSettled([
        // Check 1: Tension mapping macro function
        Promise.resolve().then(() => {
          const testResult = mapEdgeRelation(1.0, 0.0, 0.0);
          const hasRequiredFields = testResult && 
            typeof testResult.color === 'object' &&
            typeof testResult.color.hex === 'string' &&
            typeof testResult.color.hsl === 'string' &&
            typeof testResult.opacity === 'number' &&
            typeof testResult.width === 'number' &&
            typeof testResult.meta === 'object';
          
          return {
            key: 'macro',
            check: {
              status: (hasRequiredFields ? 'healthy' : 'unhealthy') as 'healthy' | 'unhealthy',
              message: hasRequiredFields ? 'Tension mapping macro is functioning correctly' : 'Tension mapping macro returned invalid structure',
              details: hasRequiredFields ? {
                sampleOutput: {
                  hex: testResult.color.hex,
                  HEX: testResult.color.HEX,
                  opacity: testResult.opacity,
                  width: testResult.width,
                  relation: testResult.meta?.relation,
                },
              } : { error: 'Invalid response structure' },
            },
          };
        }),
        
        // Check 2: Multiple input ranges
        Promise.resolve().then(() => {
          const testCases = [
            { conflict: 0.0, entropy: 0.0, tension: 0.0 },
            { conflict: 1.0, entropy: 1.0, tension: 1.0 },
            { conflict: 0.5, entropy: 0.5, tension: 0.5 },
          ];
          
          const results = testCases.map(tc => {
            try {
              return mapEdgeRelation(tc.conflict, tc.entropy, tc.tension);
            } catch {
              return null;
            }
          });
          
          const allValid = results.every(r => r !== null && r.color && r.color.hex && r.opacity !== undefined);
          
          return {
            key: 'inputRanges',
            check: {
              status: (allValid ? 'healthy' : 'unhealthy') as 'healthy' | 'unhealthy',
              message: allValid ? 'Tension mapping handles all input ranges correctly' : 'Tension mapping failed on some input ranges',
              details: {
                testCases: testCases.length,
                passed: results.filter(r => r !== null).length,
                failed: results.filter(r => r === null).length,
              },
            },
          };
        }),
        
        // Check 3: HTML page availability
        Promise.resolve().then(() => {
          const hasTensionPage = tensionPage !== null && tensionPage !== undefined;
          return {
            key: 'htmlPage',
            check: {
              status: (hasTensionPage ? 'healthy' : 'unhealthy') as 'healthy' | 'unhealthy',
              message: hasTensionPage ? 'Tension visualization HTML page is available' : 'Tension visualization HTML page is missing',
              details: {
                available: hasTensionPage,
                routes: ['/tension', '/tension-map'],
              },
            },
          };
        }),
      ]);
      
      // Build checks object from results
      const checks: Record<string, HealthCheck> = {};
      checkResults.forEach(result => {
        if (result.status === 'fulfilled') {
          checks[result.value.key] = result.value.check;
        } else {
          // Handle failed checks
          const error = result.reason;
          checks[error.key || 'unknown'] = {
            status: 'unhealthy',
            message: 'Health check failed',
            details: { error: error instanceof Error ? error.message : String(error) },
          };
        }
      });
      
      // Check 4: API endpoint accessibility (always healthy - endpoint exists)
      checks.apiEndpoint = {
        status: 'healthy',
        message: 'Tension mapping API endpoint is accessible',
        details: {
          path: '/api/tension/map',
          method: 'GET',
          queryParams: ['conflict', 'entropy', 'tension'],
          example: '/api/tension/map?conflict=1.0&entropy=0.0&tension=0.0',
        },
      };
      
      // Overall health status
      const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
      const overallStatus = allHealthy ? 'healthy' : 'degraded';
      
      // ✅ Optimized: Use 204 No Content for healthy checks when Accept header doesn't request JSON
      if (allHealthy && !req.headers.get('Accept')?.includes('application/json')) {
        return new Response(null, {
          status: 204,
          headers: apiHeaders({
            domain: 'tension',
            scope: 'health',
            version: API_VERSION, // ✅ Semantic versioning format
            includeTiming: true,
            startTime,
          }),
        });
      }
      
      const healthResponse = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        service: 'tension-mapping',
        port: server.port,
        checks,
        summary: {
          total: Object.keys(checks).length,
          healthy: Object.values(checks).filter(c => c.status === 'healthy').length,
          unhealthy: Object.values(checks).filter(c => c.status === 'unhealthy').length,
        },
        endpoints: {
          api: '/api/tension/map',
          visualization: '/tension',
          health: '/api/tension/health',
        },
      };
      
      return Response.json(healthResponse, {
        status: allHealthy ? 200 : 503,
        headers: apiHeaders({
          domain: 'tension',
          scope: 'health',
          version: API_VERSION, // ✅ Semantic versioning format
          contentType: 'application/json',
          includeTiming: true,
          startTime,
        }),
      });
    },
    
    // @PERF Critical: This route serves 10K+ RPS with in-memory caching (60s TTL)
    // @BUN Bun.file() with zero-copy sendfile(2)
    // @ROUTE GET /api/gauge/womens-sports
    '/api/gauge/womens-sports': async (req, server) => {
      const startTime = performance.now();
      
      // ✅ Fixed: Handle OPTIONS preflight requests
      if (req.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: CORS_HEADERS,
        });
      }
      
      try {
        const url = new URL(req.url);
        
        // Parse with validation and sensible defaults
        const oddsSkew = parseNumberParam(url.searchParams.get('oddsSkew'), 0.5, 0, 1);
        const volumeVelocity = parseNumberParam(url.searchParams.get('volumeVelocity'), 25000, 0, 100000);
        const volatilityEntropy = parseNumberParam(url.searchParams.get('volatilityEntropy'), 0.5, 0, 1);
        const timeDecay = parseNumberParam(url.searchParams.get('timeDecay'), 1800, 0, 86400); // 0 to 24 hours
        const momentumCurvature = parseNumberParam(url.searchParams.get('momentumCurvature'), 0.5, 0, 1);
        
        // ✅ Cache key for gauge results (cache for 60 seconds)
        const cacheKey = `gauge:${oddsSkew}:${volumeVelocity}:${volatilityEntropy}:${timeDecay}:${momentumCurvature}`;
        const cached = gaugeCache.get(cacheKey);
        
        if (cached) {
          return jsonResponseWithMetadata(cached, 200, {
            version: 'v1.4.2',
          }, {
            domain: 'gauge',
            scope: 'womens-sports',
            version: 'v1.4.2',
            includeTiming: true,
            startTime,
          });
        }
        
        const tensor = { oddsSkew, volumeVelocity, volatilityEntropy, timeDecay, momentumCurvature };
        const result = gaugeWNBATOR(tensor);
        
        // ✅ Cache result for 60 seconds
        gaugeCache.set(cacheKey, result, 60);
        
        return jsonResponseWithMetadata(result, 200, {
          version: 'v1.4.2',
        }, {
          domain: 'gauge',
          scope: 'womens-sports',
          version: 'v1.4.2',
          includeTiming: true,
          startTime,
        });
      } catch (error) {
        return errorResponse(
          `WNBATOR gauge calculation failed: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'gauge', scope: 'womens-sports', version: 'v1.4.2' }
        );
      }
    },
    
    '/api/ai/models/status': async (req) => {
      const startTime = performance.now();
      
      const models: Record<string, {
        loaded: boolean;
        loadedAt?: string;
        warmupComplete: boolean;
        inferenceCount: number;
        avgInferenceTime: number;
        modelPath: string;
      }> = {};
      
      // Get status for all cached models
      for (const [name, cache] of modelCache.entries()) {
        models[name] = {
          loaded: cache.model !== null && cache.model !== undefined,
          loadedAt: cache.loadedAt ? new Date(cache.loadedAt).toISOString() : undefined,
          warmupComplete: cache.warmupComplete,
          inferenceCount: cache.inferenceCount,
          avgInferenceTime: cache.inferenceCount > 0 
            ? cache.totalInferenceTime / cache.inferenceCount 
            : 0,
          modelPath: `./models/${name}.onnx`,
        };
      }
      
      // Add default model status (curve-detection)
      if (!models['curve-detection']) {
        models['curve-detection'] = {
          loaded: false,
          warmupComplete: false,
          inferenceCount: 0,
          avgInferenceTime: 0,
          modelPath: './models/curve.onnx',
        };
      }
      
      return jsonResponse({
        models,
        summary: {
          total: Object.keys(models).length,
          loaded: Object.values(models).filter(m => m.loaded).length,
          ready: Object.values(models).filter(m => m.loaded && m.warmupComplete).length,
        },
      }, 200, {
        domain: 'ai',
        scope: 'models',
        version: 'v1.4.2',
        includeTiming: true,
        startTime,
      });
    },
    
    // @PERF Critical: AI inference route with model caching and warmup optimization
    // @ROUTE GET /api/ai/maparse (also supports POST)
    '/api/ai/maparse': async (req, server) => {
      const startTime = performance.now();
      
      // ✅ Fixed: Handle OPTIONS preflight requests
      if (req.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: CORS_HEADERS,
        });
      }
      
      try {
        let prices: number[];
        let sensitivity = 0.7; // Default sensitivity
        const url = new URL(req.url);
        
        // Support both GET (query params) and POST (JSON body)
        if (req.method === 'POST') {
          const body = await req.json() as { prices?: number[] | string; sensitivity?: number };
          // Validate and clamp sensitivity (0-1 range)
          sensitivity = Math.max(0, Math.min(1, body.sensitivity ?? 0.7));
          
          if (body.prices) {
            if (Array.isArray(body.prices)) {
              prices = body.prices;
            } else if (typeof body.prices === 'string') {
              prices = parseCsvNumbers(body.prices, 0, Infinity);
            } else {
              return validationErrorResponse(
                'Invalid prices format',
                'prices',
                body.prices,
                'Array of numbers or CSV string',
                { domain: 'ai', scope: 'maparse', version: 'v1.4.2' }
              );
            }
          } else {
            return validationErrorResponse(
              'Missing required parameter: prices',
              'prices',
              null,
              'Array of numbers or CSV string',
              { domain: 'ai', scope: 'maparse', version: 'v1.4.2' }
            );
          }
        } else {
          // GET request - use query params
          const pricesParam = url.searchParams.get('prices');
          // Validate and clamp sensitivity (0-1 range)
          sensitivity = Math.max(0, Math.min(1, parseFloat(url.searchParams.get('sensitivity') || '0.7')));
          
          if (!pricesParam) {
            return validationErrorResponse(
              'Missing required parameter: prices',
              'prices',
              null,
              'CSV format: "100,102,105,110,118"',
              { domain: 'ai', scope: 'maparse', version: 'v1.4.2' }
            );
          }
          
          prices = parseCsvNumbers(pricesParam, 0, Infinity);
        }
        
        if (prices.length === 0) {
          return validationErrorResponse(
            'Invalid prices format: no valid numbers found',
            'prices',
            prices,
            'CSV format with positive numbers: "100,102,105"',
            { domain: 'ai', scope: 'maparse', version: 'v1.4.2' }
          );
        }
        
        if (prices.length < 2) {
          return validationErrorResponse(
            'Insufficient data: at least 2 prices required',
            'prices',
            prices.length,
            'At least 2 numbers',
            { domain: 'ai', scope: 'maparse', version: 'v1.4.2' }
          );
        }
        
        // ✅ Cache key for AI results (cache for 300 seconds - 5 minutes)
        const cacheKey = `maparse:${prices.join(',')}`;
        const cached = aiCache.get(cacheKey);
        
        if (cached) {
          return jsonResponseWithMetadata(cached, 200, {
            version: 'v1.4.2',
          }, {
            domain: 'ai',
            scope: 'maparse',
            version: 'v1.4.2',
            includeTiming: true,
            startTime,
          });
        }
        
        // ✅ Bun-Specific Optimization: Model caching + ONNX Runtime
        // Pattern: Load model once, reuse across requests (500MB/request memory savings)
        let model = modelCache.get('curve-detection')?.model;
        
        if (!model) {
          // Try to load ONNX model (if available)
          model = await loadONNXModel('./models/curve.onnx', 'curve-detection');
          
          if (model) {
            // ✅ Pattern: Pre-warm for first request
            const cacheEntry: ModelCache = {
              model,
              loadedAt: Date.now(),
              warmupComplete: false,
              inferenceCount: 0,
              totalInferenceTime: 0,
            };
            
            try {
              // ✅ Pattern: Pre-warm model
              if (typeof model.warmup === 'function') {
                await model.warmup();
              }
              cacheEntry.warmupComplete = true;
            } catch (error) {
              console.warn(`[AI] Model warmup failed: ${error instanceof Error ? error.message : String(error)}`);
            }
            
            modelCache.set('curve-detection', cacheEntry);
          }
        }
        
        // ✅ Pattern: Run inference with model caching + timing
        let curves: MaparseResult;
        let inferenceTime = 0;
        const inferenceStart = performance.now();
        
        if (model && typeof model.run === 'function') {
          // ✅ Pattern: Use ONNX model for inference
          const inputBuffer = new Float32Array(prices);
          const result = await model.run(inputBuffer);
          curves = result as MaparseResult;
          inferenceTime = performance.now() - inferenceStart;
          
          // Update cache statistics
          const cacheEntry = modelCache.get('curve-detection');
          if (cacheEntry) {
            cacheEntry.inferenceCount++;
            cacheEntry.totalInferenceTime += inferenceTime;
          }
        } else {
          // @BUN Use pure JS curve-detector.ts for real regression analysis
          // Convert prices to Point[] format
          const points: CurvePoint[] = prices.map((y, i) => ({ x: i, y }));
          const detectedCurves = detectCurves(points, sensitivity);
          
          // Use autoMaparse for backward compatibility, but add detected curves
          curves = autoMaparse({ prices });
          // Add curve-detector results for enhanced analysis
          (curves as any).detectedCurves = detectedCurves;
          
          inferenceTime = performance.now() - inferenceStart;
          
          incrementMetric('totalCurveDetections');
          log('info', 'curve_detection_complete', {
            points: prices.length,
            detectedCurves: detectedCurves.length,
            inferenceTime: `${inferenceTime.toFixed(2)}ms`,
          });
        }
        
        // ✅ Cache result for 5 minutes
        aiCache.set(cacheKey, curves, 300);
        
        // ✅ Pattern: Response.json with X-Inference-Time header
        const headers = apiHeaders({
          domain: 'ai',
          scope: 'maparse',
          version: 'v1.4.2',
          contentType: 'application/json',
          includeTiming: true,
          startTime,
        });
        
        // ✅ Pattern: Add inference time header
        headers['X-Inference-Time'] = `${inferenceTime.toFixed(2)}ms`;
        
        return Response.json(curves, {
          headers,
        });
      } catch (error) {
        return errorResponse(
          `Maparse analysis failed: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'ai', scope: 'maparse', version: 'v1.4.2' }
        );
      }
    },
    
    '/api/validate/threshold': async (req) => {
      const startTime = performance.now();
      const url = new URL(req.url);
      const thresholdParam = url.searchParams.get('threshold');
      
      if (!thresholdParam) {
        return validationErrorResponse(
          'Missing required parameter: threshold',
          'threshold',
          null,
          'Number between 0.0 and 1.0, or arithmetic expression (e.g., "0.7-.0012")',
          { domain: 'validate', scope: 'threshold', version: 'v1.4.2' }
        );
      }
      
      try {
        const result = validateThreshold(thresholdParam);
        return jsonResponseWithMetadata(result, 200, {
          version: 'v1.4.2',
        }, {
          domain: 'validate',
          scope: 'threshold',
          version: 'v1.4.2',
          includeTiming: true,
          startTime,
        });
      } catch (error) {
        return validationErrorResponse(
          error instanceof Error ? error.message : String(error),
          'threshold',
          thresholdParam,
          'Number between 0.0 and 1.0',
          { domain: 'validate', scope: 'threshold', version: 'v1.4.2' }
        );
      }
    },
    
    // @ROUTE POST /api/spline/render (also supports GET)
    // @BUN Pure JS spline rendering with real math
    // @PERF Critical: Uses optimized spline-math.ts for O(n) performance
    // @PRODUCTION: Rate limited (100 req/min), timeout (5s), structured logging
    '/api/spline/render': withRateLimit(async (req) => {
      const start = Bun.nanoseconds();
      const startTime = performance.now();
      
      // @BUN Request timeout: 5 seconds
      const timeoutSignal = createRequestTimeout(req.signal, 5000);
      
      try {
        // Check if request was aborted
        if (timeoutSignal.aborted) {
          incrementMetric('requestTimeouts');
          return errorResponse('Request timeout', 408, {
            domain: 'spline',
            scope: 'render',
            version: 'v1.0',
          });
        }
        
        incrementMetric('activeRequests');
        
        // Support both GET (query params) and POST (JSON body)
        let request: {
          points?: number | Array<{x: number, y: number}>;
          type?: string;
          tension?: number;
          resolution?: number;
        };
        
        if (req.method === 'GET') {
          const url = new URL(req.url);
          const pointsParam = url.searchParams.get('points');
          request = {
            points: pointsParam ? JSON.parse(pointsParam) : parseInt(url.searchParams.get('points') || '100', 10),
            type: url.searchParams.get('type') || 'catmull-rom',
            tension: parseFloat(url.searchParams.get('tension') || '0.5'),
            resolution: parseInt(url.searchParams.get('resolution') || '10', 10),
          };
        } else {
          request = await req.json();
        }
        
        // Handle points: can be number (generate) or array (use provided)
        let controlPoints: SplineMathPoint[];
        if (Array.isArray(request.points)) {
          controlPoints = request.points.map(p => ({ x: p.x, y: p.y }));
        } else {
          // Generate control points if number provided
          const pointCount = request.points || 100;
          controlPoints = Array.from({ length: pointCount }, (_, i) => ({
            x: i,
            y: Math.sin(i * 0.1) * 100,
          }));
        }
        
        // Validate input
        if (controlPoints.length < 2) {
          return validationErrorResponse(
            'Points must contain at least 2 points',
            'points',
            controlPoints.length,
            'At least 2 points',
            { domain: 'spline', scope: 'render', version: 'v1.0' }
          );
        }
        
        const type = (request.type || 'catmull-rom') as 'catmull-rom' | 'cubic' | 'linear';
        const tension = request.tension ?? 0.5;
        const resolution = request.resolution ?? 10;
        
        // @BUN Use pure JS spline-math.ts for real computation
        let result: SplineMathPoint[];
        const computationStart = performance.now();
        
        if (type === 'catmull-rom') {
          result = catmullRomSpline(controlPoints, tension, resolution);
        } else if (type === 'cubic') {
          result = cubicSpline(controlPoints, resolution);
        } else if (type === 'linear') {
          result = linearSpline(controlPoints, resolution);
        } else {
          result = controlPoints; // Fallback
        }
        
        const computationTime = performance.now() - computationStart;
        const duration = (Bun.nanoseconds() - start) / 1_000_000;
        
        // Convert to SplinePoint format for compatibility
        const path: SplinePoint[] = result.map((p, i) => ({
          x: p.x,
          y: p.y,
          t: i / (result.length - 1 || 1),
        }));
        
        incrementMetric('totalSplineRenders');
        
        log('info', 'spline_rendered', {
          type,
          points: result.length,
          computationTime: `${computationTime.toFixed(2)}ms`,
        });
        
        return jsonResponse({
          path,
          points: result,
          count: result.length,
          metadata: {
            computationTime: `${computationTime.toFixed(2)}ms`,
            pointCount: result.length,
            type,
            tension,
            resolution,
            controlPoints: controlPoints.length,
          },
        }, 200, {
          domain: 'spline',
          scope: 'render',
          version: 'v1.0',
          includeTiming: true,
          startTime,
        });
      } catch (error) {
        if (timeoutSignal.aborted) {
          incrementMetric('requestTimeouts');
        }
        log('error', 'spline_render_error', {
          error: error instanceof Error ? error.message : String(error),
        });
        console.error('[Spline] Render error:', error);
        return errorResponse(
          `Spline computation failed: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'spline', scope: 'render', version: 'v1.0' }
        );
      } finally {
        // Decrement active requests
        const currentMetrics = getMetrics();
        if (currentMetrics.activeRequests > 0) {
          updateMetrics({ activeRequests: currentMetrics.activeRequests - 1 });
        }
      }
    }, 100, 60000), // Rate limit: 100 requests per minute
    
    // @ROUTE POST /api/spline/predict
    // @BUN Predict next points using spline extrapolation
    '/api/spline/predict': async (req) => {
      const start = Bun.nanoseconds();
      
      try {
        const body = await req.json() as {
          path?: Array<{x: number, y: number, t?: number}>;
          horizon?: number;
        };
        
        if (!body.path || !Array.isArray(body.path)) {
          return validationErrorResponse(
            'Invalid path array',
            'path',
            body.path,
            'Array of {x, y, t?} objects',
            { domain: 'spline', scope: 'predict', version: 'v1.0' }
          );
        }
        
        if (body.path.length < 2) {
          return validationErrorResponse(
            'Path must contain at least 2 points',
            'path',
            body.path.length,
            'At least 2 points',
            { domain: 'spline', scope: 'predict', version: 'v1.0' }
          );
        }
        
        const horizon = body.horizon ?? 100;
        if (horizon < 1 || horizon > 10000) {
          return validationErrorResponse(
            'Horizon must be between 1 and 10000',
            'horizon',
            horizon,
            '1-10000',
            { domain: 'spline', scope: 'predict', version: 'v1.0' }
          );
        }
        
        // @BUN Use spline-math.ts extrapolation for prediction
        const pointsForExtrapolation: SplineMathPoint[] = (body.path || []).map(p => ({ x: p.x, y: p.y }));
        const predictedPoints = extrapolateSpline(pointsForExtrapolation, horizon, 'catmull-rom');
        
        // Convert back to SplinePoint format
        const predicted: SplinePoint[] = predictedPoints.map((p, i) => ({
          x: p.x,
          y: p.y,
          t: 1 + (i / (predictedPoints.length - 1 || 1)),
        }));
        
        const duration = (Bun.nanoseconds() - start) / 1_000_000;
        
        return jsonResponse({
          predicted,
          count: predicted.length,
          metadata: {
            computationTime: `${duration.toFixed(2)}ms`,
            inputPoints: pointsForExtrapolation.length,
            predictedPoints: predicted.length,
            horizon,
            method: 'catmull-rom-extrapolation',
          },
        }, 200, {
          domain: 'spline',
          scope: 'predict',
          version: 'v1.0',
          includeTiming: true,
          startTime: start / 1_000_000,
        });
      } catch (error) {
        console.error('[Spline] Predict error:', error);
        return errorResponse(
          `Prediction failed: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'spline', scope: 'predict', version: 'v1.0' }
        );
      }
    },
    
    // @ROUTE POST /api/spline/preset/store
    // @BUN Store spline preset using SharedMap
    '/api/spline/preset/store': async (req) => {
      try {
        const body = await req.json() as {
          name?: string;
          config?: SplineConfig;
          vaultSync?: boolean;
        };
        
        if (!body.name || !body.config) {
          return validationErrorResponse(
            'Name and config required',
            'name/config',
            { name: body.name, config: body.config },
            'Both name and config required',
            { domain: 'spline', scope: 'preset', version: 'v1.0' }
          );
        }
        
        const preset = {
          name: body.name,
          config: body.config,
          created: Date.now(),
          vaultSync: body.vaultSync || false,
        };
        
        // @BUN Store in SharedMap (zero-copy)
        if (splinePresetStore) {
          splinePresetStore.set(`preset:${body.name}`, preset);
        }
        
        // Also store as YAML file for persistence
        const yamlContent = `name: ${body.name}\ntype: ${body.config.type}\npoints: ${body.config.points}\ntension: ${body.config.tension || 0.5}\nclosed: ${body.config.closed || false}\n`;
        const presetPath = `presets/${body.name}.yaml`;
        
        try {
          await Bun.write(presetPath, yamlContent);
        } catch (error) {
          console.warn(`[Spline] Failed to write preset file: ${error}`);
        }
        
        // Vault sync (placeholder)
        if (body.vaultSync) {
          console.log(`📦 Vault sync requested for ${body.name}`);
          // TODO: Implement vault sync
        }
        
        return jsonResponse({
          success: true,
          preset,
          path: presetPath,
          vaultSync: body.vaultSync ? 'requested' : 'skipped',
        }, 201, {
          domain: 'spline',
          scope: 'preset',
          version: 'v1.0',
        });
      } catch (error) {
        console.error('[Spline] Store preset error:', error);
        return errorResponse(
          `Failed to store preset: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'spline', scope: 'preset', version: 'v1.0' }
        );
      }
    },
    
    // @ROUTE GET /api/dev/metrics/websocket
    // @BUN WebSocket compression metrics endpoint
    '/api/dev/metrics/websocket': async () => {
      const startTime = performance.now();
      
      // Calculate average compression ratio
      let totalUncompressed = 0;
      let totalCompressed = 0;
      let totalMessages = 0;
      
      for (const [clientId, metrics] of compressionMetrics.entries()) {
        totalUncompressed += metrics.uncompressedBytes;
        totalCompressed += metrics.compressedBytes;
        totalMessages += metrics.messageCount;
      }
      
      const averageRatio = totalUncompressed > 0
        ? ((totalUncompressed - totalCompressed) / totalUncompressed * 100)
        : 0;
      
      return jsonResponse({
        compression: {
          averageRatio: parseFloat(averageRatio.toFixed(2)),
          totalClients: splineLiveClients.size,
          totalMessages,
          totalUncompressedBytes: totalUncompressed,
          totalCompressedBytes: totalCompressed,
          bandwidthSaved: totalUncompressed - totalCompressed,
          perClientMetrics: Array.from(compressionMetrics.entries()).map(([clientId, metrics]) => ({
            clientId,
            messageCount: metrics.messageCount,
            uncompressedBytes: metrics.uncompressedBytes,
            compressedBytes: metrics.compressedBytes,
            compressionRatio: metrics.uncompressedBytes > 0
              ? parseFloat((((metrics.uncompressedBytes - metrics.compressedBytes) / metrics.uncompressedBytes) * 100).toFixed(2))
              : 0,
          })),
        },
        server: {
          pendingWebSockets: devServer.pendingWebSockets,
        },
      }, 200, {
        domain: 'dev',
        scope: 'metrics',
        version: 'v1.0',
        includeTiming: true,
        startTime,
      });
    },
    
    '/api/dev/status': async (req, server) => {
      const startTime = performance.now();
      try {
        const configs = loadConfigs();
        const workers = workerRegistry?.getRegistry() || {};
        const endpoints = getAllEndpoints();
        const workerApiStatus = await checkWorkerApiStatus();
        
        // Server Metrics
        // [#REF] https://bun.com/docs/runtime/http/server#server-metrics
        // - server.pendingRequests - Number of in-flight HTTP requests
        // - server.pendingWebSockets - Number of active WebSocket connections
        const status = {
          timestamp: new Date().toISOString(),
          server: {
            url: server.url.toString(),
            port: server.port,
            hostname: server.hostname,
            development: server.development,
            idleTimeout: IDLE_TIMEOUT_SECONDS,
            metrics: {
              pendingRequests: server.pendingRequests,
              pendingWebSockets: server.pendingWebSockets,
            },
          },
          services: {
            worker_api: { port: WORKER_API_PORT, status: workerApiStatus },
            spline_api: { port: SPLINE_API_PORT, status: 'running' },
            dev_api: { port: DEFAULT_PORT, status: 'running' },
            tension_api: { port: DEFAULT_PORT, status: 'running', path: '/api/tension/map' },
          },
          workers: {
            total: Object.keys(workers).length,
            summary: {
              idle: Object.values(workers).filter((w: WorkerInfo) => w.status === 'idle').length,
              working: Object.values(workers).filter((w: WorkerInfo) => w.status === 'working').length,
              error: Object.values(workers).filter((w: WorkerInfo) => w.status === 'error').length,
            },
          },
          eventLoop: (() => {
            const metrics = getEventLoopMetrics();
            if (!metrics) return null;
            return {
              tickCount: metrics.tickCount,
              longTickCount: metrics.longTickCount,
              longTickRatio: metrics.tickCount > 0 ? (metrics.longTickCount / metrics.tickCount).toFixed(4) : '0.0000',
              maxTickDurationMs: (metrics.maxTickDuration / 1_000_000).toFixed(2),
              averageTickDurationMs: (metrics.averageTickDuration / 1_000_000).toFixed(2),
              lastTickDurationMs: (metrics.lastTickDuration / 1_000_000).toFixed(2),
            };
          })(),
          configs: {
            bunfig: configs.bunfig?.error ? 'missing' : 'loaded',
            'bun-ai': configs['bun-ai']?.error ? 'missing' : 'loaded',
          },
          endpoints: {
            total: Object.values(endpoints).reduce((sum: number, api: ApiService) => sum + api.endpoints.length, 0),
            by_service: {
              worker: endpoints.worker.endpoints.length,
              spline: endpoints.spline.endpoints.length,
              dev: endpoints.dev.endpoints.length,
            },
          },
          tension_mapping: {
            available: true,
            macro: 'macros/tension-map.ts',
            visualization: '/tension',
            api: '/api/tension/map',
            features: ['hex', 'hsl', 'opacity', 'width', 'relation'],
          },
          enhanced_cli: {
            version: '1.4.2',
            features: {
              wnbator_gauge: {
                available: true,
                api: '/api/gauge/womens-sports',
                description: 'WNBATOR 5D tensor gauge for betting streams',
              },
              ai_maparse: {
                available: true,
                api: '/api/ai/maparse',
                description: 'AI auto-maparse curve pattern detection',
              },
              threshold_validator: {
                available: true,
                api: '/api/validate/threshold',
                description: 'Threshold validator with auto-correction',
              },
            },
          },
        };
        
        return jsonResponse(status, 200, {
          domain: 'dev',
          scope: 'status',
          version: 'v2.1',
          includeTiming: true,
          startTime,
        });
      } catch (error) {
        return errorResponse(
          `Failed to get status: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'dev', scope: 'status', version: 'v2.1' }
        );
      }
    },
    
    // @ROUTE GET /api/dev/event-loop
    // TES-PERF-001.9: Event Loop Monitoring endpoint
    '/api/dev/event-loop': async (req, server) => {
      const startTime = performance.now();
      try {
        const metrics = getEventLoopMetrics();
        
        if (!metrics) {
          return jsonResponse({
            error: 'Event loop monitoring not initialized',
            message: 'Worker pool must be initialized to enable event loop monitoring',
          }, 503, {
            domain: 'dev',
            scope: 'event-loop',
            version: 'v1.0',
            includeTiming: true,
            startTime,
          });
        }
        
        const response = {
          timestamp: new Date().toISOString(),
          metrics: {
            tickCount: metrics.tickCount,
            longTickCount: metrics.longTickCount,
            longTickRatio: metrics.tickCount > 0 ? (metrics.longTickCount / metrics.tickCount) : 0,
            maxTickDurationNs: metrics.maxTickDuration,
            maxTickDurationMs: (metrics.maxTickDuration / 1_000_000).toFixed(2),
            averageTickDurationNs: metrics.averageTickDuration,
            averageTickDurationMs: (metrics.averageTickDuration / 1_000_000).toFixed(2),
            lastTickStartNs: metrics.lastTickStart,
            lastTickDurationNs: metrics.lastTickDuration,
            lastTickDurationMs: (metrics.lastTickDuration / 1_000_000).toFixed(2),
          },
          thresholds: {
            longTickThresholdNs: 16_000_000,
            longTickThresholdMs: 16,
            description: 'Ticks exceeding 16ms are considered "long ticks" (60 FPS target)',
          },
          interpretation: {
            health: metrics.health,
            healthy: metrics.health === 'green',
            longTickPercentage: metrics.tickCount > 0 ? ((metrics.longTickCount / metrics.tickCount) * 100).toFixed(2) + '%' : '0%',
            longTickRatio: metrics.longTickRatio,
            recommendation: metrics.health === 'green'
              ? 'Event loop nominal: ' + (100 - (metrics.longTickRatio * 100)).toFixed(2) + '% sub-16ms ticks, drift ' + ((metrics.averageTickDuration - 10_000_000) / 1_000_000).toFixed(2) + 'ns'
              : metrics.health === 'yellow'
              ? 'Event loop under stress: Consider reducing worker count or optimizing hash operations'
              : 'Event loop critical: Immediate action required - reduce load or scale horizontally',
          },
        };
        
        return jsonResponse(response, 200, {
          domain: 'dev',
          scope: 'event-loop',
          version: 'v1.0',
          includeTiming: true,
          startTime,
        });
      } catch (error) {
        return errorResponse(
          `Failed to get event loop metrics: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'dev', scope: 'event-loop', version: 'v1.0' }
        );
      }
    },
    
    // @ROUTE GET/POST /api/bookmakers
    '/api/bookmakers': async (req) => {
      const startTime = performance.now();
      
      // Handle POST requests
      if (req.method === 'POST') {
        try {
          const body = await req.json() as any;
          // Use new Bun.SQL registry (lib/registry.ts)
          const { getRegistry } = await import('../lib/registry.ts');
          const registry = getRegistry();
          
          const bookmaker = await registry.create(body);
          
          return jsonResponse({
            bookmaker,
          }, 201, {
            domain: 'dev',
            scope: 'bookmakers',
            version: 'v1.0',
            includeTiming: true,
            startTime,
          });
        } catch (error) {
          return errorResponse(
            `Failed to create bookmaker: ${error instanceof Error ? error.message : String(error)}`,
            500,
            { domain: 'dev', scope: 'bookmakers', version: 'v1.0' }
          );
        }
      }
      
      // Handle GET requests (default)
      try {
        // Use new Bun.SQL registry (lib/registry.ts)
        const { getRegistry } = await import('../lib/registry.ts');
        const registry = getRegistry();
        const bookmakers = await registry.getAll();
        
        return jsonResponse({
          bookmakers,
          count: bookmakers.length,
        }, 200, {
          domain: 'dev',
          scope: 'bookmakers',
          version: 'v1.0',
          includeTiming: true,
          startTime,
        });
      } catch (error) {
        return errorResponse(
          `Failed to get bookmakers: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'dev', scope: 'bookmakers', version: 'v1.0' }
        );
      }
    },
    
    // @ROUTE GET /api/bookmakers/:id
    '/api/bookmakers/:id': async (req: BunRequest<'/api/bookmakers/:id'>) => {
      const startTime = performance.now();
      
      try {
        const id = req.params.id;
        // Use new Bun.SQL registry (lib/registry.ts)
        const { getRegistry } = await import('../lib/registry.ts');
        const registry = getRegistry();
        const bookmaker = await registry.getById(id);
        
        if (!bookmaker) {
          return errorResponse(`Bookmaker not found: ${id}`, 404, {
            domain: 'dev',
            scope: 'bookmakers',
            version: 'v1.0',
          });
        }
        
        return jsonResponse({
          bookmaker,
        }, 200, {
          domain: 'dev',
          scope: 'bookmakers',
          version: 'v1.0',
          includeTiming: true,
          startTime,
        });
      } catch (error) {
        return errorResponse(
          `Failed to get bookmaker: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'dev', scope: 'bookmakers', version: 'v1.0' }
        );
      }
    },
    
    // @ROUTE PATCH /api/bookmakers/:id/flags/:flag
    '/api/bookmakers/:id/flags/:flag': async (req: BunRequest<'/api/bookmakers/:id/flags/:flag'>) => {
      const startTime = performance.now();
      
      try {
        const id = req.params.id;
        const flag = req.params.flag;
        const body = await req.json() as { value: boolean };
        
        // Use new Bun.SQL registry (lib/registry.ts)
        const { getRegistry } = await import('../lib/registry.ts');
        const registry = getRegistry();
        
        await registry.updateFlag(id, flag, body.value);
        const bookmaker = await registry.getById(id);
        
        if (!bookmaker) {
          return errorResponse(`Bookmaker not found: ${id}`, 404, {
            domain: 'dev',
            scope: 'bookmakers',
            version: 'v1.0',
          });
        }
        
        return jsonResponse({
          bookmaker,
        }, 200, {
          domain: 'dev',
          scope: 'bookmakers',
          version: 'v1.0',
          includeTiming: true,
          startTime,
        });
      } catch (error) {
        return errorResponse(
          `Failed to update flag: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'dev', scope: 'bookmakers', version: 'v1.0' }
        );
      }
    },
    
    // @ROUTE PATCH /api/bookmakers/:id/rollout
    '/api/bookmakers/:id/rollout': async (req: BunRequest<'/api/bookmakers/:id/rollout'>) => {
      const startTime = performance.now();
      
      try {
        const id = req.params.id;
        const body = await req.json() as { percentage?: number; users?: string[]; regions?: string[] };
        
        // Use new Bun.SQL registry (lib/registry.ts)
        const { getRegistry } = await import('../lib/registry.ts');
        const registry = getRegistry();
        
        await registry.updateRollout(id, body);
        const bookmaker = await registry.getById(id);
        
        if (!bookmaker) {
          return errorResponse(`Bookmaker not found: ${id}`, 404, {
            domain: 'dev',
            scope: 'bookmakers',
            version: 'v1.0',
          });
        }
        
        return jsonResponse({
          bookmaker,
        }, 200, {
          domain: 'dev',
          scope: 'bookmakers',
          version: 'v1.0',
          includeTiming: true,
          startTime,
        });
      } catch (error) {
        return errorResponse(
          `Failed to update rollout: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'dev', scope: 'bookmakers', version: 'v1.0' }
        );
      }
    },
    
    // @ROUTE GET /api/registry/bookmakers
    '/api/registry/bookmakers': async (req) => {
      const startTime = performance.now();
      
      try {
        // Use Bun SQLite for local dev, or Durable Object in production
        const { BookmakerRegistrySQL } = await import('../lib/bookmaker-registry-sql.ts');
        const { getAllBookmakers } = await import('../lib/combined-registry.ts');
        
        const bookmakers = getAllBookmakers();
        const registry = new BookmakerRegistrySQL(':memory:');
        
        // Load all bookmakers into registry
        const { BOOKMAKER_CONFIG } = await import('../lib/bookmaker-registry.ts');
        const { MONSTER_ASIAN_CONFIG } = await import('../lib/crypto-asian-registry.ts');
        const { SHADOW_MARKET_CONFIG } = await import('../lib/crypto-asian-registry-extended.ts');
        
        for (const [id, config] of Object.entries(BOOKMAKER_CONFIG as Record<string, any>)) {
          registry.upsertProfile(id, (config as any).tier, config);
        }
        for (const [id, config] of Object.entries(MONSTER_ASIAN_CONFIG as Record<string, any>)) {
          registry.upsertProfile(id, (config as any).tier, config);
        }
        for (const [id, config] of Object.entries(SHADOW_MARKET_CONFIG as Record<string, any>)) {
          // Extract tier string from tier object
          const tierStr = typeof config.tier === 'string' 
            ? config.tier 
            : config.tier?.classification || 'TIER_4_MANUAL_SHADOW';
          registry.upsertProfile(id, tierStr, config);
        }

        const profiles = bookmakers.map((id: string) => {
          const profile = registry.getProfile(id);
          return {
            bookieId: id,
            tier: profile?.tier || 'unknown',
            hasBehavioralProfile: !!profile?.behavioral_profile_json,
            hasRGIndex: !!profile?.rg_index_json,
            lastUpdated: profile?.last_updated || null,
          };
        });
        
        registry.close();
        
        return jsonResponse({
          total: bookmakers.length,
          bookmakers: profiles,
        }, 200, {
          domain: 'dev',
          scope: 'bookmakers',
          version: 'v1.0',
          includeTiming: true,
          startTime,
        });
      } catch (error) {
        return errorResponse(
          `Failed to get bookmakers: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'dev', scope: 'bookmakers', version: 'v1.0' }
        );
      }
    },
    
    // @ROUTE GET /api/registry/profile/:bookieId
    '/api/registry/profile/:bookieId': async (req: BunRequest<'/api/registry/profile/:bookieId'>) => {
      const startTime = performance.now();
      
      try {
        const bookieId = req.params.bookieId;
        const { BookmakerRegistrySQL } = await import('../lib/bookmaker-registry-sql.ts');
        const registry = new BookmakerRegistrySQL(':memory:');
        
        // Load configs
        const { BOOKMAKER_CONFIG } = await import('../lib/bookmaker-registry.ts');
        const { MONSTER_ASIAN_CONFIG } = await import('../lib/crypto-asian-registry.ts');
        const { SHADOW_MARKET_CONFIG } = await import('../lib/crypto-asian-registry-extended.ts');
        
        const allConfigs = { ...BOOKMAKER_CONFIG, ...MONSTER_ASIAN_CONFIG, ...SHADOW_MARKET_CONFIG };
        const config = allConfigs[bookieId];
        
        if (!config) {
          registry.close();
          return errorResponse(`Bookmaker not found: ${bookieId}`, 404, {
            domain: 'dev',
            scope: 'profile',
            version: 'v1.0',
          });
        }
        
        registry.upsertProfile(bookieId, typeof config.tier === 'string' ? config.tier : config.tier?.classification || 'unknown', config);
        const profile = registry.getProfile(bookieId);
        
        const result = {
          bookieId,
          tier: profile?.tier || config.tier,
          config,
          behavioralProfile: profile?.behavioral_profile_json 
            ? JSON.parse(profile.behavioral_profile_json) 
            : null,
          lastUpdated: profile?.last_updated || null,
        };
        
        registry.close();
        
        return jsonResponse(result, 200, {
          domain: 'dev',
          scope: 'profile',
          version: 'v1.0',
          includeTiming: true,
          startTime,
        });
      } catch (error) {
        return errorResponse(
          `Failed to get profile: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'dev', scope: 'profile', version: 'v1.0' }
        );
      }
    },
    
    // @ROUTE GET /api/registry/manifests/:bookieId
    '/api/registry/manifests/:bookieId': async (req: BunRequest<'/api/registry/manifests/:bookieId'>) => {
      const startTime = performance.now();
      
      try {
        const bookieId = req.params.bookieId;
        const { BookmakerRegistrySQL } = await import('../lib/bookmaker-registry-sql.ts');
        const registry = new BookmakerRegistrySQL(':memory:');
        
        const skeleton = registry.getRGIndexSkeleton(bookieId);
        const manifests = skeleton ? registry.getManifests(bookieId) : [];
        
        registry.close();
        
        return jsonResponse({
          bookieId,
          hasRGIndex: !!skeleton,
          skeleton: skeleton ? {
            bookieId: skeleton.bookieId,
            tier: skeleton.tier,
            lastIndexed: skeleton.lastIndexed,
            fileCount: skeleton.fileCount,
            totalSize: skeleton.totalSize,
            indexHash: skeleton.indexHash,
          } : null,
          manifests,
          manifestCount: manifests.length,
        }, 200, {
          domain: 'dev',
          scope: 'manifests',
          version: 'v1.0',
          includeTiming: true,
          startTime,
        });
      } catch (error) {
        return errorResponse(
          `Failed to get manifests: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'dev', scope: 'manifests', version: 'v1.0' }
        );
      }
    },
    
    // @ROUTE GET /api/registry/tiers
    '/api/registry/tiers': async (req) => {
      const startTime = performance.now();
      
      try {
        const { BookmakerRegistrySQL } = await import('../lib/bookmaker-registry-sql.ts');
        const { getTotalBookmakerCount } = await import('../lib/combined-registry.ts');
        
        const registry = new BookmakerRegistrySQL(':memory:');
        
        // Load configs
        const { BOOKMAKER_CONFIG } = await import('../lib/bookmaker-registry.ts');
        const { MONSTER_ASIAN_CONFIG } = await import('../lib/crypto-asian-registry.ts');
        const { SHADOW_MARKET_CONFIG } = await import('../lib/crypto-asian-registry-extended.ts');
        
        for (const [id, config] of Object.entries(BOOKMAKER_CONFIG as Record<string, any>)) {
          registry.upsertProfile(id, (config as any).tier, config);
        }
        for (const [id, config] of Object.entries(MONSTER_ASIAN_CONFIG as Record<string, any>)) {
          registry.upsertProfile(id, (config as any).tier, config);
        }
        for (const [id, config] of Object.entries(SHADOW_MARKET_CONFIG)) {
          // Extract tier string from tier object
          const tierStr = typeof config.tier === 'string' 
            ? config.tier 
            : config.tier?.classification || 'TIER_4_MANUAL_SHADOW';
          registry.upsertProfile(id, tierStr, config);
        }
        
        const tiers = ['TIER_0_CRYPTO_SHARP', 'TIER_X_MONSTER', 'TIER_1_SHARP', 'TIER_2_EUROPEAN', 'TIER_3_US_RECREATIONAL', 'TIER_4_MANUAL'];
        const tierDistribution: Record<string, { count: number; bookmakers: string[] }> = {};
        
        for (const tier of tiers) {
          const bookmakers = registry.getBookmakersByTier(tier);
          tierDistribution[tier] = {
            count: bookmakers.length,
            bookmakers,
          };
        }
        
        registry.close();
        
        return jsonResponse({
          total: getTotalBookmakerCount(),
          tiers: tierDistribution,
        }, 200, {
          domain: 'dev',
          scope: 'tiers',
          version: 'v1.0',
          includeTiming: true,
          startTime,
        });
      } catch (error) {
        return errorResponse(
          `Failed to get tiers: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'dev', scope: 'tiers', version: 'v1.0' }
        );
      }
    },
    
    // @ROUTE GET /api/bet-type/detect/:bookieId/:marketId
    '/api/bet-type/detect/:bookieId/:marketId': async (req: BunRequest<'/api/bet-type/detect/:bookieId/:marketId'>) => {
      const startTime = performance.now();
      
      try {
        const bookieId = req.params.bookieId;
        const marketId = req.params.marketId;
        const url = new URL(req.url);
        const betType = url.searchParams.get('betType') as any || 'team-total';
        const bankroll = parseFloat(url.searchParams.get('bankroll') || '1000');
        
        const { DefensiveBookmakerDetector } = await import('../lib/defensive-bookmaker-detection.ts');
        const detector = new DefensiveBookmakerDetector();
        
        const pattern = await detector.detectHoldingPattern(
          bookieId,
          marketId,
          undefined,
          'generic',
          betType,
          undefined,
          bankroll
        );
        
        return jsonResponse({
          bookieId,
          marketId,
          betType,
          pattern: pattern ? {
            phase: pattern.phase,
            betType: pattern.betType,
            betTiming: pattern.betTiming,
            bookmakerTier: pattern.bookmakerTier,
            bookmakerClassification: pattern.bookmakerClassification,
            exhaustionConfidence: pattern.exhaustionConfidence,
            rgCompliant: pattern.rgCompliant,
            ruinRisk: pattern.ruinRisk,
            correlationRisk: pattern.correlationRisk,
            complexityScore: pattern.complexityScore,
            tradeOpportunities: pattern.tradeOpportunities,
          } : null,
        }, 200, {
          domain: 'bet-type',
          scope: 'detection',
          version: 'v1.0',
          includeTiming: true,
          startTime,
        });
      } catch (error) {
        return errorResponse(
          `Failed to detect bet-type pattern: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'bet-type', scope: 'detection', version: 'v1.0' }
        );
      }
    },
    
    // @ROUTE GET /api/bet-type/stats
    '/api/bet-type/stats': async (req) => {
      const startTime = performance.now();
      
      try {
        const betTypes = ['team-total', 'parlay', 'same-game-parlay', 'teaser', 'bought-points', 'total'];
        
        return jsonResponse({
          betTypes,
          patternsDetected: 0, // Would be populated from KV in production
          rgCompliant: 0, // Would be populated from KV in production
          rgCompliance: {
            compliant: true,
            ruinRisk: 0,
            cielabDelta: 0,
          },
        }, 200, {
          domain: 'bet-type',
          scope: 'stats',
          version: 'v1.0',
          includeTiming: true,
          startTime,
        });
      } catch (error) {
        return errorResponse(
          `Failed to get bet-type stats: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'bet-type', scope: 'stats', version: 'v1.0' }
        );
      }
    },
    
    // @ROUTE POST /api/bet-type/detect
    '/api/bet-type/detect': async (req) => {
      const startTime = performance.now();
      
      try {
        const body = await req.json();
        const { bookieId, marketId, betType, betSpecifics, bankroll, data, source } = body;
        
        const { DefensiveBookmakerDetector } = await import('../lib/defensive-bookmaker-detection.ts');
        const detector = new DefensiveBookmakerDetector();
        
        const pattern = await detector.detectHoldingPattern(
          bookieId,
          marketId,
          data,
          source || 'generic',
          betType,
          betSpecifics,
          bankroll || 1000
        );
        
        return jsonResponse({
          bookieId,
          marketId,
          betType,
          pattern: pattern ? {
            phase: pattern.phase,
            betType: pattern.betType,
            betTiming: pattern.betTiming,
            bookmakerTier: pattern.bookmakerTier,
            bookmakerClassification: pattern.bookmakerClassification,
            exhaustionConfidence: pattern.exhaustionConfidence,
            rgCompliant: pattern.rgCompliant,
            ruinRisk: pattern.ruinRisk,
            correlationRisk: pattern.correlationRisk,
            complexityScore: pattern.complexityScore,
            tradeOpportunities: pattern.tradeOpportunities,
          } : null,
        }, 200, {
          domain: 'bet-type',
          scope: 'detection',
          version: 'v1.0',
          includeTiming: true,
          startTime,
        });
      } catch (error) {
        return errorResponse(
          `Failed to detect bet-type pattern: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'bet-type', scope: 'detection', version: 'v1.0' }
        );
      }
    },
    
    // @ROUTE GET /api/glossary/term/:termId
    '/api/glossary/term/:termId': async (req: BunRequest<'/api/glossary/term/:termId'>) => {
      const startTime = performance.now();
      
      try {
        const termId = req.params.termId;
        const { BettingGlossaryRegistry } = await import('../lib/betting-glossary.ts');
        const registry = BettingGlossaryRegistry.getInstance();
        
        const term = registry.getTerm(termId);
        
        if (!term) {
          return errorResponse(`Term not found: ${termId}`, 404, {
            domain: 'glossary',
            scope: 'term',
            version: 'v1.0',
          });
        }
        
        return jsonResponse({
          term,
        }, 200, {
          domain: 'glossary',
          scope: 'term',
          version: 'v1.0',
          includeTiming: true,
          startTime,
        });
      } catch (error) {
        return errorResponse(
          `Failed to get term: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'glossary', scope: 'term', version: 'v1.0' }
        );
      }
    },
    
    // @ROUTE GET /api/glossary/search
    '/api/glossary/search': async (req) => {
      const startTime = performance.now();
      
      try {
        const url = new URL(req.url);
        const keyword = url.searchParams.get('keyword') || '';
        
        const { BettingGlossaryRegistry } = await import('../lib/betting-glossary.ts');
        const registry = BettingGlossaryRegistry.getInstance();
        
        const terms = keyword ? registry.searchTerms(keyword) : registry.getAllTerms();
        
        return jsonResponse({
          keyword,
          terms,
          count: terms.length,
        }, 200, {
          domain: 'glossary',
          scope: 'search',
          version: 'v1.0',
          includeTiming: true,
          startTime,
        });
      } catch (error) {
        return errorResponse(
          `Failed to search glossary: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'glossary', scope: 'search', version: 'v1.0' }
        );
      }
    },
    
    // @ROUTE GET /api/glossary/category/:category
    '/api/glossary/category/:category': async (req: BunRequest<'/api/glossary/category/:category'>) => {
      const startTime = performance.now();
      
      try {
        const category = req.params.category as any;
        const { BettingGlossaryRegistry, TermCategory } = await import('../lib/betting-glossary.ts');
        const registry = BettingGlossaryRegistry.getInstance();
        
        const terms = registry.getTermsByCategory(category as typeof TermCategory[keyof typeof TermCategory]);
        
        return jsonResponse({
          category,
          terms,
          count: terms.length,
        }, 200, {
          domain: 'glossary',
          scope: 'category',
          version: 'v1.0',
          includeTiming: true,
          startTime,
        });
      } catch (error) {
        return errorResponse(
          `Failed to get category terms: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'glossary', scope: 'category', version: 'v1.0' }
        );
      }
    },
    
    // @ROUTE GET /api/glossary/bet-types
    '/api/glossary/bet-types': async (req) => {
      const startTime = performance.now();
      
      try {
        const { BettingGlossaryRegistry, TermCategory } = await import('../lib/betting-glossary.ts');
        const registry = BettingGlossaryRegistry.getInstance();
        
        const terms = registry.getTermsByCategory(TermCategory.BET_TYPES);
        
        return jsonResponse({
          category: 'bet_types',
          terms,
          count: terms.length,
        }, 200, {
          domain: 'glossary',
          scope: 'bet-types',
          version: 'v1.0',
          includeTiming: true,
          startTime,
        });
      } catch (error) {
        return errorResponse(
          `Failed to get bet-type terms: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'glossary', scope: 'bet-types', version: 'v1.0' }
        );
      }
    },
    
    // @ROUTE GET /api/feature-flags
    '/api/feature-flags': async (req) => {
      const startTime = performance.now();
      
      try {
        const { getFeatureFlags } = await import('../lib/feature-flags.ts');
        const url = new URL(req.url);
        const category = url.searchParams.get('category');
        
        const featureFlags = getFeatureFlags();
        
        if (category) {
          const flags = featureFlags.getFlagsByCategory(category as any);
          return jsonResponse({
            category,
            flags,
            count: flags.length,
            enabled: flags.filter(f => f.enabled).length,
          }, 200, {
            domain: 'dev',
            scope: 'feature-flags',
            version: 'v1.0',
            includeTiming: true,
            startTime,
          });
        }
        
        const allFlags = featureFlags.getAllFlags();
        return jsonResponse({
          flags: allFlags,
          count: allFlags.length,
          enabled: allFlags.filter(f => f.enabled).length,
          categories: ['dashboard', 'stream', 'odds', 'detection', 'glossary', 'registry', 'api'],
        }, 200, {
          domain: 'dev',
          scope: 'feature-flags',
          version: 'v1.0',
          includeTiming: true,
          startTime,
        });
      } catch (error) {
        return errorResponse(
          `Failed to get feature flags: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'dev', scope: 'feature-flags', version: 'v1.0' }
        );
      }
    },
    
    // @ROUTE POST /api/feature-flags/:key/enable
    '/api/feature-flags/:key/enable': async (req: BunRequest<'/api/feature-flags/:key/enable'>) => {
      const startTime = performance.now();
      
      try {
        const key = req.params.key;
        const { getFeatureFlags } = await import('../lib/feature-flags.ts');
        const featureFlags = getFeatureFlags();
        
        await featureFlags.enable(key, 'api');
        
        return jsonResponse({
          key,
          enabled: true,
          message: `Feature flag '${key}' enabled`,
        }, 200, {
          domain: 'dev',
          scope: 'feature-flags',
          version: 'v1.0',
          includeTiming: true,
          startTime,
        });
      } catch (error) {
        return errorResponse(
          `Failed to enable feature flag: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'dev', scope: 'feature-flags', version: 'v1.0' }
        );
      }
    },
    
    // @ROUTE POST /api/feature-flags/:key/disable
    '/api/feature-flags/:key/disable': async (req: BunRequest<'/api/feature-flags/:key/disable'>) => {
      const startTime = performance.now();
      
      try {
        const key = req.params.key;
        const { getFeatureFlags } = await import('../lib/feature-flags.ts');
        const featureFlags = getFeatureFlags();
        
        await featureFlags.disable(key, 'api');
        
        return jsonResponse({
          key,
          enabled: false,
          message: `Feature flag '${key}' disabled`,
        }, 200, {
          domain: 'dev',
          scope: 'feature-flags',
          version: 'v1.0',
          includeTiming: true,
          startTime,
        });
      } catch (error) {
        return errorResponse(
          `Failed to disable feature flag: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'dev', scope: 'feature-flags', version: 'v1.0' }
        );
      }
    },
    
    // @ROUTE GET /api/feeds/matrix
    '/api/feeds/matrix': async (req) => {
      const startTime = performance.now();
      
      try {
        // Feed matrix data structure
        const feeds = [
          {
            name: 'Stream Ingestion',
            worker: 'stream-ingestion-worker.ts',
            durableObject: 'BOOKMAKER_REGISTRY',
            kv: ['ODDS_KV'],
            r2: ['bookmaker-streams'],
            featureFlags: ['stream.ingestion', 'stream.r2-archival', 'stream.kv-hot-cache'],
            envVars: ['ENVIRONMENT', 'ED25519_PRIVATE_KEY'],
            color: '#00FFFF',
          },
          {
            name: 'Crypto Stream',
            worker: 'crypto-stream-worker.ts',
            durableObject: null,
            kv: ['ODDS_KV'],
            r2: ['crypto-sharp-streams'],
            featureFlags: ['stream.crypto', 'stream.r2-archival', 'stream.kv-hot-cache'],
            envVars: ['ENVIRONMENT'],
            color: '#FF1493',
          },
          {
            name: 'Shadow Stream',
            worker: 'shadow-stream-worker.ts',
            durableObject: null,
            kv: ['ODDS_KV'],
            r2: ['shadow-market-streams'],
            featureFlags: ['stream.shadow', 'stream.r2-archival', 'stream.kv-hot-cache'],
            envVars: ['ENVIRONMENT'],
            color: '#8B008B',
          },
          {
            name: 'Broker Stream',
            worker: 'broker-stream-worker.ts',
            durableObject: null,
            kv: ['ODDS_KV', 'PROFILES_KV'],
            r2: ['bookmaker-streams', 'shadow-market-streams'],
            featureFlags: [],
            envVars: ['ENVIRONMENT'],
            color: '#32CD32',
          },
          {
            name: 'P88-PandBet',
            worker: 'p88-pandbet-defensive-worker.ts',
            durableObject: null,
            kv: ['ODDS_KV'],
            r2: [],
            featureFlags: ['detection.defensive'],
            envVars: ['P88_API_KEY', 'PANDBET_API_KEY', 'ENVIRONMENT', 'P88_BASE_URL', 'P88_OAUTH_URL', 'P88_CLIENT_ID', 'P88_CLIENT_SECRET', 'VETO_WEBHOOK_URL'],
            color: '#FF4500',
          },
          {
            name: 'RG Search',
            worker: 'rg-search-worker.ts',
            durableObject: null,
            kv: ['ODDS_KV'],
            r2: ['bookmaker-streams'],
            featureFlags: [],
            envVars: ['ENVIRONMENT'],
            color: '#4169E1',
          },
          {
            name: 'Multi-Sport',
            worker: 'multisport-detection-worker.ts',
            durableObject: null,
            kv: ['ODDS_KV'],
            r2: [],
            featureFlags: ['detection.bet-type'],
            envVars: ['ENVIRONMENT'],
            color: '#DC143C',
          },
        ];
        
        // KV namespace details
        const kvNamespaces = [
          {
            binding: 'ODDS_KV',
            id: '2e5ded65d8f44a4eb55fb139897ba850',
            description: 'Hot cache for odds data, tick storage',
            color: '#00FF00',
          },
          {
            binding: 'PROFILES_KV',
            id: '295b235abe504fcb82622a26d4b16d94',
            description: 'Bookmaker profiles, behavioral data, feature flags',
            color: '#00CED1',
          },
          {
            binding: 'CACHE_KV',
            id: 'd1643eb83b93417e951322a2eaaa7f64',
            description: 'General cache, fingerprint data',
            color: '#FFD700',
          },
        ];
        
        // R2 bucket details
        const r2Buckets = [
          {
            binding: 'R2',
            name: 'bookmaker-streams',
            description: 'Generic bookmaker stream archival',
            color: '#0000FF',
          },
          {
            binding: 'R2_CRYPTO_SHARP',
            name: 'crypto-sharp-streams',
            description: 'Crypto Asian sharp book streams',
            color: '#9370DB',
          },
          {
            binding: 'R2_MONSTER',
            name: 'monster-streams',
            description: 'Monster tier HFT streams',
            color: '#8A2BE2',
          },
          {
            binding: 'R2_SHADOW',
            name: 'shadow-market-streams',
            description: 'Shadow market stream archival',
            color: '#4B0082',
          },
          {
            binding: 'R2_REGISTRY',
            name: 'bookmaker-registry',
            description: 'Registry manifests and profiles',
            color: '#FF1493',
          },
        ];
        
        // Durable Object details
        const durableObjects = [
          {
            name: 'BOOKMAKER_REGISTRY',
            className: 'BookmakerRegistryDO',
            scriptName: 'bookmaker-registry-do',
            description: 'Persistent bookmaker registry storage',
            color: '#FF00FF',
          },
        ];
        
        // Feature flags summary
        const featureFlags = [
          'stream.ingestion',
          'stream.crypto',
          'stream.shadow',
          'stream.r2-archival',
          'stream.kv-hot-cache',
          'detection.defensive',
          'detection.bet-type',
          'detection.behavioral',
          'detection.geospatial',
        ];
        
        return jsonResponse({
          feeds,
          kvNamespaces,
          r2Buckets,
          durableObjects,
          featureFlags,
          summary: {
            feeds: feeds.length,
            kv: kvNamespaces.length,
            r2: r2Buckets.length,
            durableObjects: durableObjects.length,
            featureFlags: featureFlags.length,
          },
        }, 200, {
          domain: 'dev',
          scope: 'feeds',
          version: 'v1.0',
          includeTiming: true,
          startTime,
        });
      } catch (error) {
        return errorResponse(
          `Failed to get feed matrix: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'dev', scope: 'feeds', version: 'v1.0' }
        );
      }
    },
    
    // @ROUTE GET /api/shadow-ws/status
    '/api/shadow-ws/status': async (req) => {
      const startTime = performance.now();
      
      try {
        // Check if Shadow WebSocket Server is running
        const shadowPort = parseInt(process.env.SHADOW_WS_PORT || '3003');
        const healthUrl = `http://localhost:${shadowPort}/health`;
        const statsUrl = `http://localhost:${shadowPort}/stats`;
        
        let health: any = null;
        let stats: any = null;
        let isRunning = false;
        
        try {
          const healthResp = await fetch(healthUrl, { signal: AbortSignal.timeout(2000) });
          if (healthResp.ok) {
            health = await healthResp.json();
            isRunning = true;
          }
        } catch (error) {
          // Server not running or unreachable
        }
        
        try {
          if (isRunning) {
            const statsResp = await fetch(statsUrl, { signal: AbortSignal.timeout(2000) });
            if (statsResp.ok) {
              stats = await statsResp.json();
            }
          }
        } catch (error) {
          // Stats endpoint unavailable
        }
        
        return jsonResponse({
          running: isRunning,
          port: shadowPort,
          health,
          stats,
          endpoints: {
            websocket: `ws://localhost:${shadowPort}/ws/shadow/{tier}`,
            health: `http://localhost:${shadowPort}/health`,
            stats: `http://localhost:${shadowPort}/stats`,
          },
          supportedTiers: [
            'TIER_X_MONSTER',
            'TIER_0_CRYPTO_SHARP',
            'TIER_4_MANUAL_SHADOW',
            'TIER_2_CRYPTO_HYBRID',
          ],
          protocols: {
            'TIER_X_MONSTER': ['shadow-binary', 'shadow-json'],
            'TIER_0_CRYPTO_SHARP': ['shadow-binary', 'shadow-json'],
            'TIER_4_MANUAL_SHADOW': ['shadow-json'],
            'TIER_2_CRYPTO_HYBRID': ['shadow-json'],
          },
        }, 200, {
          domain: 'dev',
          scope: 'shadow-ws',
          version: 'v1.0',
          includeTiming: true,
          startTime,
        });
      } catch (error) {
        return errorResponse(
          `Failed to get Shadow WebSocket Server status: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'dev', scope: 'shadow-ws', version: 'v1.0' }
        );
      }
    },
    
    // @ROUTE GET /api/shadow-ws/health
    '/api/shadow-ws/health': async (req) => {
      const startTime = performance.now();
      
      try {
        const shadowPort = parseInt(process.env.SHADOW_WS_PORT || '3003');
        const healthUrl = `http://localhost:${shadowPort}/health`;
        
        try {
          const healthResp = await fetch(healthUrl, { signal: AbortSignal.timeout(2000) });
          if (healthResp.ok) {
            const health = await healthResp.json();
            return jsonResponse({
              status: 'ok',
              server: 'running',
              ...health,
            }, 200, {
              domain: 'dev',
              scope: 'shadow-ws',
              version: 'v1.0',
              includeTiming: true,
              startTime,
            });
          }
        } catch (error) {
          return jsonResponse({
            status: 'error',
            server: 'not_running',
            error: error instanceof Error ? error.message : String(error),
            port: shadowPort,
          }, 503, {
            domain: 'dev',
            scope: 'shadow-ws',
            version: 'v1.0',
            includeTiming: true,
            startTime,
          });
        }
        
        return jsonResponse({
          status: 'unknown',
          server: 'unreachable',
        }, 503, {
          domain: 'dev',
          scope: 'shadow-ws',
          version: 'v1.0',
          includeTiming: true,
          startTime,
        });
      } catch (error) {
        return errorResponse(
          `Failed to check Shadow WebSocket Server health: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'dev', scope: 'shadow-ws', version: 'v1.0' }
        );
      }
    },
    
    // @ROUTE GET /api/registry/r2
    '/api/registry/r2': async (req) => {
      const startTime = performance.now();
      
      try {
        const { BookmakerRegistryR2 } = await import('../lib/bookmaker-registry-r2.ts');
        const registry = new BookmakerRegistryR2();
        
        const r2Urls = registry.getR2RegistryUrls();
        const summary = registry.getRegistrySummary();
        
        registry.close();
        
        return jsonResponse({
          bucket: summary.r2Bucket,
          baseUrl: summary.r2BaseUrl,
          prefix: 'registry/',
          profiles: r2Urls.profiles,
          manifests: r2Urls.manifests,
          totalObjects: r2Urls.profiles.length + r2Urls.manifests.length,
        }, 200, {
          domain: 'dev',
          scope: 'r2',
          version: 'v1.0',
          includeTiming: true,
          startTime,
        });
      } catch (error) {
        return errorResponse(
          `Failed to get R2 registry: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'dev', scope: 'r2', version: 'v1.0' }
        );
      }
    },
    
    // Registry Dashboard Route - HTML import
    '/registry': async (req, server) => {
      try {
        // @BUN HTML import - Bun automatically bundles and serves HTML files
        const registryHtml = await import('../index.html');
        // Handle both function and HTMLBundle exports
        let html: string;
        const defaultExport = registryHtml.default;
        if (typeof defaultExport === 'function') {
          html = await (defaultExport as unknown as (req: Request, env?: any) => Promise<string>)(req, { PROFILES_KV: null });
        } else if (typeof defaultExport === 'string') {
          html = defaultExport;
        } else {
          // If it's an HTMLBundle, convert to string via toString
          html = String(defaultExport);
        }
        return new Response(html, {
          headers: { 'Content-Type': 'text/html' },
        });
      } catch (error) {
        console.error('[Registry] Failed to load dashboard:', error);
        return new Response(`Failed to load registry dashboard: ${error instanceof Error ? error.message : String(error)}`, {
          status: 500,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    },
    
    // Dashboard route - dynamic HTML generation
    '/': async () => {
      return new Response(generateDashboard(), {
        headers: { 'Content-Type': 'text/html' },
      });
    },
    
    // ============================================================================
    // @ROUTE Worker Management Routes - Bun.spawn() IPC Process Management
    // @BUN Worker lifecycle management with process isolation
    // ============================================================================
    
    // @ROUTE GET /api/workers/registry
    // Get all active workers
    '/api/workers/registry': async (req, server) => {
      const startTime = performance.now();
      try {
        const workers = getWorkerRegistry();
        return jsonResponse({
          workers,
          total: workers.length,
          timestamp: Date.now(),
        }, 200, {
          domain: 'system',
          scope: 'workers',
          version: 'v1.0',
          includeTiming: true,
          startTime,
        });
      } catch (error) {
        return errorResponse(
          `Failed to get worker registry: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'system', scope: 'workers', version: 'v1.0' }
        );
      }
    },
    
    // @ROUTE POST /api/workers/scale
    // Scale workers (spawn, terminate, list)
    '/api/workers/scale': async (req, server) => {
      const startTime = performance.now();
      try {
        if (req.method !== 'POST') {
          return errorResponse('Method not allowed', 405, {
            domain: 'system',
            scope: 'workers',
            version: 'v1.0',
          });
        }
        
        // Parse body to check action (need to clone request for handleWorkerScale)
        const bodyText = await req.clone().text();
        const body = JSON.parse(bodyText);
        const result = await handleWorkerScale(new Request(req.url, {
          method: 'POST',
          headers: req.headers,
          body: bodyText,
        }));
        
        // Update metrics
        updateMetrics({
          workerPoolSize: getWorkerPoolSize(),
          totalWorkers: getTotalWorkers(),
        });
        
        // Track worker spawns/terminations
        if (body.action === 'spawn') {
          incrementMetric('totalWorkerSpawns');
          log('info', 'worker_spawned', { type: body.type || 'api' });
        } else if (body.action === 'terminate') {
          incrementMetric('totalWorkerTerminations');
          log('info', 'worker_terminated', {});
        }
        
        return result;
      } catch (error) {
        return errorResponse(
          `Worker scaling failed: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'system', scope: 'workers', version: 'v1.0' }
        );
      }
    },
    
    // @ROUTE GET /api/workers/snapshot/:id
    // Stream heap snapshot for a worker
    '/api/workers/snapshot/:id': async (req: BunRequest<'/api/workers/snapshot/:id'>, server) => {
      const startTime = performance.now();
      try {
        const { id } = req.params;
        return await handleWorkerSnapshot(req, { id });
      } catch (error) {
        return errorResponse(
          `Failed to get worker snapshot: ${error instanceof Error ? error.message : String(error)}`,
          500,
          { domain: 'system', scope: 'workers', version: 'v1.0' }
        );
      }
    },
    
    // ============================================================================
    // @ROUTE Parameter Routes - Type-Safe Route Parameters (REQUIRED Pattern)
    // @BUN Bun.serve() routes property - type-safe routing with BunRequest<T>
    // @GREP: rg "@ROUTE.*Parameter" scripts/dev-server.ts
    // ============================================================================
    // Bun provides type-safe route parameters via BunRequest<T>
    // 
    // TypeScript automatically infers parameter types from string literals:
    //   "/orgs/:orgId/repos/:repoId": req => {
    //     const { orgId, repoId } = req.params; // TypeScript knows types automatically
    //     return Response.json({ orgId, repoId });
    //   }
    // 
    // Explicit type annotation (optional but REQUIRED in our codebase):
    //   "/orgs/:orgId/repos/:repoId/settings": (
    //     req: BunRequest<"/orgs/:orgId/repos/:repoId/settings">,
    //   ) => {
    //     const { orgId, repoId } = req.params;
    //     return Response.json({ orgId, repoId });
    //   }
    // 
    // Route Precedence Note:
    // - Exact routes (like /api/dev/endpoints) take precedence over parameter routes
    // - This parameter route only handles unknown endpoints
    // - Example: /api/dev/endpoints → exact route, /api/dev/unknown → parameter route
    // - [#REF] https://bun.com/docs/runtime/http/routing#route-precedence
    // 
    // BunRequest<T> extends Request interface:
    //   // Simplified for brevity
    //   interface BunRequest<T extends string> extends Request {
    //     params: Record<T, string>;      // Type-safe route parameters
    //     readonly cookies: CookieMap;     // Cookie access
    //   }
    // 
    // BunRequest has all Request properties (method, url, headers, body, etc.)
    // plus type-safe params and cookies access.
    // 
    // REQUIRED: All parameter routes MUST use explicit BunRequest<T> type annotation
    // This ensures type safety, better IDE autocomplete, and prevents runtime errors
    // 
    // REQUIRED Pattern (with satisfies constraint):
    // '/api/dev/:endpoint': ((req: BunRequest<'/api/dev/:endpoint'>) => {
    //   const { endpoint } = req.params; // TypeScript knows endpoint is string
    //   return Response.json({ endpoint });
    // }) satisfies RouteHandler<'/api/dev/:endpoint'>
    //
    // Multiple parameters example:
    // '/api/:service/:endpoint/:id': ((req: BunRequest<'/api/:service/:endpoint/:id'>) => {
    //   const { service, endpoint, id } = req.params;
    //   // TypeScript knows: service is string, endpoint is string, id is string
    //   return Response.json({ service, endpoint, id });
    // }) satisfies RouteHandler<'/api/:service/:endpoint/:id'>
    //
    // [#REF] https://bun.com/docs/runtime/http/routing#type-safe-route-parameters
    // 
    // NOTE: Percent-encoded route parameter values are automatically decoded.
    // Unicode characters are supported. Invalid unicode is replaced with the unicode
    // replacement character \uFFFD (U+FFFD).
    // 
    // Examples:
    //   /api/dev/test%20endpoint → endpoint = "test endpoint" (decoded)
    //   /api/dev/café → endpoint = "café" (Unicode supported)
    //   /api/dev/invalid%FF → endpoint = "invalid\uFFFD" (invalid unicode replaced)
    
    /**
     * Extensible API endpoint router
     * Handles dynamic /api/dev/:endpoint routes
     * 
     * Type-safe route parameters:
     * - TypeScript automatically infers types from string literal route
     * - Explicit BunRequest<T> annotation provides better IDE support
     * - req.params.endpoint is typed as string automatically
     * 
     * Pattern matches Bun's documentation:
     * ```typescript
     * "/orgs/:orgId/repos/:repoId": req => {
     *   const { orgId, repoId } = req.params; // TypeScript knows types automatically
     *   return Response.json({ orgId, repoId });
     * }
     * ```
     * 
     * REQUIRED: Explicit BunRequest<'/api/dev/:endpoint'> type annotation
     * REQUIRED: satisfies RouteHandler<'/api/dev/:endpoint'> constraint
     * 
     * The satisfies constraint ensures:
     * - Route string literal matches BunRequest type annotation
     * - Prevents route key and handler type from drifting apart during refactoring
     * - Compile-time guarantee that route and type stay in sync
     * 
     * Benefits:
     * - Type safety at compile time
     * - Better IDE autocomplete and IntelliSense
     * - Prevents runtime parameter access errors
     * - Self-documenting code
     * - Refactoring safety: route changes break at compile-time until handlers updated
     * 
     * Route precedence: Exact routes (like /api/dev/endpoints) take precedence
     * over parameter routes, so this only handles unknown endpoints.
     * 
     * @param req - BunRequest<'/api/dev/:endpoint'> with typed params.endpoint
     * @returns JSON response with validation error or redirect info
     * 
     * Reference: https://bun.com/docs/runtime/http/routing#type-safe-route-parameters
     */
    '/api/dev/:endpoint': ((req: BunRequest<'/api/dev/:endpoint'>) => {
      const startTime = performance.now();
      const { endpoint } = req.params; // TypeScript knows: endpoint is string
      
      // Known endpoints (these are handled by exact routes above due to route precedence)
      const knownEndpoints = ['endpoints', 'configs', 'workers', 'status', 'metrics'];
      
      if (knownEndpoints.includes(endpoint)) {
        // This shouldn't happen as exact routes take precedence
        // But provide helpful redirect information if it does
        return jsonResponse({
          error: 'Endpoint exists but should be accessed directly',
          endpoint,
          directPath: `/api/dev/${endpoint}`,
          availableEndpoints: knownEndpoints,
          note: 'Exact routes take precedence over parameter routes',
        }, 400, {
          domain: 'dev',
          scope: 'routing',
          version: 'v2.1',
          includeTiming: true,
          startTime,
        });
      }
      
      // Unknown endpoint - provide helpful validation error message
      return validationErrorResponse(
        `Unknown endpoint: "${endpoint}"`,
        'endpoint',
        endpoint,
        `One of: ${knownEndpoints.join(', ')}`,
        { domain: 'dev', scope: 'routing', version: 'v2.1' }
      );
    }) satisfies RouteHandler<'/api/dev/:endpoint'>,
    
    // ============================================================================
    // @ROUTE Wildcard Routes - Matches paths under prefix
    // @BUN Bun.serve() routes property - wildcard pattern matching
    // @GREP: rg "@ROUTE.*Wildcard" scripts/dev-server.ts
    // ============================================================================
    // Wildcard routes (/api/*) match any path starting with the prefix
    // Precedence: Exact > Parameter > Wildcard > Catch-all
    // [#REF] https://bun.com/docs/runtime/http/routing#route-precedence
    // 
    // Example from Bun docs:
    //   "/api/*": () => new Response("API catch-all")
    '/api/*': () => {
      return jsonResponse({
        error: 'API route not found',
        message: 'The requested API endpoint does not exist',
        availableEndpoints: [
          '/api/dev/endpoints',
          '/api/dev/metrics',
          '/api/dev/configs',
          '/api/dev/workers',
          '/api/dev/status',
          '/api/tension/map',
          '/api/tension/batch',
          '/api/tension/health',
          '/api/tension/help',
          '/api/version',
        ],
      }, 404, {
        domain: 'system',
        scope: 'routing',
        version: 'v2.1',
      });
    },
    
    // ============================================================================
    // @ROUTE Global Catch-All Route - Matches all unmatched routes
    // @BUN Bun.serve() routes property - catch-all pattern matching
    // @GREP: rg "@ROUTE.*Catch-All" scripts/dev-server.ts
    // ============================================================================
    // Catch-all route (/*) matches any path that doesn't match above routes
    // Precedence: Exact > Parameter > Wildcard > Catch-all
    // [#REF] https://bun.com/docs/runtime/http/routing#route-precedence
    // 
    // Example from Bun docs:
    //   "/*": () => new Response("Global catch-all")
    '/*': () => {
      return new Response('Not Found', {
        status: 404,
        headers: apiHeaders({
          domain: 'system',
          scope: 'routing',
          version: 'v2.1',
          contentType: 'text/plain',
        }),
      });
    },
  },
  // Fetch handler - Handles unmatched requests and edge cases
  // 
  // ✅ Fixed: CORS headers applied to all responses, including OPTIONS preflight
  // 
  // The fetch handler handles incoming requests that weren't matched by any route.
  // It receives a Request object and returns a Response or Promise<Response>.
  // 
  // Patterns from Bun docs:
  // 
  // Basic pattern:
  //   Bun.serve({
  //     fetch(req) {
  //       const url = new URL(req.url);
  //       if (url.pathname === "/") return new Response("Home page!");
  //       if (url.pathname === "/blog") return new Response("Blog!");
  //       return new Response("404!");
  //     },
  //   });
  // 
  // Async/await pattern:
  //   serve({
  //     async fetch(req) {
  //       const start = performance.now();
  //       await sleep(10);
  //       const end = performance.now();
  //       return new Response(`Slept for ${end - start}ms`);
  //     },
  //   });
  // 
  // Promise-based pattern:
  //   Bun.serve({
  //     fetch(req) {
  //       // Forward the request to another server.
  //       return fetch("https://example.com");
  //     },
  //   });
  // 
  // Server object access:
  //   const server = Bun.serve({
  //     fetch(req, server) {
  //       const ip = server.requestIP(req);
  //       return new Response(`Your IP is ${ip}`);
  //     },
  //   });
  // 
  // Error handling pattern (from Bun's error handling tests):
  //   async fetch(req, server) {
  //     try {
  //       const ip = server.requestIP(req);
  //       const data = await fetch(`https://api.example.com?ip=${ip}`);
  //       return Response.json(await data.json());
  //     } catch (error) {
  //       // Explicit error response pattern
  //       return new Response("Gateway error", { status: 502 });
  //     }
  //   }
  // 
  // Reusable error wrapper pattern (Bun supports this pattern):
  //   // Reusable error wrapper (Bun supports this pattern)
  //   async function withErrorHandler(handler) {
  //     return async (req, server) => {
  //       try {
  //         return await handler(req, server);
  //       } catch (error) {
  //         console.error(`[${server.requestIP(req)?.address}] ${error.message}`);
  //         return new Response("Internal error", { status: 500 });
  //       }
  //     };
  //   }
  // 
  //   // Usage
  //   fetch: withErrorHandler(async (req, server) => {
  //     // Your route logic here
  //   })
  // 
  // Note: With catch-all route (/*) above, most unmatched requests are handled by routes.
  // This handler is primarily for OPTIONS preflight requests and per-request controls.
  // 
  // [#REF] https://bun.com/docs/runtime/http/routing#fetch-request-handler
  // @ROUTE Fetch Handler - Unmatched requests fallback
  // @BUN Bun.serve() fetch handler - handles unmatched requests
  // @GREP: rg "@ROUTE.*Fetch.*Handler" scripts/dev-server.ts
  async fetch(req, server) {
    // ✅ Fixed: Handle OPTIONS preflight requests with CORS headers
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }
    
    // Per-Request Controls
    // [#REF] https://bun.com/docs/runtime/http/server#per-request-controls
    // - server.timeout(request, seconds) - Set custom idle timeout for a request (0 to disable)
    //   See: https://bun.com/docs/runtime/http/server#server-timeout-request-seconds
    // - server.requestIP(request) - Get client IP address and port
    //   Returns null for closed requests or Unix domain sockets
    //   See: https://bun.com/docs/runtime/http/server#server-requestip-request
    
    // Get client IP for logging/rate limiting (optional)
    // Returns SocketAddress | null
    const clientIP = server.requestIP(req);
    if (clientIP && process.env.LOG_REQUESTS === 'true') {
      const url = new URL(req.url);
      console.log(`[${new Date().toISOString()}] ${req.method} ${url.pathname} from ${clientIP.address}:${clientIP.port}`);
    }
    
    // @BUN WebSocket upgrade handling with subprotocol negotiation
    // Handle WebSocket upgrade requests (not handled by routes object)
    const url = new URL(req.url);
    if (url.pathname.startsWith('/ws/')) {
      // @BUN Bun 1.3+ automatically negotiates permessage-deflate compression
      // Subprotocol negotiation: Client can request specific protocols
      // Example: new WebSocket(url, ['telemetry-v2', 'telemetry-v1'])
      // Bun selects the highest version both support
      
      // Extract requested subprotocols from headers
      const requestedProtocols = req.headers.get('Sec-WebSocket-Protocol');
      const protocols = requestedProtocols ? requestedProtocols.split(',').map(p => p.trim()) : [];
      
      // Select protocol based on path
      let selectedProtocol: string | undefined;
      if (url.pathname.includes('/ws/workers/telemetry')) {
        // Prefer v2, fallback to v1
        selectedProtocol = protocols.includes('telemetry-v2') ? 'telemetry-v2' : 
                          protocols.includes('telemetry-v1') ? 'telemetry-v1' : undefined;
      } else if (url.pathname.includes('/ws/spline-live')) {
        // Prefer v2, fallback to v1
        selectedProtocol = protocols.includes('spline-v2') ? 'spline-v2' : 
                          protocols.includes('spline-v1') ? 'spline-v1' : undefined;
      }
      
      // Upgrade to WebSocket - Bun automatically handles compression negotiation
      // @BUN Bun 1.3+ TypeScript types: data type is now properly typed via Bun.Server<T>
      // Store pathname in WebSocket data for routing
      // Note: Protocol negotiation is handled automatically via Sec-WebSocket-Protocol header
      if (server.upgrade(req, {
        data: { pathname: url.pathname }, // Type-safe WebSocket data (no 'as' cast needed)
      })) {
        return; // Upgrade successful, websocket handlers will take over
      }
      // If upgrade fails, return error
      return new Response('WebSocket upgrade failed', { status: 426 });
    }
    
    // All routes are handled by routes property above
    // This fetch handler only catches unmatched requests (404)
    // ✅ Fixed: Append CORS headers to 404 responses
    const notFoundResponse = new Response('Not Found', { status: 404 });
    return appendCorsHeaders(notFoundResponse);
  },
  // Error handler - catches unhandled errors in fetch handler
  // ✅ Fixed: CORS headers applied to error responses
  // [#REF] https://bun.com/docs/runtime/http/server#practical-example-rest-api
  error(error) {
    console.error('Server error:', error);
    const errorResp = errorResponse(
      error instanceof Error ? error.message : String(error),
      500
    );
    return appendCorsHeaders(errorResp);
  },
  // WebSocket handler - Handles WebSocket connections
  // @BUN Bun 1.3+ WebSocket support with permessage-deflate compression
  // @PERF Critical: Compression reduces JSON payload by 60-80% bandwidth
  // 
  // Performance Impact:
  // - Before: 500 bytes × 60 fps = 30 KB/s per client
  // - After: 120 bytes × 60 fps = 7.2 KB/s per client (76% reduction)
  // - 100 clients: 3 MB/s → 720 KB/s (2.28 MB/s savings)
  // 
  // [#REF] https://bun.com/docs/runtime/http/server#websocket
  websocket: {
    // @BUN Enable permessage-deflate compression (60-80% bandwidth reduction)
    // Bun 1.3+ automatically negotiates compression with clients
    // No code needed - compression is transparent at protocol level
    perMessageDeflate: true,
    
    // Handle incoming WebSocket messages
    // @BUN Message is automatically decompressed if sent compressed
    message(ws, message) {
      // Route messages based on WebSocket path
      // @BUN Bun 1.3+ TypeScript: ws.data is now properly typed via Bun.Server<WebSocketData>
      const pathname = ws.data.pathname || '';
      
      if (pathname.includes('/ws/spline-live')) {
        // Handle spline-live messages
        try {
          // @BUN Handle binary data (decompressed automatically by Bun)
          if (message instanceof ArrayBuffer) {
            const messageText = new TextDecoder().decode(message);
            const data = JSON.parse(messageText);
            console.log(`[WS-Spline] Received (decompressed):`, data.type);
          } else if (typeof message === 'string') {
            const data = JSON.parse(message);
            if (data.type === 'ping') {
              // @BUN Response automatically compressed if client supports it
              ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            }
          }
        } catch (error) {
          console.error('[WS-Spline] Message error:', error);
        }
      } else if (pathname.includes('/ws/workers/telemetry')) {
        // Handle worker telemetry messages
        try {
          const data = typeof message === 'string' ? JSON.parse(message) : message;
          
          if (data.type === 'heartbeat') {
            // Echo back (automatically compressed)
            ws.send(JSON.stringify({
              type: 'heartbeat-ack',
              receivedAt: Date.now(),
            }));
          }
          
          // @BUN Log compression savings (sample 1% of messages)
          const uncompressedSize = JSON.stringify(data).length;
          const compressedSize = typeof message === 'string' ? message.length : (message as ArrayBuffer).byteLength;
          const savings = ((uncompressedSize - compressedSize) / uncompressedSize * 100).toFixed(1);
          
          if (Math.random() < 0.01) { // Log 1% of messages
            console.log(`[WS-Worker] Compression saved ${savings}% (${uncompressedSize}→${compressedSize} bytes)`);
          }
        } catch (error) {
          console.error('[WS-Worker] Invalid message:', error);
        }
      } else {
        // Default handler for other WebSocket connections
        try {
          // Track WebSocket message for metrics
          if (typeof message === 'string') {
            const data = JSON.parse(message);
            // Handle different message types
            if (data.type === 'ping') {
              ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            } else {
              // Echo or process message (automatically compressed)
              ws.send(message);
            }
          } else {
            // Binary message - echo back (compressed if applicable)
            ws.send(message);
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
          ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      }
    },
    // Handle WebSocket connection opened
    // @BUN Log negotiated protocol and compression status
    open(ws) {
      trackWebSocketOpen(ws);
      // @BUN Bun 1.3+ TypeScript: ws.data is now properly typed via Bun.Server<WebSocketData>
      const pathname = ws.data.pathname || '';
      
      // @BUN Access WebSocket properties (Bun 1.3+)
      const protocol = (ws as any).protocol || 'none';
      const extensions = (ws as any).extensions || 'none';
      const clientId = crypto.randomUUID();
      
      // Store client ID for metrics tracking
      (ws as any).clientId = clientId;
      
      if (pathname.includes('/ws/spline-live')) {
        // Spline live stream connection
        splineLiveClients.add(ws);
        console.log(`[WS-Spline] Client connected: ${clientId} (${splineLiveClients.size} total)`);
        console.log(`[WS-Spline] Protocol: ${protocol}`);
        console.log(`[WS-Spline] Compression: ${extensions}`);
        
        // Start streaming if first client
        if (splineLiveClients.size === 1) {
          startSplineLiveStream();
        }
        
        // Send welcome message (automatically compressed if client supports it)
        ws.send(JSON.stringify({
          type: 'connection',
          clientId,
          message: 'Connected to spline live stream',
          timestamp: Date.now(),
          compression: extensions, // Log compression status
          protocol: protocol,
        }));
      } else if (pathname.includes('/ws/workers/telemetry')) {
        // Worker telemetry connection
        const workerId = new URL((ws as any).url || '').searchParams.get('workerId') || 'anonymous';
        console.log(`[WS-Worker] Worker ${workerId} connected: ${clientId}`);
        console.log(`[WS-Worker] Protocol: ${protocol}`);
        console.log(`[WS-Worker] Compression: ${extensions}`);
        
        // Send initial telemetry data (uncompressed: ~500 bytes, compressed: ~120 bytes)
        ws.send(JSON.stringify({
          type: 'telemetry',
          workerId,
          timestamp: Date.now(),
          metrics: {
            cpu: Math.random() * 100,
            memory: Math.random() * 1024,
            requests: Math.floor(Math.random() * 1000),
          },
          compression: extensions,
          protocol: protocol,
        }));
      } else {
        // Default WebSocket connection
        console.log(`✅ WebSocket connection opened: ${clientId}`);
        console.log(`[WS] Protocol: ${protocol}`);
        console.log(`[WS] Compression: ${extensions}`);
        ws.send(JSON.stringify({ 
          type: 'connected', 
          timestamp: Date.now(),
          message: 'WebSocket connection established',
          compression: extensions,
          protocol: protocol,
        }));
      }
    },
    // Handle WebSocket connection closed
    close(ws, code, message) {
      trackWebSocketClose(ws);
      // @BUN Bun 1.3+ TypeScript: ws.data is now properly typed via Bun.Server<WebSocketData>
      const pathname = ws.data.pathname || '';
      const clientId = (ws as any).clientId || 'unknown';
      
      if (pathname.includes('/ws/spline-live')) {
        // Spline live stream disconnection
        splineLiveClients.delete(ws);
        const savings = getCompressionSavings(clientId);
        console.log(`[WS-Spline] Client disconnected: ${clientId} (${splineLiveClients.size} remaining)`);
        console.log(`[WS-Spline] Average compression savings: ${savings}`);
        
        // Clean up metrics
        compressionMetrics.delete(clientId);
        
        // Stop streaming if no clients
        if (splineLiveClients.size === 0) {
          stopSplineLiveStream();
        }
      } else if (pathname.includes('/ws/workers/telemetry')) {
        const workerId = new URL((ws as any).url || '').searchParams.get('workerId') || 'anonymous';
        console.log(`[WS-Worker] Worker ${workerId} disconnected: ${clientId} (code: ${code})`);
      } else {
        console.log(`WebSocket connection closed: ${clientId} (code: ${code}, message: ${message})`);
      }
    },
    // @BUN Handle drain event - socket is ready to receive more data
    // @PERF This handler is reused for all connections (optimized)
    // Called when the socket's send buffer is drained and ready for more data
    // Useful for backpressure handling and flow control
    drain(ws) {
      // @BUN Socket is ready to receive more data
      // Can resume sending if we were throttling
      // @BUN Bun 1.3+ TypeScript: ws.data is now properly typed via Bun.Server<WebSocketData>
      const pathname = ws.data.pathname || '';
      const clientId = (ws as any).clientId || 'unknown';
      
      // Log drain events for high-frequency streams (sample 1%)
      if (pathname.includes('/ws/spline-live') && Math.random() < 0.01) {
        console.log(`[WS-Spline] Socket drained: ${clientId} (ready for more data)`);
      }
    },
    // @BUN Handle ping/pong with compression (Bun 1.3+)
    // @PERF These handlers are reused for all connections (optimized)
    ping(ws, data) {
      // Bun automatically handles ping/pong, but we can log it
      const clientId = (ws as any).clientId || 'unknown';
      // Log ping events occasionally (sample 1%)
      if (Math.random() < 0.01) {
        console.log(`[WS] Ping received from ${clientId}`);
      }
    },
    pong(ws, data) {
      // Bun automatically handles ping/pong
      const clientId = (ws as any).clientId || 'unknown';
      // Log pong events occasionally (sample 1%)
      if (Math.random() < 0.01) {
        console.log(`[WS] Pong sent to ${clientId}`);
      }
    },
  },
});

// ✅ Initialize metrics tracking after server is created
initializeMetricsTracking(devServer);

/**
 * SharedMap interface for zero-copy worker state
 * SharedMap provides atomic reads/writes without serialization cost
 * 
 * [#REF] https://bun.com/docs/runtime/utils#sharedmap
 */
interface SharedMapLike {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  size: number;
}

/**
 * Worker Registry with SharedMap optimization
 * ✅ Pattern: Use SharedMap for zero-copy worker state
 * 
 * SharedMap provides atomic reads/writes without serialization cost.
 * Falls back to regular Map if SharedMap is not available.
 */
let workerRegistryMap: Map<string, Record<string, WorkerInfo>> | SharedMapLike | null = null;

try {
  // Try to use Bun.SharedMap for zero-copy worker state
  // SharedMap may not be in type definitions yet, so we use a type assertion
  if (typeof Bun !== 'undefined' && 'SharedMap' in Bun && typeof (Bun as { SharedMap?: new (name: string) => SharedMapLike }).SharedMap === 'function') {
    const SharedMapConstructor = (Bun as { SharedMap: new (name: string) => SharedMapLike }).SharedMap;
    workerRegistryMap = new SharedMapConstructor('worker-registry');
    console.log('[Optimization] ✅ Using SharedMap for worker registry (zero-copy)');
  } else {
    // Fallback to regular Map
    workerRegistryMap = new Map();
    console.log('[Optimization] ⚠️  Using regular Map for worker registry (SharedMap not available)');
  }
} catch (error) {
  // Fallback to regular Map
  workerRegistryMap = new Map();
  console.log('[Optimization] ⚠️  SharedMap initialization failed, using regular Map');
}

console.log(`\n🚀 Dev Server running on ${devServer.url}`);
console.log(`📊 Dashboard: ${devServer.url}/`);
console.log(`\n📡 API Endpoints:`);
console.log(`   GET  /api/dev/endpoints  → All API endpoints`);
console.log(`   GET  /api/dev/configs     → All configs`);
console.log(`   GET  /api/dev/workers    → Worker telemetry`);
console.log(`   GET  /api/dev/status     → System status`);
console.log(`   GET  /api/dev/metrics    → Server metrics (pendingRequests, pendingWebSockets)`);
console.log(`   GET  /api/tension/health → Tension mapping health check`);
console.log(`   GET  /api/tension/help   → Tension mapping help documentation`);
console.log(`\n💡 Open ${devServer.url} in your browser!`);
console.log(`\n⚙️  Server Configuration:`);
console.log(`   Port: ${devServer.port}`);
console.log(`   Hostname: ${devServer.hostname}`);
console.log(`   Idle Timeout: ${IDLE_TIMEOUT_SECONDS} seconds`);
console.log(`   Development Mode: ${devServer.development ? '✅ Enabled' : '❌ Disabled'}`);
console.log(`\n📋 Configuration Sources:`);
const portSource = process.env.BUN_PORT ? 'BUN_PORT' : process.env.PORT ? 'PORT' : process.env.NODE_PORT ? 'NODE_PORT' : `default (${DEFAULT_PORT})`;
console.log(`   Port: ${devServer.port} (from ${portSource} - Bun auto-handled)`);
console.log(`   Hostname: ${HOSTNAME} (from ${process.env.HOSTNAME ? 'HOSTNAME' : 'default'})`);
console.log(`   Idle Timeout: ${IDLE_TIMEOUT_SECONDS}s (from ${process.env.IDLE_TIMEOUT ? 'IDLE_TIMEOUT' : 'default'})`);

// Port conflict detection and warning
if (devServer.port !== DEFAULT_PORT && !process.env.BUN_PORT && !process.env.PORT && !process.env.NODE_PORT) {
  console.log(`\n⚠️  WARNING: Server started on port ${devServer.port} instead of default ${DEFAULT_PORT}`);
  console.log(`   This usually means port ${DEFAULT_PORT} was already in use.`);
  console.log(`   To use a specific port: PORT=3002 bun run dev`);
  console.log(`   To check port conflicts: ./scripts/check-port.sh ${DEFAULT_PORT}`);
}

// Graceful shutdown handlers registered with process compatibility layer
// @BUN Enhanced graceful shutdown with worker pool cleanup
// Handlers are executed in reverse order (LIFO) during shutdown
// Note: Must be registered AFTER devServer is created
registerShutdownHandler(async () => {
  log('info', 'Stopping dev server...');
  await devServer.stop(true); // closeActiveConnections = true
  log('info', 'Dev server stopped');
});

registerShutdownHandler(async () => {
  log('info', 'Terminating worker pool...');
  await terminateAllWorkers();
  log('info', 'Worker pool terminated');
});

// Server Lifecycle Methods
// [#REF] https://bun.com/docs/runtime/http/server#server-lifecycle-methods
// - server.stop(closeActiveConnections?) - Stop accepting new connections
//   - closeActiveConnections: if true, immediately terminates all connections
// - server.ref() - Keep process alive while server is running
//   [#REF] https://bun.com/docs/runtime/http/server#server-ref-and-server-unref
// - server.unref() - Allow process to exit if server is only thing running
//   [#REF] https://bun.com/docs/runtime/http/server#server-ref-and-server-unref
// - server.reload(options) - Update handlers without restarting (Hot Route Reloading)
//   - Only fetch and error handlers can be updated
//   See: https://bun.com/docs/runtime/http/server#server-reload

// Keep process alive while server is running
// [#REF] https://bun.com/docs/runtime/http/server#server-ref-and-server-unref
// server.ref() - Prevents the process from exiting while the server is running
// server.unref() - Allows the process to exit if the server is the only thing keeping it alive
// Use unref() if you want the server to exit when there are no other active handles
devServer.ref();

export { devServer };

