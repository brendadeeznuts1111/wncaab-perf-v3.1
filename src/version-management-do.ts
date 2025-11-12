// TES-OPS-004.B.4: VersionManagementDO @ 2025-11-11T18:45:00.000Z | [META: STATEFUL-QUANTA]
// [BUN-FIRST] Zero-NPM: Crypto-Signed Storage, Subproto WebSockets for TES Bumps
// Deploy: wrangler publish -- [REF:TES-WORKERS]
//
// IMPROVED: Integrated with VERSION_REGISTRY, proper types, env-based signing

import type { DurableObjectState, KVNamespace } from '@cloudflare/workers-types';
import {
  VERSION_REGISTRY,
  type VersionedEntity,
  getEntity,
  getLinkedEntities,
} from './config/version-registry.ts';

/**
 * Thread lifecycle states for version management
 */
type ThreadLifecycleState = 'CREATED' | 'RUNNING' | 'BLOCKED' | 'TERMINATED' | 'ERROR';

/**
 * Version bump scope
 */
type BumpScope = 'major' | 'minor' | 'patch';

/**
 * Bump request payload
 */
export interface BumpRequest {
  scope: BumpScope;
  entityId?: string;
  dryRun?: boolean;
  cascade?: boolean;
}

/**
 * Version change record
 */
export interface VersionChange {
  entityId: string;
  oldVersion: string;
  newVersion: string;
  displayName: string;
}

/**
 * Bump response payload
 */
export interface BumpResponse {
  success: boolean;
  bumped: VersionedEntity[];
  changes: VersionChange[];
  signature: string;
  timestamp: number;
  hsl: string;
  metaHybrid?: boolean;
}

/**
 * WebSocket message types
 */
export interface WebSocketBumpMessage {
  type: 'bump';
  scope: BumpScope;
  entityId?: string;
  cascade?: boolean;
  keyVersion?: 'v1' | 'v2'; // TES-NGWS-001.5.B.4: Dual-key support
}

export interface WebSocketResponseMessage {
  type: 'bump_response' | 'error' | 'ping' | 'refresh_response' | 'pong';
  status?: 'BUMPED' | 'ERROR';
  data?: BumpResponse;
  error?: string;
  hsl?: string;
  threadId?: string;
  channel?: string;
  keyVersion?: 'v1' | 'v2'; // TES-NGWS-001.5.B.4: Dual-key support
  entities?: VersionedEntity[]; // For refresh_response
  lifecycle?: ThreadLifecycleState; // For refresh_response
}

/**
 * Environment interface for VersionManagementDO
 * TES-NGWS-001.5: Enhanced with security hardening configuration
 */
export interface VersionDOEnv {
  KV: KVNamespace;
  /** Signing key for crypto operations (from env vars/secrets) */
  VERSION_SIGNING_KEY?: string;
  /** Secondary signing key for zero-downtime rotation (TES-NGWS-001.5.B.4) */
  VERSION_SIGNING_KEY_V2?: string;
  /** Trusted proxy IPs (comma-separated, CIDR supported) */
  TES_PROXY_IPS?: string;
  /** Supported subprotocols (comma-separated, defaults to tes-ui-v1,tes-ui-v2) */
  TES_SUPPORTED_SUBPROTOCOLS?: string;
}

/**
 * VersionManagementDO - Durable Object for stateful version management
 * 
 * Provides:
 * - Stateful storage for version registry (SQLite-backed persistence)
 * - WebSocket subprotocol negotiation (tes-subproto-v1)
 * - Crypto-signed version bumps
 * - Thread lifecycle state management
 * - Hybrid KV + DO storage for resilience
 * - Integration with existing VERSION_REGISTRY
 * 
 * HSL: 271° External #9D4EDD (Version Management Thread: 0x6001)
 */
export class VersionManagementDO {
  private state: DurableObjectState;
  private env: VersionDOEnv;
  private signingKeyCache: CryptoKey | null = null;
  private signingKeyV2Cache: CryptoKey | null = null;

  constructor(state: DurableObjectState, env: VersionDOEnv) {
    this.state = state;
    this.env = env; // [SEMANTIC: HYBRID-KV]
  }

  /**
   * Main fetch handler for version management operations
   */
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    
    // Strip /version prefix if present (routing from worker adds it)
    let pathname = url.pathname;
    if (pathname.startsWith('/version/')) {
      pathname = pathname.replace('/version', '') || '/';
    }

    // WebSocket Subproto: tes-subproto-v1 Negotiation [TYPE: WS-HANDSHAKE]
    if (req.headers.get('upgrade') === 'websocket') {
      return this.handleWebSocket(req);
    }

    // RESTful version bump endpoint
    if (pathname === '/bump' && req.method === 'POST') {
      return this.handleBump(req);
    }

    // Get current registry state
    if (pathname === '/registry' && req.method === 'GET') {
      return this.handleGetRegistry();
    }

    // Health check
    if (pathname === '/health' && req.method === 'GET') {
      return this.handleHealth();
    }

    return new Response(JSON.stringify({ 
      error: 'Not found',
      pathname: url.pathname,
      normalized: pathname,
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Handle WebSocket subprotocol negotiation
   * 
   * TES-NGWS-001.5: Security-Hardened Foundation
   * - Bun 1.3+ RFC 6455 Compliant: Supports array of subprotocols
   * - Header Override Validation: Proxy trust boundary
   * - One-Time CSRF Token: Bun.CSRF with immediate invalidation
   * - Automatic permessage-deflate compression enabled by default
   */
  private async handleWebSocket(req: Request): Promise<Response> {
    // === TES-NGWS-001.5.B.2: Header Override Validation ===
    const expectedHost = new URL(req.url).hostname;
    const declaredHost = req.headers.get('host');
    const wsKey = req.headers.get('sec-websocket-key');
    const clientIP = req.headers.get('cf-connecting-ip') || 
                     req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     'unknown';
    
    // Validate Host header (proxy trust boundary)
    const trustedIPs = (this.env.TES_PROXY_IPS || '').split(',').map(ip => ip.trim()).filter(Boolean);
    if (declaredHost && declaredHost !== expectedHost && !trustedIPs.includes(clientIP)) {
      await this.logTESEvent('ws:upgrade:host_mismatch', {
        declaredHost,
        expectedHost,
        clientIP,
        hsl: '#FF4500',
      });
      return new Response('Host Header Mismatch [HSL:#FF4500]', { status: 400 });
    }
    
    // Validate Sec-WebSocket-Key format (Base64, 16-byte nonce)
    // Note: wsKey is optional in WebSocket spec, but we validate format if present
    if (wsKey) {
      try {
        // Validate Base64 format and length (16 bytes = 24 chars base64, with padding)
        if (!/^[A-Za-z0-9+/=]{22,24}$/.test(wsKey)) {
          await this.logTESEvent('ws:upgrade:invalid_key', {
            wsKeyPreview: wsKey.substring(0, 8) + '...',
            wsKeyLength: wsKey.length,
            hsl: '#FF0000',
          });
          return new Response('Invalid WS-Key Format [HSL:#FF0000]', { 
            status: 400,
            headers: { 'Content-Type': 'text/plain' },
          });
        }
      } catch (error) {
        await this.logTESEvent('ws:upgrade:key_validation_error', {
          error: error instanceof Error ? error.message : String(error),
          hsl: '#FF0000',
        });
        return new Response('WS-Key Validation Error [HSL:#FF0000]', { 
          status: 500,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    }
    
    // === TES-NGWS-001.5.B.5: One-Time WS CSRF Token ===
    const csrfToken = req.headers.get('x-tes-ws-csrf-token');
    if (!csrfToken || !await this.validateOneTimeCSRFToken(csrfToken)) {
      await this.logTESEvent('ws:upgrade:csrf_invalid', {
        hsl: '#FF4500',
      });
      return new Response('WS CSRF Invalid [HSL:#FF4500]', { status: 403 });
    }
    
    // === TES-NGWS-001.5.B.1: RFC 6455 Subprotocol Negotiation ===
    const protocolHeader = req.headers.get('sec-websocket-protocol');
    const requestedProtocols = protocolHeader 
      ? protocolHeader.split(',').map(p => p.trim())
      : [];
    
    // Load supported protocols from env or default
    const supportedProtocolsStr = this.env.TES_SUPPORTED_SUBPROTOCOLS || 'tes-ui-v1,tes-ui-v2';
    const supportedProtocols = supportedProtocolsStr.split(',').map(p => p.trim());
    
    const selectedProtocol = requestedProtocols.find(p => supportedProtocols.includes(p)) 
      || supportedProtocols[0]; // Fallback to first supported
    
    if (!selectedProtocol) {
      return new Response('Subprotocol Mismatch: No supported protocol', { status: 400 });
    }
    
    // Log validated header chain
    await this.logTESEvent('ws:upgrade:headers_validated', {
      declaredHost: declaredHost || 'none',
      wsKey: wsKey ? wsKey.substring(0, 8) + '...' : 'none',
      clientIP,
      proxyTrusted: trustedIPs.includes(clientIP),
      selectedProtocol,
      requestedProtocols,
      hsl: '#9D4EDD',
    });

    const wsPair = new WebSocketPair();
    const [client, server] = Object.values(wsPair);
    
    this.state.acceptWebSocket(server);
    
    // Store protocol version in session for message routing
    const sessionId = `ws-session-${Date.now()}`;
    await this.state.storage.put(`${sessionId}:protocol`, selectedProtocol);

    // === TES-NGWS-001.5.B.3: Compression-Safe Message Handling ===
    this.handleSession(server, selectedProtocol);

    server.addEventListener('error', async () => {
      await this.logTESEvent('ws:error', {
        protocol: selectedProtocol,
        hsl: '#FF0000',
      });
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
      headers: {
        // Bun 1.3+ RFC 6455: Return selected subprotocol
        'Sec-WebSocket-Protocol': selectedProtocol,
      },
    });
  }

  /**
   * Handle RESTful version bump
   */
  private async handleBump(req: Request): Promise<Response> {
    try {
      const body = await req.json() as BumpRequest;
      const { scope = 'patch', entityId, cascade = true } = body;

      // Load registry
      const registry = await this.loadRegistry();

      // Perform bump
      const result = await this.performBump(registry, scope, entityId, cascade);

      // Sign response
      const signature = await this.signResponse(result.bumped);

      // Persist to DO storage (SQLite-backed)
      await this.state.storage.put('version-registry', result.bumped);

      // Set alarm for eviction guard (5 minutes) → S4 TERMINATED
      await this.state.storage.setAlarm(Date.now() + 300000);

      const response: BumpResponse = {
        ...result,
        signature,
        hsl: '#9D4EDD',
        metaHybrid: true, // [SEMANTIC: HYBRID]
      };

      return new Response(
        JSON.stringify(response),
        {
          headers: {
            'Content-Type': 'application/json',
            'tes-sig': signature,
            'hsl': '#9D4EDD',
          },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error),
          hsl: '#FF0000',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  /**
   * Get current registry state
   */
  private async handleGetRegistry(): Promise<Response> {
    try {
      const registry = await this.loadRegistry();
      const lifecycle = (await this.state.storage.get('thread-state')) as ThreadLifecycleState || 'CREATED';

      return new Response(
        JSON.stringify({
          entities: registry,
          lifecycle,
          hsl: '#9D4EDD',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  /**
   * Health check endpoint
   */
  private async handleHealth(): Promise<Response> {
    const lifecycle = (await this.state.storage.get('thread-state')) as ThreadLifecycleState || 'CREATED';
    
    return new Response(
      JSON.stringify({
        status: 'ok',
        lifecycle,
        hsl: '#9D4EDD',
        threadId: '0x6001',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  /**
   * Load registry from DO storage, fallback to KV, then initialize from VERSION_REGISTRY
   */
  private async loadRegistry(): Promise<VersionedEntity[]> {
    // Try DO storage first
    let registry = await this.state.storage.get<VersionedEntity[]>('version-registry');
    
    if (registry && Array.isArray(registry) && registry.length > 0) {
      return registry;
    }

    // Fallback to KV (if available)
    if (this.env.KV) {
      try {
        const kvData = await this.env.KV.get('version-registry', { type: 'json' });
        if (kvData && Array.isArray(kvData) && kvData.length > 0) {
          registry = kvData as VersionedEntity[];
          // Migrate to DO storage
          await this.state.storage.put('version-registry', registry);
          return registry;
        }
      } catch (error) {
        // KV access failed, continue to static initialization
        console.warn('[VersionManagementDO] KV fallback failed:', error);
      }
    }

    // Initialize from static VERSION_REGISTRY
    registry = [...VERSION_REGISTRY];
    await this.state.storage.put('version-registry', registry);
    
    return registry;
  }

  /**
   * Perform version bump with proper cascading logic
   */
  private async performBump(
    registry: VersionedEntity[],
    scope: BumpScope,
    entityId?: string,
    cascade: boolean = true
  ): Promise<{ bumped: VersionedEntity[]; changes: VersionChange[] }> {
    const changes: VersionChange[] = [];
    const bumped = registry.map(entity => ({ ...entity }));

    // If entityId specified, find and bump that entity
    if (entityId) {
      const entity = getEntity(entityId);
      if (!entity) {
        throw new Error(`Entity not found: ${entityId}`);
      }

      const index = bumped.findIndex(e => e.id === entityId);
      if (index === -1) {
        throw new Error(`Entity not found in registry: ${entityId}`);
      }

      const oldVersion = bumped[index].currentVersion;
      const newVersion = this.incrementVersion(oldVersion, scope);
      
      bumped[index].currentVersion = newVersion;
      changes.push({
        entityId,
        oldVersion,
        newVersion,
        displayName: entity.displayName,
      });

      // Cascade to linked entities if requested
      if (cascade && entity.updateStrategy === 'linked-to-parent') {
        const linked = getLinkedEntities(entityId);
        for (const linkedEntity of linked) {
          const linkedIndex = bumped.findIndex(e => e.id === linkedEntity.id);
          if (linkedIndex !== -1) {
            const linkedOldVersion = bumped[linkedIndex].currentVersion;
            const linkedNewVersion = this.incrementVersion(linkedOldVersion, scope);
            
            bumped[linkedIndex].currentVersion = linkedNewVersion;
            changes.push({
              entityId: linkedEntity.id,
              oldVersion: linkedOldVersion,
              newVersion: linkedNewVersion,
              displayName: linkedEntity.displayName,
            });
          }
        }
      }
    } else {
      // Bump all entities (typically used for global bumps)
      for (let i = 0; i < bumped.length; i++) {
        const entity = bumped[i];
        const oldVersion = entity.currentVersion;
        const newVersion = this.incrementVersion(oldVersion, scope);
        
        bumped[i].currentVersion = newVersion;
        changes.push({
          entityId: entity.id,
          oldVersion,
          newVersion,
          displayName: entity.displayName,
        });
      }
    }

    return {
      bumped,
      changes,
    };
  }

  /**
   * Handle WebSocket session with protocol version routing
   * TES-NGWS-001.5.B.3: CRIME mitigation - CSRF tokens never in compressed frames
   */
  private handleSession(ws: WebSocket, protocol: string): void {
    ws.addEventListener('message', async (ev) => {
      try {
        // Bun 1.3+ Automatic permessage-deflate: Data is automatically decompressed
        let messageData: string;
        if (ev.data instanceof ArrayBuffer) {
          messageData = new TextDecoder().decode(ev.data);
        } else {
          messageData = ev.data as string;
        }
        
        const message = JSON.parse(messageData);
        
        // Route by subprotocol version
        if (protocol === 'tes-ui-v2' || protocol === 'tes-subproto-v1') {
          await this.handleV2Message(ws, message);
        } else {
          await this.handleV1Message(ws, message);
        }
      } catch (error) {
        const errorResponse: WebSocketResponseMessage = {
          type: 'error',
          status: 'ERROR',
          error: error instanceof Error ? error.message : String(error),
          hsl: '#FF0000',
        };
        ws.send(JSON.stringify(errorResponse));
      }
    });
    
    ws.addEventListener('close', async () => {
      await this.logTESEvent('ws:close', {
        protocol,
        hsl: '#9D4EDD',
      });
    });
  }

  /**
   * Handle V1 messages (legacy TES-OPS-004)
   */
  private async handleV1Message(ws: WebSocket, message: any): Promise<void> {
    if (message.type === 'refresh') {
      const registry = await this.loadRegistry();
      const lifecycle = (await this.state.storage.get('thread-state')) as ThreadLifecycleState || 'CREATED';
      
      ws.send(JSON.stringify({
        type: 'refresh_response',
        entities: registry,
        lifecycle,
        hsl: '#9D4EDD',
        threadId: '0x6001',
        channel: 'COMMAND_CHANNEL',
      }));
    } else if (message.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong', hsl: '#9D4EDD' }));
    } else if (message.type === 'bump') {
      const { scope, entityId, cascade = true, keyVersion = 'v1' } = message;
      const registry = await this.loadRegistry();
      const result = await this.performBump(registry, scope, entityId, cascade);
      
      // Sign with appropriate key version
      const signature = await this.signResponse(result.bumped, keyVersion as 'v1' | 'v2');
      
      ws.send(JSON.stringify({
        type: 'bump_response',
        status: 'BUMPED',
        data: { ...result, signature, keyVersion },
        hsl: '#9D4EDD',
        threadId: '0x6001',
        channel: 'COMMAND_CHANNEL',
      }));
    }
  }

  /**
   * Handle V2 messages (future crypto schema support)
   * TES-NGWS-001.5: Future Ed25519 signatures, enhanced crypto
   */
  private async handleV2Message(ws: WebSocket, message: any): Promise<void> {
    // For now, delegate to V1 handler
    // Future: Implement Ed25519 signatures, enhanced crypto schemas
    await this.handleV1Message(ws, message);
  }

  /**
   * Validate one-time CSRF token for WebSocket upgrade
   * TES-NGWS-001.5.B.5: Token invalidated immediately after use
   */
  private async validateOneTimeCSRFToken(token: string): Promise<boolean> {
    // Check if token was already used (one-time validation)
    const usedToken = await this.state.storage.get(`csrf-used:${token}`);
    if (usedToken) {
      return false; // Token already used
    }
    
    // Verify token using Bun.CSRF
    try {
      // Import CSRF guard dynamically to avoid circular dependencies
      const { verifyCsrfToken } = await import('../lib/csrf-guard.ts');
      const isValid = await verifyCsrfToken(token);
      
      if (isValid) {
        // Mark token as used (one-time) - 5 minute TTL
        await this.state.storage.put(`csrf-used:${token}`, true, { expirationTtl: 300 });
      }
      
      return isValid;
    } catch (error) {
      console.error('[VersionDO] CSRF validation error:', error);
      return false;
    }
  }

  /**
   * TES event logging helper
   */
  private async logTESEvent(event: string, metadata: Record<string, any>): Promise<void> {
    try {
      // Dynamic import to avoid circular dependencies
      const { logTESEvent } = await import('../lib/production-utils.ts');
      await logTESEvent(event, metadata, {
        threadGroup: 'EXTERNAL_SERVICES',
        threadId: '0x6001',
        channel: 'COMMAND_CHANNEL',
      });
    } catch (error) {
      // Fallback to console if import fails
      console.log(`[TES-Event] ${event}:`, metadata);
    }
  }

  /**
   * Get signing key from environment or generate/store one
   * TES-NGWS-001.5.B.4: Enhanced with dual-key support for zero-downtime rotation
   */
  private async getSigningKey(keyVersion: 'v1' | 'v2' = 'v1'): Promise<CryptoKey> {
    // Return cached key if available
    if (keyVersion === 'v1' && this.signingKeyCache) {
      return this.signingKeyCache;
    }
    if (keyVersion === 'v2' && this.signingKeyV2Cache) {
      return this.signingKeyV2Cache;
    }

    let keyMaterial: Uint8Array;

    if (keyVersion === 'v2') {
      // Try V2 key from environment
      if (this.env.VERSION_SIGNING_KEY_V2) {
        keyMaterial = new TextEncoder().encode(this.env.VERSION_SIGNING_KEY_V2);
      } else {
        // Fallback to V1 if V2 not available
        await this.logTESEvent('key:fallback_v2_to_v1', {
          hsl: '#FF8C00',
          '[META:KEY-VERSION]': '1',
        });
        return this.getSigningKey('v1');
      }
    } else {
      // V1 key (existing logic)
      if (this.env.VERSION_SIGNING_KEY) {
        keyMaterial = new TextEncoder().encode(this.env.VERSION_SIGNING_KEY);
      } else {
        // Try stored key in DO storage
        const storedKey = await this.state.storage.get<Uint8Array>('signing-key');
        
        if (storedKey) {
          keyMaterial = storedKey;
        } else {
          // Generate new key and store it
          keyMaterial = crypto.getRandomValues(new Uint8Array(32));
          await this.state.storage.put('signing-key', Array.from(keyMaterial));
        }
      }
    }

    // Import key
    const key = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Cache key
    if (keyVersion === 'v1') {
      this.signingKeyCache = key;
    } else {
      this.signingKeyV2Cache = key;
    }

    return key;
  }

  /**
   * Sign response data using HMAC-SHA256
   * TES-NGWS-001.5.B.4: Enhanced with key version support and DO ledger pinning
   */
  private async signResponse(data: VersionedEntity[], keyVersion: 'v1' | 'v2' = 'v1'): Promise<string> {
    // Get keyVersion from DO storage if not specified (rotation-aware)
    if (keyVersion === 'v1') {
      const storedVersion = await this.state.storage.get<string>('keyVersion');
      if (storedVersion === '2') {
        keyVersion = 'v2'; // Use V2 if rotation signal set
      }
    }
    
    const key = await this.getSigningKey(keyVersion);
    const payload = JSON.stringify(data);
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
    
    const hexSig = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Ledger Pin: Store last signature version for audit trail
    await this.state.storage.put('lastSigVersion', keyVersion);
    
    // Audit: Log signature with key version metadata
    await this.logTESEvent('signature:generated', {
      keyVersion,
      signaturePreview: hexSig.substring(0, 16) + '...',
      '[META:KEY-VERSION]': keyVersion,
      hsl: '#9D4EDD',
    });
    
    return hexSig;
  }

  /**
   * Increment version based on SemVer scope
   */
  private incrementVersion(version: string, scope: BumpScope): string {
    // Handle versions with 'v' prefix or other formats
    const cleanVersion = version.replace(/^v/, '');
    const parts = cleanVersion.split('.');
    
    const major = parseInt(parts[0] || '0', 10);
    const minor = parseInt(parts[1] || '0', 10);
    const patch = parseInt(parts[2] || '0', 10);

    switch (scope) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
      default:
        return `${major}.${minor}.${patch + 1}`;
    }
  }

  /**
   * Alarm handler for eviction/timeout management
   */
  async alarm(): Promise<void> {
    // Emit INFO [HSL: #FFFF00 CH4] to Monitor CH4 Yellow on eviction
    const lifecycle = (await this.state.storage.get('thread-state')) as ThreadLifecycleState;
    
    if (lifecycle === 'RUNNING') {
      // Transition to S4 TERMINATED after timeout
      await this.state.storage.put('thread-state', 'TERMINATED');
    }
  }
}
