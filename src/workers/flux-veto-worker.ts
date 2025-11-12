// src/workers/flux-veto-worker.ts
// Cloudflare Worker entry point for TES-NGWS-001 Flux-Veto System
// Zero-npm, Bun-native, AI-powered endpoint verification

import type { KVNamespace, DurableObjectNamespace } from '@cloudflare/workers-types';
import { DefensiveNowGoalVerifier } from '../lib/defensive-nowgoal-verifier.ts';
// TES-OPS-004.B.4: Export VersionManagementDO for Durable Objects
export { VersionManagementDO } from '../version-management-do.ts';

export interface Env {
  KV: KVNamespace;
  VERSION_DO?: DurableObjectNamespace; // TES-NGWS-001.5: Durable Object for version management
  TOKEN_MULTIPLIER?: string;
  NOWGOAL_BASE?: string;
  JWT_ENDPOINT?: string;
  WS_PROXY?: string;
  // TES-NGWS-001.5: Security hardening configuration
  VERSION_SIGNING_KEY?: string;
  VERSION_SIGNING_KEY_V2?: string;
  TES_PROXY_IPS?: string;
  TES_SUPPORTED_SUBPROTOCOLS?: string;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    // Note: Bun.env is not available in Cloudflare Workers
    // Environment variables are accessed via env parameter

    const url = new URL(req.url);

    // TES-NGWS-001.5: CSRF Token Generation Endpoint
    if (url.pathname === '/api/auth/csrf-token' && req.method === 'GET') {
      try {
        // Use Cloudflare Workers-compatible CSRF implementation
        const { generateCsrfToken, initCsrfSecret } = await import('../lib/csrf-guard-workers.ts');
        
        // Initialize secret from environment if available
        if (env.CSRF_SECRET) {
          initCsrfSecret(env.CSRF_SECRET);
        }
        
        const token = await generateCsrfToken(5 * 60 * 1000, env.CSRF_SECRET);
        return new Response(JSON.stringify({ token }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('[CSRF] Generation error:', error);
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

    // TES-NGWS-001.5: Route version management requests to Durable Object
    if (url.pathname.startsWith('/version/') && env.VERSION_DO) {
      try {
        // Use deterministic ID from name for persistent DO instance
        const doId = env.VERSION_DO.idFromName('tes-registry-v1');
        const doStub = env.VERSION_DO.get(doId);
        
        // Forward request to DO - DO receives env through constructor binding
        // Note: KV and other env vars are automatically available to DO via wrangler.toml bindings
        const doRequest = new Request(req.url, {
          method: req.method,
          headers: req.headers,
          body: req.body,
        });
        
        // Forward to DO with proper error handling
        const response = await doStub.fetch(doRequest);
        return response;
      } catch (error) {
        console.error('[DO_FETCH_ERROR]', error);
        return new Response(
          JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            code: 'DO_FETCH_ERROR',
            hsl: '#FF4500',
            pathname: url.pathname,
            stack: error instanceof Error ? error.stack : undefined,
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    const verifier = new DefensiveNowGoalVerifier(env.KV);

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        timestamp: Date.now(),
        version: 'v9-upgrade',
        meta: '[META:worker-health][SEMANTIC:zero-npm-deploy]',
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Flux verification endpoint
    if (url.pathname === '/verify' && req.method === 'POST') {
      try {
        const body = await req.json() as {
          patternId?: string;
          specifics?: {
            proposedRnum?: number;
            userTier?: 'bronze' | 'silver' | 'gold';
            kellyEdge?: number;
            vetoEndpoint?: string;
          };
        };

        const { patternId = 'tes-ngws-001-nowgoal', specifics = {} } = body;
        const { proposedRnum, userTier, kellyEdge, vetoEndpoint } = specifics;

        const pattern = await verifier.detectFluxPattern(patternId, {
          proposedRnum: proposedRnum || Math.floor(Math.random() * 900000) + 100000,
          userTier: userTier || 'bronze',
          kellyEdge: kellyEdge || 0.15,
          vetoEndpoint: vetoEndpoint || '/ajax/getwebsockettoken',
        });

        return new Response(JSON.stringify({
          pattern,
          enforcement: pattern?.fluxEnforcement,
          token: pattern?.wagerSpecifics?.tokenValue,
          aiFeedback: pattern
            ? `[AI-FEEDBACK] Token intelligence: ${pattern.fluxEnforcement?.vetoTriggered ? '5-8%' : '9-12%'}, audit depth ${pattern.fluxEnforcement?.auditTrail?.length || 0} steps, semantic nowgoal-veto applied.`
            : 'No pattern detected (refactor advised)',
          semanticMeta: '[META:worker-flux-v9][SEMANTIC:zero-npm-deploy]',
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        return new Response(JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
          meta: '[ERROR:flux-ingest-fail]',
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Monitor flux keys endpoint
    if (url.pathname === '/monitor' && req.method === 'GET') {
      try {
        const prefix = url.searchParams.get('prefix') || 'flux:';
        const limit = parseInt(url.searchParams.get('limit') || '100');

        // List keys with prefix (Cloudflare KV doesn't support list, so we'll use a workaround)
        // Note: KV doesn't have native list, so we'll return a message about monitoring
        const monitorKey = `monitor:${prefix}:${Date.now()}`;
        await env.KV.put(monitorKey, JSON.stringify({
          timestamp: Date.now(),
          prefix,
          limit,
          status: 'monitoring',
        }), { expirationTtl: 3600 });

        return new Response(JSON.stringify({
          message: 'Monitoring started',
          prefix,
          limit,
          monitorKey,
          note: 'Use KV.get() with known keys to retrieve flux patterns',
          semanticMeta: '[META:flux-monitor][SEMANTIC:kv-durable]',
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        return new Response(JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Get specific flux pattern
    if (url.pathname.startsWith('/flux/') && req.method === 'GET') {
      try {
        const patternId = url.pathname.replace('/flux/', '');
        const key = `flux:${patternId}:${url.searchParams.get('endpoint') || '/ajax/getwebsockettoken'}`;
        const value = await env.KV.get(key);

        if (!value) {
          return new Response(JSON.stringify({
            error: 'Pattern not found',
            key,
          }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(value, {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        return new Response(JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Default 404
    return new Response(JSON.stringify({
      error: 'Not found',
      endpoints: {
        health: 'GET /health',
        verify: 'POST /verify',
        monitor: 'GET /monitor?prefix=flux:&limit=100',
        getFlux: 'GET /flux/:patternId?endpoint=/ajax/getwebsockettoken',
      },
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
