/**
 * Spline API Server - Native Bun API Implementation
 * 
 * Provides REST API and WebSocket endpoints for spline operations:
 * - GET  /api/spline/render         → 1000-node path
 * - POST /api/spline/predict        → Next 100 points
 * - WS   /ws/spline-live            → 60fps compressed
 * - POST /api/spline/preset/store   → YAML + vault sync
 */

import { SplineRenderer, SplineConfig } from './spline-renderer.ts';

// Global renderer instance
const renderer = new SplineRenderer();
const liveClients: Set<WebSocket> = new Set();
let liveInterval: Timer | undefined;

// API Server
const server = Bun.serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url);

    // CORS headers
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers, status: 204 });
    }

    // WebSocket upgrade for live streaming
    if (url.pathname === '/ws/spline-live') {
      if (server.upgrade(req)) {
        return; // Upgrade successful
      }
      return new Response('WebSocket upgrade failed', { status: 500 });
    }

    // GET /api/spline/render
    if (req.method === 'GET' && url.pathname === '/api/spline/render') {
      const points = parseInt(url.searchParams.get('points') || '1000', 10);
      const type = (url.searchParams.get('type') || 'catmull-rom') as SplineConfig['type'];
      const tension = parseFloat(url.searchParams.get('tension') || '0.5');

      const path = renderer.render({
        type,
        points,
        tension,
        closed: false,
      });

      return new Response(JSON.stringify({ path, count: path.length }, null, 2), { headers });
    }

    // POST /api/spline/predict
    if (req.method === 'POST' && url.pathname === '/api/spline/predict') {
      const body = await req.json();
      const { path, horizon = 100 } = body;

      if (!path || !Array.isArray(path)) {
        return new Response(
          JSON.stringify({ error: 'Invalid path array' }),
          { headers, status: 400 }
        );
      }

      const predicted = renderer.predict(path, horizon);
      return new Response(JSON.stringify({ predicted, count: predicted.length }, null, 2), { headers });
    }

    // POST /api/spline/preset/store
    if (req.method === 'POST' && url.pathname === '/api/spline/preset/store') {
      const body = await req.json();
      const { name, config, vaultSync = false } = body;

      if (!name || !config) {
        return new Response(
          JSON.stringify({ error: 'Name and config required' }),
          { headers, status: 400 }
        );
      }

      // Store preset as YAML
      const yamlContent = `name: ${name}\ntype: ${config.type}\npoints: ${config.points}\ntension: ${config.tension || 0.5}\nclosed: ${config.closed || false}\n`;
      const presetPath = `presets/${name}.yaml`;
      
      await Bun.write(presetPath, yamlContent);

      // Vault sync (placeholder)
      if (vaultSync) {
        // TODO: Implement vault sync
        console.log(`📦 Vault sync requested for ${name}`);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          path: presetPath,
          vaultSync: vaultSync ? 'requested' : 'skipped'
        }, null, 2),
        { headers }
      );
    }

    return new Response('Not Found', { status: 404 });
  },

  websocket: {
    message(ws, message) {
      // Handle WebSocket messages if needed
    },
    open(ws) {
      liveClients.add(ws);
      
      // Start 60fps streaming if first client
      if (liveClients.size === 1) {
        startLiveStream();
      }
    },
    close(ws) {
      liveClients.delete(ws);
      if (liveClients.size === 0) {
        stopLiveStream();
      }
    },
  },
});

function startLiveStream() {
  liveInterval = setInterval(() => {
    // Generate compressed path data (60fps)
    const path = renderer.render({
      type: 'catmull-rom',
      points: 100,
      tension: 0.5,
    });

    // Compress path data (simplified)
    const compressed = {
      t: Date.now(),
      points: path.length,
      data: path.map(p => [p.x, p.y]), // Compressed format
    };

    const message = JSON.stringify(compressed);
    for (const client of liveClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }, 1000 / 60); // 60fps
}

function stopLiveStream() {
  if (liveInterval) {
    clearInterval(liveInterval);
    liveInterval = undefined;
  }
}

console.log(`🚀 Spline API Server running on http://localhost:${server.port}`);
console.log(`📊 GET  /api/spline/render         → 1000-node path`);
console.log(`🔮 POST /api/spline/predict        → Next 100 points`);
console.log(`📡 WS   /ws/spline-live            → 60fps compressed`);
console.log(`💾 POST /api/spline/preset/store   → YAML + vault sync`);

export { renderer };

