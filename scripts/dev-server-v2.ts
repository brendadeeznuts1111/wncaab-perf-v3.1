/**
 * Dev Server - Unified API Dashboard (v1.5.0)
 * 
 * Now using Bun's HTML loader for automatic asset bundling:
 * - Import HTML files directly (Bun bundles assets automatically)
 * - Automatic hashing and cache busting
 * - Hot module replacement in development
 * - Production manifest for optimized serving
 * 
 * Routes:
 * - GET  /api/dev/endpoints      → All API endpoints
 * - GET  /api/dev/configs        → All configs (bunfig.toml, bun-ai.toml)
 * - GET  /api/dev/workers        → Worker telemetry
 * - GET  /api/dev/status         → Overall system status
 * - GET  /api/tension/map        → Tension mapping API
 * - GET  /tension                → Tension mapping visualization (HTML import)
 * - GET  /                       → HTML dashboard
 */

import { mapEdgeRelation } from '../macros/tension-map.ts';
import { gaugeWNBATOR, formatGaugeResult } from '../macros/womens-sports-gauge.ts';
import { autoMaparse } from '../cli/ai-maparse.ts';
import { validateThreshold } from '../macros/validate-threshold.ts';

// Import HTML files - Bun's HTML loader will bundle assets automatically
// In development: bundles on-the-fly with HMR
// In production: resolves to manifest object for optimized serving
import tensionPage from '../public/index.html' with { type: 'html' };

// Worker registry (optional - will be null if worker API not running)
let workerRegistry: any = null;
let workerApiAvailable = false;

// Try to import worker registry (may fail if worker API not running)
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
    const response = await fetch('http://localhost:3000/api/workers/registry', {
      signal: AbortSignal.timeout(1000),
    });
    return response.ok ? 'running' : 'not running';
  } catch (error) {
    return 'not running';
  }
}

// Load configs
async function loadConfigs() {
  const configs: Record<string, any> = {};
  
  try {
    const bunfig = await Bun.file('bunfig.toml').text();
    configs.bunfig = Bun.TOML.parse(bunfig);
  } catch (error) {
    configs.bunfig = { error: 'Not found or invalid' };
  }
  
  try {
    const bunAi = await Bun.file('bun-ai.toml').text();
    configs['bun-ai'] = Bun.TOML.parse(bunAi);
  } catch (error) {
    configs['bun-ai'] = { error: 'Not found or invalid' };
  }
  
  return configs;
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
        { method: 'GET', path: '/api/tension/map', description: 'Tension mapping API', query: { conflict: 'number', entropy: 'number', tension: 'number' } },
        { method: 'GET', path: '/tension', description: 'Tension mapping visualization' },
      ],
    },
  };
}

// Load package.json for version info
let packageInfo: { version?: string; name?: string; description?: string; author?: string; license?: string } = {};
try {
  const pkg = await Bun.file('../../package.json').json();
  packageInfo = pkg;
} catch (error) {
  try {
    const pkg = await Bun.file('../package.json').json();
    packageInfo = pkg;
  } catch (error2) {
    packageInfo = { version: '3.1.0', name: 'wncaab-perf-v3.1', description: 'WNCAAB Performance Metrics & Visualization', author: 'WNCAAB Syndicate', license: 'MIT' };
  }
}

// Generate HTML dashboard (keeping existing implementation for now)
function generateDashboard() {
  // ... (existing dashboard generation code)
  // This can be refactored to use HTML imports later
  return `<!DOCTYPE html>...`; // Existing implementation
}

// Dev Server using Bun.serve() with routes
const devServer = Bun.serve({
  port: 3002,
  development: {
    hmr: true,
    console: true,
  },
  routes: {
    // Use Bun's HTML import for tension page
    // Bun automatically bundles JS/CSS/assets and serves them
    '/tension': tensionPage,
    
    // Static API endpoints
    '/api/dev/endpoints': {
      GET: async () => {
        return Response.json(getAllEndpoints(), null, 2);
      },
    },
    
    '/api/dev/configs': {
      GET: async () => {
        const configs = await loadConfigs();
        return Response.json(configs, null, 2);
      },
    },
    
    '/api/dev/workers': {
      GET: async () => {
        try {
          const response = await fetch('http://localhost:3000/api/workers/registry');
          if (response.ok) {
            const data = await response.json();
            return Response.json(data, null, 2);
          }
          return Response.json({ error: 'Worker API not available' }, { status: 503 });
        } catch (error) {
          return Response.json({ error: 'Worker API not available' }, { status: 503 });
        }
      },
    },
    
    '/api/dev/status': {
      GET: async () => {
        try {
          const configs = await loadConfigs();
          const workerStatus = await checkWorkerApiStatus();
          return Response.json({
            configs: Object.keys(configs),
            workerApi: workerStatus,
            timestamp: new Date().toISOString(),
          }, null, 2);
        } catch (error) {
          return Response.json({ error: 'Failed to get status' }, { status: 500 });
        }
      },
    },
    
    '/api/tension/map': {
      GET: async (req) => {
        const url = new URL(req.url);
        const conflict = Math.max(0, Math.min(1, parseFloat(url.searchParams.get('conflict') || '0.5')));
        const entropy = Math.max(0, Math.min(1, parseFloat(url.searchParams.get('entropy') || '0.5')));
        const tension = Math.max(0, Math.min(1, parseFloat(url.searchParams.get('tension') || '0.5')));
        
        const edge = mapEdgeRelation(conflict, entropy, tension);
        return Response.json(edge);
      },
    },
    
    '/api/gauge/womens-sports': {
      GET: async (req) => {
        const url = new URL(req.url);
        const oddsSkew = parseFloat(url.searchParams.get('oddsSkew') || '0.5');
        const volumeVelocity = parseFloat(url.searchParams.get('volumeVelocity') || '25000');
        const volatilityEntropy = parseFloat(url.searchParams.get('volatilityEntropy') || '0.5');
        const timeDecay = parseFloat(url.searchParams.get('timeDecay') || '1800');
        const momentumCurvature = parseFloat(url.searchParams.get('momentumCurvature') || '0.5');
        
        const result = gaugeWNBATOR({
          oddsSkew,
          volumeVelocity,
          volatilityEntropy,
          timeDecay,
          momentumCurvature,
        });
        
        return Response.json(result);
      },
    },
    
    '/api/ai/maparse': {
      GET: async (req) => {
        const url = new URL(req.url);
        const pricesStr = url.searchParams.get('prices') || '100,102,105';
        const prices = pricesStr.split(',').map(Number);
        
        const result = await autoMaparse({ prices });
        return Response.json(result);
      },
    },
    
    '/api/validate/threshold': {
      GET: async (req) => {
        const url = new URL(req.url);
        const threshold = url.searchParams.get('threshold') || '0.5';
        
        try {
          const result = validateThreshold(threshold);
          return Response.json(result);
        } catch (error: any) {
          return Response.json({ error: error.message }, { status: 400 });
        }
      },
    },
    
    // Serve precomputed tension states
    '/public/tension-states.json': new Response(Bun.file('public/tension-states.json')),
    
    // Dashboard
    '/': {
      GET: () => {
        return new Response(generateDashboard(), {
          headers: { 'Content-Type': 'text/html' },
        });
      },
    },
  },
  
  // Fallback for unmatched routes
  async fetch(req) {
    const url = new URL(req.url);
    
    // Favicon handler
    if (url.pathname === '/favicon.ico') {
      return new Response(null, { status: 204 });
    }
    
    return new Response('Not Found', { status: 404 });
  },
});

console.log(`\n🚀 Dev Server running on http://localhost:${devServer.port}`);
console.log(`📊 Dashboard: http://localhost:${devServer.port}/`);
console.log(`🎨 Tension Page: http://localhost:${devServer.port}/tension`);
console.log(`\n📡 API Endpoints:`);
console.log(`   GET  /api/dev/endpoints  → All API endpoints`);
console.log(`   GET  /api/dev/configs     → All configs`);
console.log(`   GET  /api/dev/workers    → Worker telemetry`);
console.log(`   GET  /api/dev/status     → System status`);
console.log(`\n💡 Using Bun's HTML loader for automatic asset bundling!`);

export { devServer };

