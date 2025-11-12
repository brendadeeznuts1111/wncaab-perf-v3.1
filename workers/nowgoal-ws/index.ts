/**
 * NowGoal WebSocket Worker - Cloudflare Workers
 * 
 * Handles WebSocket connections for NowGoal data streaming
 * with CSRF protection and subprotocol negotiation
 * 
 * Endpoint: wss://nowgoal.tes-framework.com
 */

export interface Env {
  CSRF_SECRET?: string;
  TES_SUPPORTED_SUBPROTOCOLS?: string;
  NOWGOAL_WS_URL?: string;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    // CSRF Token Generation Endpoint
    if (url.pathname === '/api/auth/csrf-token' && req.method === 'GET') {
      try {
        const { generateCsrfTokenWorkers, initCsrfSecret } = await import('../../src/lib/csrf-guard-workers.ts');
        
        if (env.CSRF_SECRET) {
          initCsrfSecret(env.CSRF_SECRET);
        }
        
        const token = await generateCsrfTokenWorkers(5 * 60 * 1000, env.CSRF_SECRET);
        return new Response(JSON.stringify({ token }), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: 'Failed to generate CSRF token',
            message: error instanceof Error ? error.message : String(error),
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // WebSocket Upgrade Handler
    if (req.headers.get('Upgrade') === 'websocket') {
      try {
        // Verify CSRF token (from header or query parameter)
        // Note: Browser WebSocket API doesn't support custom headers, so we accept query param
        const csrfToken = req.headers.get('x-tes-ws-csrf-token') || 
                         url.searchParams.get('csrf');
        
        if (!csrfToken) {
          return new Response('CSRF token required', { status: 403 });
        }

        // Verify CSRF token
        const { verifyCsrfTokenWorkers, generateCsrfTokenWorkers, initCsrfSecret } = await import('../../src/lib/csrf-guard-workers.ts');
        if (env.CSRF_SECRET) {
          initCsrfSecret(env.CSRF_SECRET);
        }

        const isValid = await verifyCsrfTokenWorkers(csrfToken);
        if (!isValid) {
          return new Response('Invalid CSRF token', { status: 403 });
        }

        // Subprotocol negotiation
        const requestedProtocols = req.headers.get('sec-websocket-protocol')?.split(',').map(p => p.trim()) || [];
        const supportedProtocols = (env.TES_SUPPORTED_SUBPROTOCOLS || 'tes-ui-v1,tes-ui-v2').split(',').map(p => p.trim());
        
        // Select first matching protocol (priority order)
        const selectedProtocol = supportedProtocols.find(p => requestedProtocols.includes(p)) || supportedProtocols[0];

        // Create WebSocket pair (Cloudflare Workers API)
        const wsPair = new WebSocketPair();
        const [client, server] = Object.values(wsPair);
        
        // Accept server WebSocket
        server.accept();
        server.send(JSON.stringify({
          type: 'connected',
          protocol: selectedProtocol,
          timestamp: Date.now(),
        }));

        // Return upgrade response with selected subprotocol
        return new Response(null, {
          status: 101,
          webSocket: client,
          headers: {
            'Sec-WebSocket-Protocol': selectedProtocol,
          },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: 'WebSocket upgrade failed',
            message: error instanceof Error ? error.message : String(error),
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Health check
    if (url.pathname === '/health' && req.method === 'GET') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'nowgoal-ws',
        timestamp: Date.now(),
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};

