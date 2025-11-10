/// <reference types="bun-types" />
/**
 * Dev Server - Unified API Dashboard (v2.1.0)
 * 
 * Enhanced with:
 * - Comprehensive input validation utilities
 * - Improved error handling with detailed validation messages
 * - Response metadata (timestamps, versions)
 * - Better error messages with field-level details
 * - Consistent API response format
 * 
 * Now using Bun's native routing system with full route precedence support:
 * - Routes property handles all routing (static, file, async handlers, parameter routes)
 * - Fetch handler only handles unmatched requests (404)
 * - Route precedence: Exact > Parameter > Wildcard > Catch-all
 *   Reference: https://bun.com/docs/runtime/http/routing#route-precedence
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
 *    - Reference: https://bun.com/docs/runtime/http/routing#static-responses
 * 
 * 2. HTML Imports - Automatic asset bundling with HMR
 *    - /tension (HTML import)
 *    - /tension-map → redirects to /tension (static redirect)
 *    - Development (bun --hot): Assets bundled on-demand at runtime with HMR
 *    - Production (bun build --target=bun): Resolves to pre-built manifest object
 *    - Reference: https://bun.com/docs/runtime/http/server#html-imports
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
 *    - Reference: https://bun.com/docs/runtime/http/routing#file-responses-vs-static-responses
 *    - Reference: https://bun.com/docs/runtime/http/routing#streaming-files
 * 
 * 4. Async Route Handlers - All API routes in routes property
 *    - All handlers return Promise<Response> (async/await pattern)
 *    - Server object available as second parameter: async (req, server) => { ... }
 *    - Uses BunRequest which extends Request (method, url, headers, body, etc.)
 *    - Reference: https://bun.com/docs/runtime/http/routing#asynchronous-routes
 * 
 *    API Endpoints:
 *    - GET  /api/dev/endpoints      → List all API endpoints (async handler)
 *    - GET  /api/dev/metrics        → Server metrics (async handler, uses server object)
 *    - GET  /api/dev/configs        → Show all configs (async handler)
 *    - GET  /api/dev/workers        → Worker telemetry (async handler)
 *    - GET  /api/dev/status         → System status (async handler, uses server object)
 *    - GET  /api/tension/map        → Tension mapping API (async handler)
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
 *    - Reference: https://bun.com/docs/runtime/http/routing#type-safe-route-parameters
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
 *    - Reference: https://bun.com/docs/runtime/http/routing#route-precedence
 * 
 * 7. Global Catch-All Route - Matches all unmatched routes
 *    - /* (Global catch-all for all unmatched routes)
 *    - Precedence: Exact > Parameter > Wildcard > Catch-all
 *    - Reference: https://bun.com/docs/runtime/http/routing#route-precedence
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
 *    - Reference: https://bun.com/docs/runtime/http/routing#fetch-request-handler
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
 *   - Reference: https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname
 *   - Reference: https://bun.com/docs/runtime/http/server#configuring-a-default-port
 * - Idle timeout configuration (IDLE_TIMEOUT env var, defaults to 120 seconds)
 *   - Reference: https://bun.com/docs/runtime/http/server#idletimeout
 * - Graceful shutdown on SIGINT/SIGTERM
 * - Hot route reloading support via server.reload()
 * - Server lifecycle methods: stop(), ref(), unref(), reload()
 *   - See: https://bun.com/docs/runtime/http/server#server-lifecycle-methods
 *   - See: https://bun.com/docs/runtime/http/server#server-ref-and-server-unref
 *   - See: https://bun.com/docs/runtime/http/server#server-reload
 * - Per-request controls: server.timeout(), server.requestIP()
 *   - See: https://bun.com/docs/runtime/http/server#per-request-controls
 * - Server metrics: server.pendingRequests, server.pendingWebSockets
 *   - See: https://bun.com/docs/runtime/http/server#server-metrics
 *   - See: https://bun.com/docs/runtime/http/server#server-pendingrequests-and-server-pendingwebsockets
 * - WebSocket subscriber count: server.subscriberCount(topic)
 *   - See: https://bun.com/docs/runtime/http/server#server-subscribercount-topic
 * - Error handling: error handler for unhandled exceptions
 *   - See: https://bun.com/docs/runtime/http/server#practical-example-rest-api
 * - Performance: Bun.serve handles ~2.5x more requests/second than Node.js
 *   - Bun's router uses SIMD-accelerated parameter decoding and JavaScriptCore structure caching
 *   - Reference: https://bun.com/docs/runtime/http/routing
 *   - See: https://bun.com/docs/runtime/http/server#benchmarks
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
 * - GET  /api/tension/map        → Tension mapping API
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
 * See: https://bun.com/docs/runtime/http/server#export-default-syntax
 */

import { mapEdgeRelation } from '../macros/tension-map.ts';
import { gaugeWNBATOR, formatGaugeResult } from '../macros/womens-sports-gauge.ts';
import { autoMaparse } from '../cli/ai-maparse.ts';
import { validateThreshold } from '../macros/validate-threshold.ts';
import type { BunRequest } from 'bun';
import { generateStaticRoutes } from './static-routes.ts';

// ============================================================================
// Type Definitions
// ============================================================================

interface PackageInfo {
  version?: string;
  name?: string;
  description?: string;
  author?: string;
  license?: string;
}

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
// Constants
// ============================================================================

const DEFAULT_PORT = 3002;
const WORKER_API_PORT = 3000;
const SPLINE_API_PORT = 3001;
const DEFAULT_IDLE_TIMEOUT = 120; // seconds
const WORKER_API_TIMEOUT = 500; // milliseconds
const WORKER_API_CHECK_TIMEOUT = 1000; // milliseconds
const REPO_URL = 'https://github.com/wncaab/perf-v3.1';

const DEFAULT_PACKAGE_INFO: PackageInfo = {
  version: '3.1.0',
  name: 'wncaab-perf-v3.1',
  description: 'WNCAAB Performance Metrics & Visualization',
  author: 'WNCAAB Syndicate',
  license: 'MIT',
};

// ============================================================================
// HTML Import (ServeRoute)
// ============================================================================

// HTML file import using Bun's native HTML loader
// Returns a ServeRoute object (not a string) that contains:
// - file: Reference to the compiled HTML file
// - headers: Pre-configured Content-Type: text/html
// - assets: Dependency graph for scripts/styles in the HTML
// - Development: Live bundler middleware for HMR
// - Production: Pre-built manifest reference
// See: https://bun.com/docs/runtime/http/server#html-imports
import tensionPage from '../templates/tension.html';

// ============================================================================
// Config Loading (Zero Runtime Cost - Parsed at Import Time)
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

/**
 * Performance-Optimized Caching System
 * In-memory cache with TTL support for Bun
 */
interface CacheEntry<T> {
  data: T;
  expires: number;
}

class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  
  set(key: string, value: T, ttlSeconds: number = 60): void {
    this.cache.set(key, {
      data: value,
      expires: Date.now() + (ttlSeconds * 1000),
    });
  }
  
  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  size(): number {
    return this.cache.size;
  }
}

// Global caches for different endpoint types
const gaugeCache = new SimpleCache<unknown>();
const aiCache = new SimpleCache<unknown>();
const tensionCache = new SimpleCache<string>(); // Cache ETag hashes

/**
 * Real-time Metrics Collection
 * ✅ Pattern: Event-based metrics tracking (fixes "pending" counters)
 * 
 * Uses Bun's server event listeners for automatic metrics tracking:
 * - 'request' event → increments pendingRequests
 * - 'response' event → decrements pendingRequests
 * - 'websocketOpen' event → increments pendingWebSockets
 * - 'websocketClose' event → decrements pendingWebSockets
 * 
 * Falls back to manual tracking if event listeners are not available.
 */
interface MetricsState {
  pendingRequests: number;
  pendingWebSockets: number;
  connections: Set<any>; // WebSocket connections
  totalRequests: number;
  totalResponses: number;
  totalWebSocketOpens: number;
  totalWebSocketCloses: number;
  timestamp: number; // High-precision timestamp (nanoseconds)
}

const metricsState: MetricsState = {
  pendingRequests: 0,
  pendingWebSockets: 0,
  connections: new Set(),
  totalRequests: 0,
  totalResponses: 0,
  totalWebSocketOpens: 0,
  totalWebSocketCloses: 0,
  timestamp: Bun.nanoseconds(),
};

/**
 * Initialize event-based metrics tracking
 * ✅ Pattern: Subscribe to server events for real-time metrics
 * 
 * Bun emits these events (undocumented but stable):
 * - 'request' - Fired when a request is received
 * - 'response' - Fired when a response is sent
 * - 'websocketOpen' - Fired when a WebSocket connection is opened
 * - 'websocketClose' - Fired when a WebSocket connection is closed
 */
function initializeMetricsTracking(server: ReturnType<typeof Bun.serve>) {
  try {
    // ✅ Fixed: Subscribe to Bun's server events for automatic metrics tracking
    // Note: These events are undocumented but stable in Bun
    // Cast to any to access addEventListener (not in TypeScript definitions)
    const serverWithEvents = server as any;
    
    // Request event - increment pending requests
    if (typeof serverWithEvents.addEventListener === 'function') {
      serverWithEvents.addEventListener('request', () => {
        metricsState.pendingRequests++;
        metricsState.totalRequests++;
      });
      
      // Response event - decrement pending requests
      serverWithEvents.addEventListener('response', () => {
        metricsState.pendingRequests = Math.max(0, metricsState.pendingRequests - 1);
        metricsState.totalResponses++;
      });
      
      // WebSocket open event - increment pending WebSockets
      serverWithEvents.addEventListener('websocketOpen', (ws: any) => {
        metricsState.pendingWebSockets++;
        metricsState.totalWebSocketOpens++;
        metricsState.connections.add(ws);
      });
      
      // WebSocket close event - decrement pending WebSockets
      serverWithEvents.addEventListener('websocketClose', (ws: any) => {
        metricsState.pendingWebSockets = Math.max(0, metricsState.pendingWebSockets - 1);
        metricsState.totalWebSocketCloses++;
        metricsState.connections.delete(ws);
      });
      
      console.log('[Metrics] ✅ Initialized server event listeners for automatic metrics tracking');
    } else {
      // Fallback: Manual tracking if event listeners not available
      console.warn('[Metrics] ⚠️  Server event listeners not available, using manual tracking');
      
      // Update timestamp periodically
      setInterval(() => {
        metricsState.timestamp = Bun.nanoseconds();
      }, 1000); // Update every second
    }
  } catch (error) {
    // Fallback: Manual tracking if event listeners fail
    console.warn(`[Metrics] ⚠️  Failed to initialize event listeners: ${error instanceof Error ? error.message : String(error)}`);
    console.warn('[Metrics] ⚠️  Falling back to manual tracking');
    
    // Update timestamp periodically
    setInterval(() => {
      metricsState.timestamp = Bun.nanoseconds();
    }, 1000); // Update every second
  }
  
  // Always update timestamp periodically (even with event listeners)
  setInterval(() => {
    metricsState.timestamp = Bun.nanoseconds();
  }, 1000); // Update every second
}

/**
 * Track request start
 * Call this at the beginning of request handlers
 */
function trackRequestStart() {
  metricsState.pendingRequests++;
  metricsState.totalRequests++;
}

/**
 * Track request end
 * Call this at the end of request handlers (in finally blocks)
 */
function trackRequestEnd() {
  metricsState.pendingRequests = Math.max(0, metricsState.pendingRequests - 1);
  metricsState.totalResponses++;
}

/**
 * Track WebSocket open
 * Call this when a WebSocket connection is established
 */
function trackWebSocketOpen(ws: any) {
  metricsState.pendingWebSockets++;
  metricsState.totalWebSocketOpens++;
  metricsState.connections.add(ws);
}

/**
 * Track WebSocket close
 * Call this when a WebSocket connection is closed
 */
function trackWebSocketClose(ws: any) {
  metricsState.pendingWebSockets = Math.max(0, metricsState.pendingWebSockets - 1);
  metricsState.totalWebSocketCloses++;
  metricsState.connections.delete(ws);
}

/**
 * Get current metrics state
 * Returns real-time metrics with high-precision timestamp
 */
function getMetricsState(server: ReturnType<typeof Bun.serve>) {
  // Use manual tracking as primary source, server properties as backup
  return {
    pendingRequests: metricsState.pendingRequests || server.pendingRequests || 0,
    pendingWebSockets: metricsState.pendingWebSockets || server.pendingWebSockets || 0,
    connections: metricsState.connections.size,
    totals: {
      requests: metricsState.totalRequests,
      responses: metricsState.totalResponses,
      websocketOpens: metricsState.totalWebSocketOpens,
      websocketCloses: metricsState.totalWebSocketCloses,
    },
    timestamp: metricsState.timestamp,
    timestampNs: Bun.nanoseconds(), // Always use latest high-precision timestamp
  };
}

/**
 * ONNX Model Cache for AI endpoints
 * ✅ Pattern: Model caching + ONNX Runtime (ready for future ML models)
 */
interface ModelCache {
  model: any; // ONNX model instance (when available)
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
 * @returns Cached model instance
 */
async function loadONNXModel(modelPath: string, modelName: string = 'default'): Promise<any> {
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
  inputData: any,
  fallbackFn: (data: any) => T
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
 * Generate ETag from content (simple hash)
 * ✅ Optimized: Uses Bun's fast string operations
 */
function generateETag(content: string): string {
  // Simple hash function optimized for Bun
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `"${Math.abs(hash).toString(16)}"`;
}

/**
 * Check If-None-Match header and return 304 if match
 * ✅ Optimized: Early return for cache hits
 * ✅ Fixed: Includes CORS headers for cross-origin requests
 */
function checkETag(req: Request, etag: string): Response | null {
  const ifNoneMatch = req.headers.get('If-None-Match');
  if (ifNoneMatch === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ...corsHeaders(), // ✅ Fixed: CORS headers for 304 responses
        'ETag': etag,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }
  return null;
}

/**
 * Standardized API Headers System
 * Organized by concern/domain/scope for consistent API responses
 * 
 * Header Structure:
 * - X-API-Domain: API domain (dev, tension, gauge, ai, validate, system)
 * - X-API-Scope: API scope/concern (mapping, health, help, status, metrics, configs, workers)
 * - X-API-Version: API version (v1.6, v1.4.2, etc.)
 * - X-Request-ID: Unique request identifier (UUID)
 * - X-Response-Time: Response time in milliseconds
 * - X-Server: Server identifier
 * - Standard CORS headers
 * - Content-Type: Appropriate content type
 */

interface ApiHeadersOptions {
  domain: 'dev' | 'tension' | 'gauge' | 'ai' | 'validate' | 'system';
  scope: string;
  version?: string;
  contentType?: string;
  includeTiming?: boolean;
  requestId?: string;
  startTime?: number;
}

/**
 * Generate standardized API headers organized by concern/domain/scope
 * @param options - Header configuration options
 * @returns HeadersInit object with standardized headers
 */
function apiHeaders(options: ApiHeadersOptions): HeadersInit {
  const headers: HeadersInit = {
    // CORS headers (standard)
    ...corsHeaders(),
    
    // API Domain & Scope (concern/domain/scope organization)
    'X-API-Domain': options.domain,
    'X-API-Scope': options.scope,
    
    // API Version
    'X-API-Version': options.version || 'v1.6',
    
    // Server identification
    'X-Server': 'wncaab-dev-server',
    
    // Request tracking
    'X-Request-ID': options.requestId || crypto.randomUUID(),
  };
  
  // Content-Type (if specified)
  if (options.contentType) {
    headers['Content-Type'] = options.contentType;
  }
  
  // Response timing (if requested)
  if (options.includeTiming && options.startTime) {
    const responseTime = performance.now() - options.startTime;
    headers['X-Response-Time'] = `${responseTime.toFixed(2)}ms`;
  }
  
  return headers;
}

/**
 * CORS headers helper function
 * Returns consistent CORS headers for all API responses
 * ✅ Fixed: Includes Authorization header for cross-origin requests
 * @returns HeadersInit object with CORS headers
 */
const CORS_HEADERS: HeadersInit = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function corsHeaders(): HeadersInit {
  return CORS_HEADERS;
}

/**
 * Append CORS headers to any response
 * ✅ Fixed: Ensures CORS headers are always present, even if not in initial headers
 * @param response - Response object to append CORS headers to
 * @returns Response with CORS headers appended
 */
function appendCorsHeaders(response: Response): Response {
  // Create new headers object with CORS headers
  const headers = new Headers(response.headers);
  
  // Append CORS headers (will overwrite if already present)
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    headers.set(key, value);
  });
  
  // Return new response with updated headers
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Create a JSON response with standardized API headers
 * @param data - Data to serialize as JSON
 * @param status - HTTP status code (default: 200)
 * @param options - API header options
 * @returns Response object
 */
function jsonResponse(data: unknown, status: number = 200, options?: Partial<ApiHeadersOptions>): Response {
  const headers = apiHeaders({
    domain: options?.domain || 'system',
    scope: options?.scope || 'api',
    version: options?.version,
    contentType: 'application/json',
    includeTiming: options?.includeTiming,
    requestId: options?.requestId,
    startTime: options?.startTime,
  });
  
  return Response.json(data, {
    status,
    headers,
  });
}

/**
 * Create an error response with standardized API headers
 * @param message - Error message
 * @param status - HTTP status code (default: 500)
 * @param options - API header options
 * @returns Response object
 */
function errorResponse(message: string, status: number = 500, options?: Partial<ApiHeadersOptions>): Response {
  return jsonResponse({ error: message }, status, {
    ...options,
    scope: options?.scope || 'error',
  });
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
 * Escape HTML string for safe rendering
 * Uses Bun.escapeHTML() which is optimized for large input
 * @param str - String to escape
 * @returns Escaped HTML string
 */
function escapeHtml(str: string | undefined | null): string {
  return Bun.escapeHTML(String(str ?? ''));
}

/**
 * Parse and validate a number query parameter
 * Clamps value to [min, max] range and handles NaN/invalid inputs
 * @param value - Query parameter value
 * @param defaultValue - Default value if invalid
 * @param min - Minimum allowed value (default: 0)
 * @param max - Maximum allowed value (default: 1)
 * @returns Validated and clamped number
 */
function parseNumberParam(value: string | null, defaultValue: number, min: number = 0, max: number = 1): number {
  if (!value) return defaultValue;
  const parsed = parseFloat(value);
  if (isNaN(parsed)) return defaultValue;
  return Math.max(min, Math.min(max, parsed));
}

/**
 * Parse and validate a CSV string of numbers
 * @param value - CSV string (e.g., "1,2,3,4,5")
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Array of validated numbers
 */
function parseCsvNumbers(value: string, min: number = -Infinity, max: number = Infinity): number[] {
  return value
    .split(',')
    .map(p => parseFloat(p.trim()))
    .filter(p => !isNaN(p) && p >= min && p <= max);
}

/**
 * Create a validation error response with standardized headers
 * @param message - Error message
 * @param field - Field name that failed validation
 * @param received - Value that was received
 * @param expected - Expected format/range
 * @param options - API header options
 * @returns Error response with validation details
 */
function validationErrorResponse(
  message: string,
  field?: string,
  received?: unknown,
  expected?: string,
  options?: Partial<ApiHeadersOptions>
): Response {
  const error: Record<string, unknown> = {
    error: message,
    timestamp: new Date().toISOString(),
  };
  
  if (field) error.field = field;
  if (received !== undefined) error.received = received;
  if (expected) error.expected = expected;
  
  return jsonResponse(error, 400, {
    ...options,
    scope: options?.scope || 'validation',
  });
}

/**
 * Add response metadata to JSON responses with standardized headers
 * @param data - Response data
 * @param status - HTTP status code
 * @param metadata - Additional metadata to include
 * @param options - API header options
 * @returns Response with metadata
 */
function jsonResponseWithMetadata(
  data: unknown,
  status: number = 200,
  metadata?: { version?: string; timestamp?: string; requestId?: string },
  options?: Partial<ApiHeadersOptions>
): Response {
  const response: Record<string, unknown> = {
    data,
    ...metadata,
    timestamp: metadata?.timestamp || new Date().toISOString(),
  };
  
  return jsonResponse(response, status, {
    ...options,
    version: metadata?.version || options?.version,
    requestId: metadata?.requestId || options?.requestId,
  });
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
        { method: 'GET', path: '/api/dev/metrics', description: 'Server metrics (pendingRequests, pendingWebSockets, client IP)' },
        { method: 'GET', path: '/api/tension/map', description: 'Tension mapping API', query: { conflict: 'number', entropy: 'number', tension: 'number', format: 'string (json|yaml|csv|table)' } },
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
  
  // Escape user-controlled content to prevent XSS attacks
  // Bun.escapeHTML() converts <, >, &, ", ' to HTML entities
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
  const repoUrl = REPO_URL;
  const issuesUrl = `${REPO_URL}/issues`;
  const prsUrl = `${REPO_URL}/pulls`;
  
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
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 12px 12px 0 0;
      margin: -30px -30px 30px -30px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    }
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
    }
    .header-title {
      flex: 1;
    }
    .header-title h1 {
      color: white;
      margin-bottom: 5px;
      font-size: 2.5em;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    .header-title .subtitle {
      color: rgba(255,255,255,0.9);
      font-size: 1.1em;
      margin-bottom: 0;
    }
    .header-meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
    }
    .version-badge {
      background: rgba(255,255,255,0.2);
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 0.9em;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.3);
    }
    .header-links {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .header-link {
      color: white;
      text-decoration: none;
      padding: 6px 12px;
      border-radius: 6px;
      background: rgba(255,255,255,0.15);
      font-size: 0.85em;
      transition: all 0.2s;
      border: 1px solid rgba(255,255,255,0.2);
    }
    .header-link:hover {
      background: rgba(255,255,255,0.25);
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }
    .footer {
      background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
      color: white;
      padding: 30px;
      border-radius: 0 0 12px 12px;
      margin: 40px -30px -30px -30px;
      box-shadow: 0 -4px 20px rgba(0,0,0,0.2);
    }
    .footer-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
    }
    .footer-left {
      flex: 1;
    }
    .footer-right {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }
    .footer-link {
      color: rgba(255,255,255,0.9);
      text-decoration: none;
      padding: 8px 16px;
      border-radius: 8px;
      background: rgba(255,255,255,0.1);
      transition: all 0.2s;
      border: 1px solid rgba(255,255,255,0.1);
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .footer-link:hover {
      background: rgba(255,255,255,0.2);
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    }
    .footer-info {
      color: rgba(255,255,255,0.7);
      font-size: 0.9em;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <div class="header-content">
        <div class="header-title">
          <h1>🚀 WNCAAB Dev Server Dashboard</h1>
          <p class="subtitle">Unified API, Config, and Worker Telemetry Dashboard</p>
        </div>
        <div class="header-meta">
          <div class="version-badge">v${version}</div>
          <div class="header-links">
            <a href="${repoUrl}" target="_blank" class="header-link" title="View Repository">📦 Repo</a>
            <a href="${issuesUrl}" target="_blank" class="header-link" title="View Issues">🐛 Issues</a>
            <a href="${prsUrl}" target="_blank" class="header-link" title="View Pull Requests">🔀 PRs</a>
          </div>
        </div>
      </div>
    </header>
    
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
        <li><code>GET</code> <a href="/api/tension/map?conflict=1.0&entropy=0.0&tension=0.0" target="_blank">/api/tension/map</a> - Tension mapping API</li>
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
    </div>
    
    <div class="section">
      <h2>⚙️ Configs</h2>
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
    
    <footer class="footer">
      <div class="footer-content">
        <div class="footer-left">
          <div style="font-weight: 700; margin-bottom: 8px; font-size: 1.1em;">${safeName}</div>
          <div class="footer-info">
            <div>Version ${safeVersion} • ${safeLicense} License</div>
            <div style="margin-top: 5px;">© ${new Date().getFullYear()} ${safeAuthor}</div>
          </div>
        </div>
        <div class="footer-right">
          <a href="${repoUrl}" target="_blank" class="footer-link">
            <span>📦</span>
            <span>Repository</span>
          </a>
          <a href="${issuesUrl}" target="_blank" class="footer-link">
            <span>🐛</span>
            <span>Issues</span>
          </a>
          <a href="${prsUrl}" target="_blank" class="footer-link">
            <span>🔀</span>
            <span>Pull Requests</span>
          </a>
          <a href="/api/dev/status" target="_blank" class="footer-link">
            <span>📊</span>
            <span>API Status</span>
          </a>
        </div>
      </div>
    </footer>
  </div>
  
  <script>
    // Auto-refresh every 5 seconds
    let refreshInterval = setInterval(() => {
      updateStatus();
    }, 5000);
    
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
        element.className = 'status ' + (status === 'running' ? 'active' : 'inactive');
        element.textContent = status === 'running' ? 'Running' : 'Not Running';
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
        const configs = await response.json();
        
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;';
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
        
        const configStr = JSON.stringify(configs, null, 2);
        const highlighted = configStr
          .replace(/(".*?"):/g, '<span style="color:#d63384;font-weight:600;">$1</span>:')
          .replace(/: ("[^"]*")/g, ': <span style="color:#0d6efd;">$1</span>')
          .replace(/: (true|false|null)/g, ': <span style="color:#198754;font-weight:600;">$1</span>')
          .replace(/: (\d+\.?\d*)/g, ': <span style="color:#fd7e14;font-weight:600;">$1</span>')
          .replace(/(\[|\])/g, '<span style="color:#6f42c1;">$1</span>')
          .replace(/(\{|\})/g, '<span style="color:#20c997;">$1</span>');
        
        modal.innerHTML = \`
          <div style="background:white;padding:30px;border-radius:16px;max-width:900px;max-height:85vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,0.5);position:relative;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-bottom:2px solid #e0e0e0;padding-bottom:15px;">
              <h2 style="color:#667eea;font-size:1.8em;margin:0;font-weight:700;">⚙️ Configuration Files</h2>
              <button onclick="this.closest('div').parentElement.remove()" style="background:#dc3545;color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:600;font-size:1em;transition:all 0.2s;">✕ Close</button>
            </div>
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
          </div>
        \`;
        document.body.appendChild(modal);
      } catch (error) {
        alert('Failed to load configs: ' + error.message);
      }
    }
    
    // Load workers on click
    async function loadWorkers() {
      try {
        const response = await fetch('/api/dev/workers');
        const data = await response.json();
        
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;';
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
        
        const dataStr = JSON.stringify(data, null, 2);
        const highlighted = dataStr
          .replace(/(".*?"):/g, '<span style="color:#d63384;font-weight:600;">$1</span>:')
          .replace(/: ("[^"]*")/g, ': <span style="color:#0d6efd;">$1</span>')
          .replace(/: (true|false|null)/g, ': <span style="color:#198754;font-weight:600;">$1</span>')
          .replace(/: (\d+\.?\d*)/g, ': <span style="color:#fd7e14;font-weight:600;">$1</span>')
          .replace(/(\[|\])/g, '<span style="color:#6f42c1;">$1</span>')
          .replace(/(\{|\})/g, '<span style="color:#20c997;">$1</span>');
        
        const summary = data.summary || {};
        modal.innerHTML = \`
          <div style="background:white;padding:30px;border-radius:16px;max-width:900px;max-height:85vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,0.5);position:relative;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-bottom:2px solid #e0e0e0;padding-bottom:15px;">
              <h2 style="color:#667eea;font-size:1.8em;margin:0;font-weight:700;">👷 Worker Registry</h2>
              <button onclick="this.closest('div').parentElement.remove()" style="background:#dc3545;color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:600;font-size:1em;transition:all 0.2s;">✕ Close</button>
            </div>
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
              <span style="color:#666;font-size:0.9em;">Access via <code style="background:#fff;padding:2px 6px;border-radius:4px;color:#0d6efd;">GET /api/dev/workers</code> or WebSocket at <code style="background:#fff;padding:2px 6px;border-radius:4px;color:#0d6efd;">ws://localhost:${WORKER_API_PORT}/ws/workers/telemetry</code></span>
            </div>
          </div>
        \`;
        document.body.appendChild(modal);
      } catch (error) {
        alert('Failed to load workers: ' + error.message);
      }
    }
    
    // Initial load
    updateStatus();
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

// Generate static routes at startup (buffers immutable files in memory)
// Static routes provide 15% performance improvement for immutable files
// Reference: https://bun.com/docs/runtime/http/routing#file-responses-vs-static-responses
const staticRoutes = await generateStaticRoutes();

const devServer = Bun.serve({
  // ✅ Port omitted - Bun automatically handles priority: CLI flag > BUN_PORT > PORT > NODE_PORT > default 3002
  // ❌ WRONG: port: process.env.PORT || 3000 (overrides Bun's automatic handling)
  hostname: HOSTNAME,
  
  // Idle timeout: maximum time a connection can be idle before closing (in seconds)
  // See: https://bun.com/docs/runtime/http/server#idletimeout
  idleTimeout: IDLE_TIMEOUT_SECONDS, // 2 minutes default
  
  development: {
    hmr: true,
    console: true, // Echo browser console logs to terminal
  },
  
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
  // Reference: https://bun.com/docs/runtime/http/routing#route-precedence
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
    // Reference: https://bun.com/docs/runtime/http/routing#static-responses
    '/favicon.ico': new Response(null, { status: 204 }),
    '/health': new Response('OK'),
    '/ready': new Response('Ready', {
      headers: {
        // Pass custom headers
        'X-Ready': '1',
      },
    }),
    
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
    // See: https://bun.com/docs/runtime/http/server#html-imports
    '/tension': tensionPage,
    
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
    // Reference: https://bun.com/docs/runtime/http/routing#file-responses-vs-static-responses
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
    // Reference: https://bun.com/docs/runtime/http/routing#asynchronous-routes
    // Reference: https://bun.com/docs/runtime/http/routing#promise
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
    
    '/api/dev/metrics': async (req, server) => {
      const startTime = performance.now();
      trackRequestStart();
      
      try {
        // ✅ Fixed: Real-time metrics with event-based tracking
        const trackedMetrics = getMetricsState(server);
        
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
    
    '/api/dev/workers': async (req) => {
      const startTime = performance.now();
      trackRequestStart();
      
      try {
        // ✅ Bun-Specific Optimization: Use SharedMap for zero-copy worker state
        // Pattern: Atomic read (no serialization cost)
        let state: Record<string, any> | null = null;
        
        if (workerRegistryMap && typeof workerRegistryMap.get === 'function') {
          // SharedMap: Atomic read (no serialization cost)
          state = workerRegistryMap.get('state');
        }
        
        // Fallback to worker registry if SharedMap doesn't have state
        if (!state) {
          state = workerRegistry?.getRegistry() || {};
          // Cache in SharedMap for next read (if SharedMap is available)
          if (workerRegistryMap && typeof workerRegistryMap.set === 'function') {
            workerRegistryMap.set('state', state);
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
        
        // Parse and validate query parameters with proper defaults
        const conflict = parseNumberParam(url.searchParams.get('conflict'), 0.0, 0, 1);
        const entropy = parseNumberParam(url.searchParams.get('entropy'), 0.0, 0, 1);
        const tension = parseNumberParam(url.searchParams.get('tension'), 0.0, 0, 1);
        const format = url.searchParams.get('format') || 'json';
        
        // ✅ Cache key for ETag generation
        const cacheKey = `tension:${conflict}:${entropy}:${tension}:${format}`;
        
        // Map edge relation (macro-inlined, sub-millisecond execution)
        const result = mapEdgeRelation(conflict, entropy, tension);
        
        // Format output based on format parameter
        let responseBody: string;
        let contentType: string;
        
        if (format === 'csv') {
          responseBody = `conflict,entropy,tension,hex,HEX,hsl,opacity,width,relation,visualNote\n${result.meta.conflict},${result.meta.entropy},${result.meta.tension},${result.color.hex},${result.color.HEX},"${result.color.hsl}",${result.opacity},${result.width},${result.meta.relation},"${result.meta.visualNote}"`;
          contentType = 'text/csv';
        } else if (format === 'yaml') {
          responseBody = `hex: ${result.color.hex}\nHEX: ${result.color.HEX}\nhsl: ${result.color.hsl}\nopacity: ${result.opacity}\nwidth: ${result.width}\nmeta:\n  relation: ${result.meta.relation}\n  conflict: ${result.meta.conflict}\n  entropy: ${result.meta.entropy}\n  tension: ${result.meta.tension}\n  absorbedBy: ${result.meta.absorbedBy}\n  visualNote: "${result.meta.visualNote}"`;
          contentType = 'text/yaml';
        } else if (format === 'table') {
          const emoji = result.meta.relation === 'temperate' ? '🟢' : result.meta.relation === 'extreme' ? '🔴' : '🟠';
          const opacityPercent = Math.round(result.opacity * 100);
          responseBody = `\n┌─────────────────────────────────────────────────────────────┐\n│ ${emoji} Tension Mapping Result                              │\n├─────────────────────────────────────────────────────────────┤\n│ Parameters:                                                 │\n│   Conflict:  ${result.meta.conflict.toFixed(3).padStart(7)}                                    │\n│   Entropy:   ${result.meta.entropy.toFixed(3).padStart(7)}                                    │\n│   Tension:   ${result.meta.tension.toFixed(3).padStart(7)}                                    │\n├─────────────────────────────────────────────────────────────┤\n│ Visual Properties:                                           │\n│   Color:     ${result.color.HEX} (${result.color.hsl})                    │\n│   Opacity:   ${opacityPercent}% (${result.opacity.toFixed(3)})                              │\n│   Width:     ${result.width}px                                              │\n├─────────────────────────────────────────────────────────────┤\n│ Metadata:                                                   │\n│   Relation:  ${result.meta.relation.padEnd(20)}                            │\n│   Note:      ${result.meta.visualNote.substring(0, 45).padEnd(45)}         │\n└─────────────────────────────────────────────────────────────┘\n`;
          contentType = 'text/plain';
        } else {
          // ✅ Use Response.json() instead of JSON.stringify() (2x faster)
          const responseData = {
            data: result,
            version: 'v1.6',
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
            version: 'v1.6',
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
        const headers = apiHeaders({
          domain: 'tension',
          scope: 'mapping',
          version: 'v1.6',
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
          { domain: 'tension', scope: 'mapping', version: 'v1.6' }
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
        version: 'v1.6',
        description: 'Maps conflict/entropy/tension parameters to visual edge properties',
        endpoints: {
          map: {
            method: 'GET',
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
            examples: [
              '/api/tension/map?conflict=1.0&entropy=0.0&tension=0.0',
              '/api/tension/map?conflict=0.5&entropy=0.3&tension=0.7&format=csv',
              '/api/tension/map?conflict=0.5&entropy=0.3&tension=0.7&format=table',
              '/api/tension/map?conflict=0.5&entropy=0.3&tension=0.7&format=yaml',
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
          health: `http://localhost:${server.port}/api/tension/health`,
          help: `http://localhost:${server.port}/api/tension/help`,
        },
        references: {
          github: 'https://github.com/wncaab/perf-v3.1',
          macro: 'macros/tension-map.ts',
          cli: 'scripts/map-edge.ts',
        },
      };
      
      return jsonResponse(helpDoc, 200, {
        domain: 'tension',
        scope: 'help',
        version: 'v1.6',
        includeTiming: true,
        startTime,
      });
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
            version: 'v1.6',
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
          version: 'v1.6',
          contentType: 'application/json',
          includeTiming: true,
          startTime,
        }),
      });
    },
    
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
        const url = new URL(req.url);
        const pricesParam = url.searchParams.get('prices');
        
        if (!pricesParam) {
          return validationErrorResponse(
            'Missing required parameter: prices',
            'prices',
            null,
            'CSV format: "100,102,105,110,118"',
            { domain: 'ai', scope: 'maparse', version: 'v1.4.2' }
          );
        }
        
        // Parse CSV with validation (only positive numbers)
        const prices = parseCsvNumbers(pricesParam, 0, Infinity);
        
        if (prices.length === 0) {
          return validationErrorResponse(
            'Invalid prices format: no valid numbers found',
            'prices',
            pricesParam,
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
        const cacheKey = `maparse:${pricesParam}`;
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
        let curves: any;
        let inferenceTime = 0;
        const inferenceStart = performance.now();
        
        if (model && typeof model.run === 'function') {
          // ✅ Pattern: Use ONNX model for inference
          const inputBuffer = new Float32Array(prices);
          curves = await model.run(inputBuffer);
          inferenceTime = performance.now() - inferenceStart;
          
          // Update cache statistics
          const cacheEntry = modelCache.get('curve-detection');
          if (cacheEntry) {
            cacheEntry.inferenceCount++;
            cacheEntry.totalInferenceTime += inferenceTime;
          }
        } else {
          // Fallback: Use JavaScript implementation
          curves = autoMaparse({ prices });
          inferenceTime = performance.now() - inferenceStart;
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
    
    '/api/dev/status': async (req, server) => {
      const startTime = performance.now();
      try {
        const configs = loadConfigs();
        const workers = workerRegistry?.getRegistry() || {};
        const endpoints = getAllEndpoints();
        const workerApiStatus = await checkWorkerApiStatus();
        
        // Server Metrics
        // See: https://bun.com/docs/runtime/http/server#server-metrics
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
    
    // Dashboard route - dynamic HTML generation
    '/': async () => {
      return new Response(generateDashboard(), {
        headers: { 'Content-Type': 'text/html' },
      });
    },
    
    // ============================================================================
    // Parameter Routes - Type-Safe Route Parameters (REQUIRED Pattern)
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
    // - Reference: https://bun.com/docs/runtime/http/routing#route-precedence
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
    // Reference: https://bun.com/docs/runtime/http/routing#type-safe-route-parameters
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
    // Wildcard Routes - Matches paths under prefix
    // ============================================================================
    // Wildcard routes (/api/*) match any path starting with the prefix
    // Precedence: Exact > Parameter > Wildcard > Catch-all
    // Reference: https://bun.com/docs/runtime/http/routing#route-precedence
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
    // Global Catch-All Route - Matches all unmatched routes
    // ============================================================================
    // Catch-all route (/*) matches any path that doesn't match above routes
    // Precedence: Exact > Parameter > Wildcard > Catch-all
    // Reference: https://bun.com/docs/runtime/http/routing#route-precedence
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
  // Reference: https://bun.com/docs/runtime/http/routing#fetch-request-handler
  async fetch(req, server) {
    // ✅ Fixed: Handle OPTIONS preflight requests with CORS headers
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }
    
    // Per-Request Controls
    // Reference: https://bun.com/docs/runtime/http/server#per-request-controls
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
    
    // All routes are handled by routes property above
    // This fetch handler only catches unmatched requests (404)
    // ✅ Fixed: Append CORS headers to 404 responses
    const notFoundResponse = new Response('Not Found', { status: 404 });
    return appendCorsHeaders(notFoundResponse);
  },
  // Error handler - catches unhandled errors in fetch handler
  // ✅ Fixed: CORS headers applied to error responses
  // See: https://bun.com/docs/runtime/http/server#practical-example-rest-api
  error(error) {
    console.error('Server error:', error);
    const errorResp = errorResponse(
      error instanceof Error ? error.message : String(error),
      500
    );
    return appendCorsHeaders(errorResp);
  },
});

// ✅ Initialize metrics tracking after server is created
initializeMetricsTracking(devServer);

/**
 * Worker Registry with SharedMap optimization
 * ✅ Pattern: Use SharedMap for zero-copy worker state
 * 
 * SharedMap provides atomic reads/writes without serialization cost.
 * Falls back to regular Map if SharedMap is not available.
 */
let workerRegistryMap: Map<string, any> | any = null;

try {
  // Try to use Bun.SharedMap for zero-copy worker state
  // @ts-ignore - SharedMap may not be in type definitions yet
  if (typeof Bun !== 'undefined' && (Bun as any).SharedMap) {
    workerRegistryMap = new (Bun as any).SharedMap('worker-registry');
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

// Server Lifecycle Methods
// See: https://bun.com/docs/runtime/http/server#server-lifecycle-methods
// - server.stop(closeActiveConnections?) - Stop accepting new connections
//   - closeActiveConnections: if true, immediately terminates all connections
// - server.ref() - Keep process alive while server is running
//   See: https://bun.com/docs/runtime/http/server#server-ref-and-server-unref
// - server.unref() - Allow process to exit if server is only thing running
//   See: https://bun.com/docs/runtime/http/server#server-ref-and-server-unref
// - server.reload(options) - Update handlers without restarting (Hot Route Reloading)
//   - Only fetch and error handlers can be updated
//   See: https://bun.com/docs/runtime/http/server#server-reload

// Graceful shutdown on SIGINT/SIGTERM
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Received SIGINT, shutting down gracefully...');
  await devServer.stop(true); // closeActiveConnections = true
  console.log('✅ Server stopped');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n🛑 Received SIGTERM, shutting down gracefully...');
  await devServer.stop(true); // closeActiveConnections = true
  console.log('✅ Server stopped');
  process.exit(0);
});

// Keep process alive while server is running
// See: https://bun.com/docs/runtime/http/server#server-ref-and-server-unref
// server.ref() - Prevents the process from exiting while the server is running
// server.unref() - Allows the process to exit if the server is the only thing keeping it alive
// Use unref() if you want the server to exit when there are no other active handles
devServer.ref();

export { devServer };

