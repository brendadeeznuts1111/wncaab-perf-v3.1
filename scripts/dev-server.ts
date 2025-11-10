/**
 * Dev Server - Unified API Dashboard (v2.0.0)
 * 
 * Now using Bun's native routing system with full route precedence support:
 * - Routes property handles all routing (static, file, async handlers, parameter routes)
 * - Fetch handler only handles unmatched requests (404)
 * - Route precedence: Exact > Parameter > Wildcard > Catch-all
 *   Reference: https://bun.com/docs/runtime/http/routing#route-precedence
 * 
 * Routing Architecture:
 * 1. Static Responses - Zero-allocation dispatch (15% performance improvement)
 *    - /favicon.ico, /health, /ready
 *    - Reference: https://bun.com/docs/runtime/http/routing#static-responses
 * 
 * 2. HTML Imports - Automatic asset bundling with HMR
 *    - /tension, /tension-map
 *    - Development (bun --hot): Assets bundled on-demand at runtime with HMR
 *    - Production (bun build --target=bun): Resolves to pre-built manifest object
 *    - Reference: https://bun.com/docs/runtime/http/server#html-imports
 * 
 * 3. File Routes - Generated from static-routes.ts manifest
 *    - All static files defined in scripts/static-routes.ts
 *    - Security: Only files in manifest are served (path traversal impossible)
 *    - Performance: Exact routes = O(1) lookup (fastest possible)
 *    - Maintainability: Add new files by editing static-routes.ts manifest
 *    - Built-in 404 handling, Last-Modified support, Range request support
 *    - Reference: https://bun.com/docs/runtime/http/routing#file-responses-vs-static-responses
 * 
 * 4. Async Route Handlers - All API routes in routes property
 *    - /api/dev/endpoints, /api/dev/metrics, /api/dev/configs, /api/dev/workers, /api/dev/status
 *    - /api/tension/map, /api/gauge/womens-sports, /api/ai/maparse, /api/validate/threshold
 *    - / (dashboard)
 *    - Reference: https://bun.com/docs/runtime/http/routing#asynchronous-routes
 * 
 * 5. Parameter Routes - Type-safe route parameters
 *    - /api/dev/:endpoint (extensible API routing)
 *    - TypeScript type inference via BunRequest<'/api/dev/:endpoint'>
 *    - Reference: https://bun.com/docs/runtime/http/routing#type-safe-route-parameters
 * 
 * 6. Fetch Handler - Only handles unmatched requests
 *    - OPTIONS preflight requests
 *    - 404 for unmatched routes
 *    - Per-request controls (logging, timeout)
 *    - Reference: https://bun.com/docs/runtime/http/routing#fetch-request-handler
 * 
 * Server Features:
 * - Configurable port/hostname via environment variables (BUN_PORT, PORT, NODE_PORT, HOSTNAME)
 * - Idle timeout configuration (IDLE_TIMEOUT env var, defaults to 120 seconds)
 * - Graceful shutdown on SIGINT/SIGTERM
 * - Hot route reloading support via server.reload()
 * - Server lifecycle methods: stop(), ref(), unref(), reload()
 *   - See: https://bun.com/docs/runtime/http/server#server-lifecycle-methods
 *   - See: https://bun.com/docs/runtime/http/server#server-ref-and-server-unref
 *   - See: https://bun.com/docs/runtime/http/server#server-reload
 *   - See: https://bun.com/docs/runtime/http/server#idletimeout
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
 * Route Types Summary:
 * - Static responses: Zero-allocation dispatch, cached for server lifetime
 * - File routes: Filesystem reads per request, built-in 404, Range support
 * - HTML imports: Automatic asset bundling with HMR in development
 * - Async handlers: Promise<Response> support, server object available
 * - Parameter routes: Type-safe params via BunRequest<T>, automatic decoding
 * 
 * Aggregates all APIs, configs, and worker telemetry:
 * - GET  /api/dev/endpoints      → All API endpoints
 * - GET  /api/dev/configs        → All configs (bunfig.toml, bun-ai.toml)
 * - GET  /api/dev/workers        → Worker telemetry
 * - GET  /api/dev/status         → Overall system status
 * - GET  /api/dev/metrics        → Server metrics (pendingRequests, pendingWebSockets)
 * - GET  /api/tension/map        → Tension mapping API
 * - GET  /tension                → Tension mapping visualization (HTML imported from templates/tension.html)
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

// HTML file import using Bun's native HTML loader
// Development (bun --hot): Assets bundled on-demand at runtime with HMR
// Production (bun build --target=bun): Resolves to pre-built manifest object
// See: https://bun.com/docs/runtime/http/server#html-imports
import tensionPage from '../templates/tension.html';

// Direct imports using Bun's native loaders
// TOML files - Bun auto-detects .toml extension, parsed at import time
let bunfigConfig: any = null;
let bunAiConfig: any = null;

try {
  // Bun automatically uses TOML loader for .toml files
  bunfigConfig = await import('../bunfig.toml');
} catch (error) {
  // Fallback to runtime loading if import fails
  try {
    const bunfigText = await Bun.file('bunfig.toml').text();
    bunfigConfig = Bun.TOML.parse(bunfigText);
  } catch (e) {
    bunfigConfig = { error: 'Not found or invalid' };
  }
}

try {
  // Bun automatically uses TOML loader for .toml files
  bunAiConfig = await import('../bun-ai.toml');
} catch (error) {
  // Fallback to runtime loading if import fails
  try {
    const bunAiText = await Bun.file('bun-ai.toml').text();
    bunAiConfig = Bun.TOML.parse(bunAiText);
  } catch (e) {
    bunAiConfig = { error: 'Not found or invalid' };
  }
}

// JSON files - parsed at import time, zero runtime cost
let packageInfo: { version?: string; name?: string; description?: string; author?: string; license?: string } = {};

try {
  packageInfo = await import('../package.json');
} catch (error) {
  // Fallback to runtime loading
  try {
    const pkg = await Bun.file('../package.json').json();
    packageInfo = pkg;
  } catch (e) {
    packageInfo = { version: '3.1.0', name: 'wncaab-perf-v3.1', description: 'WNCAAB Performance Metrics & Visualization', author: 'WNCAAB Syndicate', license: 'MIT' };
  }
}

// Worker registry (optional - will be null if worker API not running)
let workerRegistry: any = null;
let workerApiAvailable = false;

// Try to import worker registry (may fail if worker API not running)
// Note: Importing worker-telemetry-api.ts will start a server on port 3000
(async () => {
  try {
    const workerModule = await import('./worker-telemetry-api.ts');
    workerRegistry = workerModule.registry;
    workerApiAvailable = true;
    console.log('✅ Worker API registry connected');
  } catch (error) {
    workerRegistry = null;
    workerApiAvailable = false;
    console.warn('⚠️  Worker API not available - worker features disabled');
  }
})();

// Check if worker API is actually running
async function checkWorkerApiStatus(): Promise<'running' | 'not running'> {
  if (!workerApiAvailable) {
    return 'not running';
  }
  
  try {
    // Try to fetch from worker API to verify it's actually running
    const response = await fetch('http://localhost:3000/api/workers/registry', {
      signal: AbortSignal.timeout(1000), // 1 second timeout
    });
    return response.ok ? 'running' : 'not running';
  } catch (error) {
    return 'not running';
  }
}

// CORS headers helper function
// Returns consistent CORS headers for all API responses
function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// Load configs - now using direct imports (zero runtime cost)
function loadConfigs() {
  return {
    bunfig: bunfigConfig || { error: 'Not found or invalid' },
    'bun-ai': bunAiConfig || { error: 'Not found or invalid' },
  };
}

// Collect all API endpoints
function getAllEndpoints() {
  return {
    worker: {
      base: 'http://localhost:3000',
      endpoints: [
        { method: 'GET', path: '/api/workers/registry', description: 'Live worker state' },
        { method: 'POST', path: '/api/workers/scale', description: 'Manual worker scaling', body: { count: 'number' } },
        { method: 'GET', path: '/api/workers/snapshot/:id', description: 'Download heap snapshot' },
        { method: 'WS', path: '/ws/workers/telemetry', description: 'Live telemetry stream' },
      ],
    },
    spline: {
      base: 'http://localhost:3001',
      endpoints: [
        { method: 'GET', path: '/api/spline/render', description: 'Render spline path', query: { points: 'number', type: 'string', tension: 'number' } },
        { method: 'POST', path: '/api/spline/predict', description: 'Predict next points', body: { path: 'array', horizon: 'number' } },
        { method: 'POST', path: '/api/spline/preset/store', description: 'Store preset', body: { name: 'string', config: 'object', vaultSync: 'boolean' } },
        { method: 'WS', path: '/ws/spline-live', description: 'Live spline streaming' },
      ],
    },
    dev: {
      base: 'http://localhost:3002',
      endpoints: [
        { method: 'GET', path: '/api/dev/endpoints', description: 'List all API endpoints' },
        { method: 'GET', path: '/api/dev/configs', description: 'Show all configs' },
        { method: 'GET', path: '/api/dev/workers', description: 'Worker telemetry' },
        { method: 'GET', path: '/api/dev/status', description: 'System status' },
        { method: 'GET', path: '/api/dev/metrics', description: 'Server metrics (pendingRequests, pendingWebSockets, client IP)' },
        { method: 'GET', path: '/api/tension/map', description: 'Tension mapping API', query: { conflict: 'number', entropy: 'number', tension: 'number' } },
        { method: 'GET', path: '/tension', description: 'Tension mapping visualization' },
        { method: 'GET', path: '/api/gauge/womens-sports', description: 'WNBATOR 5D tensor gauge', query: { oddsSkew: 'number', volumeVelocity: 'number', volatilityEntropy: 'number', timeDecay: 'number', momentumCurvature: 'number' } },
        { method: 'GET', path: '/api/ai/maparse', description: 'AI auto-maparse curve detection', query: { prices: 'string (CSV)' } },
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
  const workerEndpoints = endpoints.worker.endpoints.map(e => 
    `<li><code>${e.method}</code> <a href="${endpoints.worker.base}${e.path}" target="_blank">${e.path}</a> - ${e.description}</li>`
  ).join('\n');
  
  const splineEndpoints = endpoints.spline.endpoints.map(e => 
    `<li><code>${e.method}</code> <a href="${endpoints.spline.base}${e.path}" target="_blank">${e.path}</a> - ${e.description}</li>`
  ).join('\n');
  
  const devEndpoints = endpoints.dev.endpoints.map(e => 
    `<li><code>${e.method}</code> <a href="${endpoints.dev.base}${e.path}">${e.path}</a> - ${e.description}</li>`
  ).join('\n');
  
  const version = packageInfo.version || '3.1.0';
  const repoUrl = 'https://github.com/wncaab/perf-v3.1'; // Update with actual repo URL
  const issuesUrl = `${repoUrl}/issues`;
  const prsUrl = `${repoUrl}/pulls`;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${packageInfo.description || 'WNCAAB Dev Server Dashboard - Unified API, Config, and Worker Telemetry'}">
  <meta name="author" content="${packageInfo.author || 'WNCAAB Syndicate'}">
  <meta name="keywords" content="wncaab, dev server, dashboard, api, telemetry, performance">
  <meta name="robots" content="index, follow">
  <meta property="og:title" content="WNCAAB Dev Server Dashboard v${version}">
  <meta property="og:description" content="${packageInfo.description || 'Unified API, Config, and Worker Telemetry Dashboard'}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="WNCAAB Dev Server Dashboard">
  <meta name="twitter:description" content="${packageInfo.description || 'Unified API, Config, and Worker Telemetry Dashboard'}">
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
            <a href="http://localhost:3000/ws/workers/telemetry" target="_blank" class="btn-link">🔌 WebSocket Stream →</a>
            <a href="http://localhost:3000/api/workers/registry" target="_blank" class="btn-link">🔗 Registry API →</a>
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
          <div style="font-weight: 700; margin-bottom: 8px; font-size: 1.1em;">${packageInfo.name || 'WNCAAB Perf v3.1'}</div>
          <div class="footer-info">
            <div>Version ${version} • ${packageInfo.license || 'MIT'} License</div>
            <div style="margin-top: 5px;">© ${new Date().getFullYear()} ${packageInfo.author || 'WNCAAB Syndicate'}</div>
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
              <span style="color:#666;font-size:0.9em;">Access via <code style="background:#fff;padding:2px 6px;border-radius:4px;color:#0d6efd;">GET /api/dev/workers</code> or WebSocket at <code style="background:#fff;padding:2px 6px;border-radius:4px;color:#0d6efd;">ws://localhost:3000/ws/workers/telemetry</code></span>
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

// Generate Tension Mapping Visualization Page
// Now using Bun's native HTML import - HTML file is imported above
// In development, this automatically bundles assets and enables HMR
// The imported HTML can be used directly as a route or in responses
function generateTensionPage() {
  // In development, tensionPage is a route that auto-bundles assets
  // In production, it's a manifest object
  // For manual serving, we can use it directly
  return tensionPage;
}

// Dev Server
// Port configuration: supports BUN_PORT, PORT, NODE_PORT env vars, or defaults to 3002
// See: https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname
// See: https://bun.com/docs/runtime/http/server#configuring-a-default-port
const devServer = Bun.serve({
  port: parseInt(process.env.BUN_PORT || process.env.PORT || process.env.NODE_PORT || '3002', 10),
  hostname: process.env.HOSTNAME || '0.0.0.0', // defaults to "0.0.0.0"
  
  // Idle timeout: maximum time a connection can be idle before closing (in seconds)
  // See: https://bun.com/docs/runtime/http/server#idletimeout
  idleTimeout: parseInt(process.env.IDLE_TIMEOUT || '120', 10), // 2 minutes default
  
  development: {
    hmr: true,
    console: true, // Echo browser console logs to terminal
  },
  
  // Routes property - Bun's native routing system
  // Routes are matched in order of specificity: Exact > Parameter > Wildcard > Catch-all
  // Reference: https://bun.com/docs/runtime/http/routing#route-precedence
  routes: {
    // 1. Exact static routes (highest priority)
    // Static responses - zero allocation after initialization
    // Reference: https://bun.com/docs/runtime/http/routing#static-responses
    '/favicon.ico': new Response(null, { status: 204 }),
    '/health': new Response('OK'),
    '/ready': new Response('Ready', {
      headers: { 'X-Ready': '1' },
    }),
    
    // HTML imports - automatically bundles assets in development
    // In development: bundles on-demand with HMR
    // In production: uses pre-built manifest from bun build --target=bun
    // See: https://bun.com/docs/runtime/http/server#html-imports
    '/tension': tensionPage,
    '/tension-map': tensionPage,
    
    // File routes - generated from static-routes.ts manifest (immutable manifest)
    // Security: Only files in manifest are served (path traversal impossible)
    // Performance: Exact routes = O(1) lookup (fastest possible)
    // Maintainability: Add new files in static-routes.ts manifest
    // Reference: https://bun.com/docs/runtime/http/routing#file-responses-vs-static-responses
    ...Object.fromEntries(
      generateStaticRoutes().map(r => [r.path, r.handler])
    ),
    
    // 2. Dynamic API routes
    // API Routes - async handlers in routes property
    // Reference: https://bun.com/docs/runtime/http/routing#asynchronous-routes
    '/api/dev/endpoints': async () => {
      return Response.json(getAllEndpoints(), {
        headers: corsHeaders(),
      });
    },
    
    '/api/dev/metrics': async (req, server) => {
      // Note: server object available as second parameter
      const metrics = {
        timestamp: new Date().toISOString(),
        server: {
          url: server.url.toString(),
          port: server.port,
          hostname: server.hostname,
          development: server.development,
          idleTimeout: server.idleTimeout,
        },
        metrics: {
          // Number of in-flight HTTP requests
          // See: https://bun.com/docs/runtime/http/server#server-pendingrequests-and-server-pendingwebsockets
          pendingRequests: server.pendingRequests,
          // Number of active WebSocket connections
          // See: https://bun.com/docs/runtime/http/server#server-pendingrequests-and-server-pendingwebsockets
          pendingWebSockets: server.pendingWebSockets,
          // WebSocket topic subscriber counts (if WebSocket handlers are configured)
          // See: https://bun.com/docs/runtime/http/server#server-subscribercount-topic
          // Example: subscribers: {
          //   'workers-telemetry': server.subscriberCount('workers-telemetry'),
          //   'spline-live': server.subscriberCount('spline-live'),
          // }
        },
        // Client IP address and port for this request
        // See: https://bun.com/docs/runtime/http/server#server-requestip-request
        // Returns null for closed requests or Unix domain sockets
        client: server.requestIP(req),
      };
      return Response.json(metrics, {
        headers: corsHeaders(),
      });
    },
    
    '/api/dev/configs': async () => {
      const configs = await loadConfigs();
      return Response.json(configs, {
        headers: corsHeaders(),
      });
    },
    
    '/api/dev/workers': async () => {
      const workers = workerRegistry?.getRegistry() || {};
      const summary = {
        total: Object.keys(workers).length,
        idle: Object.values(workers).filter((w: any) => w.status === 'idle').length,
        working: Object.values(workers).filter((w: any) => w.status === 'working').length,
        error: Object.values(workers).filter((w: any) => w.status === 'error').length,
        total_queue_depth: Object.values(workers).reduce((sum: number, w: any) => sum + (w.queue_depth || 0), 0),
      };
      return Response.json({ workers, summary }, {
        headers: corsHeaders(),
      });
    },
    
    '/api/tension/map': async (req) => {
      const url = new URL(req.url);
      const conflict = Math.max(0, Math.min(1, parseFloat(url.searchParams.get('conflict') || '0.0') || 0));
      const entropy = Math.max(0, Math.min(1, parseFloat(url.searchParams.get('entropy') || '0.0') || 0));
      const tension = Math.max(0, Math.min(1, parseFloat(url.searchParams.get('tension') || '0.0') || 0));
      
      const result = mapEdgeRelation(conflict, entropy, tension);
      return Response.json(result, {
        headers: corsHeaders(),
      });
    },
    
    '/api/gauge/womens-sports': async (req) => {
      const url = new URL(req.url);
      const oddsSkew = parseFloat(url.searchParams.get('oddsSkew') || '0.5');
      const volumeVelocity = parseFloat(url.searchParams.get('volumeVelocity') || '25000');
      const volatilityEntropy = parseFloat(url.searchParams.get('volatilityEntropy') || '0.5');
      const timeDecay = parseFloat(url.searchParams.get('timeDecay') || '1800');
      const momentumCurvature = parseFloat(url.searchParams.get('momentumCurvature') || '0.5');
      
      const tensor = { oddsSkew, volumeVelocity, volatilityEntropy, timeDecay, momentumCurvature };
      const result = gaugeWNBATOR(tensor);
      return Response.json(result, {
        headers: corsHeaders(),
      });
    },
    
    '/api/ai/maparse': async (req) => {
      const url = new URL(req.url);
      const pricesParam = url.searchParams.get('prices');
      if (!pricesParam) {
        return Response.json(
          { error: 'Missing prices parameter (CSV format)' },
          { status: 400, headers: corsHeaders() }
        );
      }
      
      const prices = pricesParam.split(',').map(p => parseFloat(p.trim())).filter(p => !isNaN(p));
      if (prices.length === 0) {
        return Response.json(
          { error: 'Invalid prices format' },
          { status: 400, headers: corsHeaders() }
        );
      }
      
      const result = autoMaparse({ prices });
      return Response.json(result, {
        headers: corsHeaders(),
      });
    },
    
    '/api/validate/threshold': async (req) => {
      const url = new URL(req.url);
      const thresholdParam = url.searchParams.get('threshold');
      if (!thresholdParam) {
        return Response.json(
          { error: 'Missing threshold parameter' },
          { status: 400, headers: corsHeaders() }
        );
      }
      
      try {
        const result = validateThreshold(thresholdParam);
        return Response.json(result, {
          headers: corsHeaders(),
        });
      } catch (error) {
        return Response.json(
          { error: error instanceof Error ? error.message : String(error) },
          { status: 400, headers: corsHeaders() }
        );
      }
    },
    
    '/api/dev/status': async (req, server) => {
      try {
        const configs = await loadConfigs();
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
            idleTimeout: server.idleTimeout,
            metrics: {
              pendingRequests: server.pendingRequests,
              pendingWebSockets: server.pendingWebSockets,
            },
          },
          services: {
            worker_api: { port: 3000, status: workerApiStatus },
            spline_api: { port: 3001, status: 'running' },
            dev_api: { port: 3002, status: 'running' },
            tension_api: { port: 3002, status: 'running', path: '/api/tension/map' },
          },
          workers: {
            total: Object.keys(workers).length,
            summary: {
              idle: Object.values(workers).filter((w: any) => w.status === 'idle').length,
              working: Object.values(workers).filter((w: any) => w.status === 'working').length,
              error: Object.values(workers).filter((w: any) => w.status === 'error').length,
            },
          },
          configs: {
            bunfig: configs.bunfig?.error ? 'missing' : 'loaded',
            'bun-ai': configs['bun-ai']?.error ? 'missing' : 'loaded',
          },
          endpoints: {
            total: Object.values(endpoints).reduce((sum: number, api: any) => sum + api.endpoints.length, 0),
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
        
        return Response.json(status, {
          headers: corsHeaders(),
        });
      } catch (error) {
        return Response.json(
          { error: 'Failed to get status', message: error instanceof Error ? error.message : String(error) },
          { status: 500, headers: corsHeaders() }
        );
      }
    },
    
    // Dashboard route - dynamic HTML generation
    '/': async () => {
      return new Response(generateDashboard(), {
        headers: { 'Content-Type': 'text/html' },
      });
    },
    
    // Parameter route - type-safe route parameters
    // Reference: https://bun.com/docs/runtime/http/routing#type-safe-route-parameters
    '/api/dev/:endpoint': (req: BunRequest<'/api/dev/:endpoint'>) => {
      const { endpoint } = req.params;
      
      // Handle parameterized endpoints
      // This provides extensibility for future API endpoints
      return Response.json({
        error: 'Unknown endpoint',
        endpoint,
        available: ['endpoints', 'configs', 'workers', 'status', 'metrics'],
      }, { status: 404, headers: corsHeaders() });
    },
  },
  async fetch(req, server) {
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
    
    // Handle OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }
    
    // All routes are handled by routes property above
    // This fetch handler only catches unmatched requests
    return new Response('Not Found', { status: 404 });
  },
  // Error handler - catches unhandled errors in fetch handler
  // See: https://bun.com/docs/runtime/http/server#practical-example-rest-api
  error(error) {
    console.error('Server error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error', 
      message: error instanceof Error ? error.message : String(error) 
    }, null, 2), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  },
});

console.log(`\n🚀 Dev Server running on ${devServer.url}`);
console.log(`📊 Dashboard: ${devServer.url}/`);
console.log(`\n📡 API Endpoints:`);
console.log(`   GET  /api/dev/endpoints  → All API endpoints`);
console.log(`   GET  /api/dev/configs     → All configs`);
console.log(`   GET  /api/dev/workers    → Worker telemetry`);
console.log(`   GET  /api/dev/status     → System status`);
console.log(`   GET  /api/dev/metrics    → Server metrics (pendingRequests, pendingWebSockets)`);
console.log(`\n💡 Open ${devServer.url} in your browser!`);
console.log(`\n⚙️  Server Configuration:`);
console.log(`   Port: ${devServer.port}`);
console.log(`   Hostname: ${devServer.hostname}`);
console.log(`   Idle Timeout: ${devServer.idleTimeout || 'default'} seconds`);
console.log(`   Development Mode: ${devServer.development ? '✅ Enabled' : '❌ Disabled'}`);

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

