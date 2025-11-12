# TES-OPS-004.B.4 Retrospective: What We'd Do Differently

## Executive Summary

The Durable Objects integration is functional but could be improved in several areas: integration with existing systems, type safety, security, error handling, and testing. This document outlines architectural improvements and implementation patterns.

---

## 1. **Integration with Existing Version Registry**

### Current Issue
The DO implementation uses a generic `entities: any[]` array instead of leveraging the existing `VERSION_REGISTRY` from `src/config/version-registry.ts`.

### Better Approach
```typescript
// Import existing registry structure
import { VERSION_REGISTRY, type VersionedEntity } from '../config/version-registry.ts';

export class VersionManagementDO {
  // Use proper types
  private async loadRegistry(): Promise<VersionedEntity[]> {
    let registry = await this.state.storage.get<VersionedEntity[]>('version-registry');
    
    if (!registry) {
      // Initialize from static registry
      registry = VERSION_REGISTRY;
      await this.state.storage.put('version-registry', registry);
    }
    
    return registry;
  }
  
  private async cascadeBump(
    registry: VersionedEntity[], 
    scope: BumpScope, 
    entityId?: string
  ): Promise<VersionedEntity[]> {
    // Use existing dependency graph logic from VersionRegistryLoader
    // This ensures proper cascading based on parentVersionId relationships
  }
}
```

**Benefits:**
- Single source of truth
- Leverages existing dependency graph logic
- Type-safe operations
- Consistent with TES architecture

---

## 2. **Type Safety & Schema Validation**

### Current Issue
- Uses `any[]` for entities
- No validation of bump payloads
- Weak typing on storage operations

### Better Approach
```typescript
// Define proper schemas
interface BumpRequest {
  scope: 'major' | 'minor' | 'patch';
  entityId?: string;
  dryRun?: boolean;
  cascade?: boolean;
}

interface BumpResponse {
  success: boolean;
  bumped: VersionedEntity[];
  changes: Array<{
    entityId: string;
    oldVersion: string;
    newVersion: string;
  }>;
  signature: string;
  timestamp: number;
}

// Use Zod or similar for runtime validation
import { z } from 'zod';

const BumpRequestSchema = z.object({
  scope: z.enum(['major', 'minor', 'patch']),
  entityId: z.string().optional(),
  dryRun: z.boolean().optional().default(false),
  cascade: z.boolean().optional().default(true),
});

// Validate in handler
private async handleBump(req: Request): Promise<Response> {
  const body = await req.json();
  const validated = BumpRequestSchema.parse(body); // Throws on invalid
  
  // Now we have type-safe validated data
}
```

---

## 3. **Security: Environment-Based Signing**

### Current Issue
Hardcoded signing key: `'tes-secret'`

### Better Approach
```typescript
export interface VersionDOEnv {
  KV: KVNamespace;
  SIGNING_KEY?: string; // From env vars / secrets
}

export class VersionManagementDO {
  private async getSigningKey(): Promise<CryptoKey> {
    const keyMaterial = this.env.SIGNING_KEY 
      ? new TextEncoder().encode(this.env.SIGNING_KEY)
      : await this.state.storage.get<Uint8Array>('signing-key');
    
    if (!keyMaterial) {
      // Generate and store new key
      const newKey = crypto.getRandomValues(new Uint8Array(32));
      await this.state.storage.put('signing-key', newKey);
      return this.importKey(newKey);
    }
    
    return this.importKey(keyMaterial);
  }
  
  // Use Cloudflare Workers secrets in wrangler.toml:
  // [vars]
  // SIGNING_KEY = "{{ secrets.SIGNING_KEY }}"
}
```

---

## 4. **Error Handling Integration**

### Current Issue
Generic error handling, not using existing TES error patterns

### Better Approach
```typescript
import { logTESError, type ErrorContext } from '../../lib/tes-error-inspector.ts';

export class VersionManagementDO {
  private async handleBump(req: Request): Promise<Response> {
    try {
      // ... bump logic
    } catch (error) {
      const context: ErrorContext = {
        domain: 'VERSION_MANAGEMENT',
        scope: 'DUrable_OBJECT',
        operation: 'bump',
        entityId: body?.entityId,
      };
      
      logTESError(error, context, 'error');
      
      // Return structured error response
      return new Response(
        JSON.stringify({
          error: {
            code: 'BUMP_FAILED',
            message: error instanceof Error ? error.message : String(error),
            context,
            hsl: '#FF0000',
          },
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
}
```

---

## 5. **Logging & Telemetry Integration**

### Current Issue
No integration with existing telemetry infrastructure

### Better Approach
```typescript
import { logTESEvent } from '../../lib/production-utils.ts';

export class VersionManagementDO {
  private async handleBump(req: Request): Promise<Response> {
    const startTime = Date.now();
    
    try {
      // ... bump logic
      
      // Log successful bump
      await logTESEvent('version_bump_success', {
        scope,
        entityId,
        duration: Date.now() - startTime,
        entitiesBumped: bumped.length,
        hsl: '#9D4EDD',
      }, {
        threadGroup: 'VERSION_MANAGEMENT',
        threadId: '0x6001',
      });
      
      return response;
    } catch (error) {
      await logTESEvent('version_bump_failed', {
        scope,
        entityId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        hsl: '#FF0000',
      });
      
      throw error;
    }
  }
}
```

---

## 6. **WebSocket Lifecycle Management**

### Current Issue
Basic WebSocket handling, no connection state tracking

### Better Approach
```typescript
export class VersionManagementDO {
  private wsConnections = new Map<WebSocket, {
    id: string;
    connectedAt: number;
    lastActivity: number;
  }>();
  
  private async handleWebSocket(req: Request): Promise<Response> {
    const wsPair = new WebSocketPair();
    const [client, server] = Object.values(wsPair);
    
    this.state.acceptWebSocket(server);
    
    const connId = crypto.randomUUID();
    this.wsConnections.set(server, {
      id: connId,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
    });
    
    // Heartbeat to detect dead connections
    const heartbeat = setInterval(() => {
      if (server.readyState === WebSocket.READY_STATE_OPEN) {
        server.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      } else {
        clearInterval(heartbeat);
        this.wsConnections.delete(server);
      }
    }, 30000);
    
    server.addEventListener('message', async (ev) => {
      const conn = this.wsConnections.get(server);
      if (conn) conn.lastActivity = Date.now();
      
      // ... handle message
    });
    
    server.addEventListener('close', () => {
      clearInterval(heartbeat);
      this.wsConnections.delete(server);
    });
    
    server.addEventListener('error', (error) => {
      logTESError(error, {
        domain: 'VERSION_MANAGEMENT',
        scope: 'WEBSOCKET',
        connectionId: connId,
      });
      clearInterval(heartbeat);
      this.wsConnections.delete(server);
    });
    
    return new Response(null, {
      status: 101,
      webSocket: client,
      headers: { 'Sec-WebSocket-Protocol': 'tes-subproto-v1' },
    });
  }
}
```

---

## 7. **Worker Entry Point Strategy**

### Current Issue
Created `src/worker.ts` but `wrangler.toml` points to `src/workers/flux-veto-worker.ts`

### Better Approach
**Option A: Unified Worker**
```typescript
// src/workers/tes-worker.ts - Unified entry point
import { VersionManagementDO } from '../version-management-do.ts';
import fluxVetoHandler from './flux-veto-worker.ts';

export { VersionManagementDO };

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    
    // Route to version management DO
    if (url.pathname.startsWith('/version/')) {
      const doId = env.VERSION_DO.idFromName('tes-registry-v1');
      return env.VERSION_DO.get(doId).fetch(req);
    }
    
    // Route to flux-veto handler
    return fluxVetoHandler.fetch(req, env);
  },
};
```

**Option B: Separate Workers** (Better for isolation)
```toml
# wrangler.toml - Multiple workers
[[workers]]
name = "tes-version-management"
main = "src/worker.ts"
# ... DO bindings

[[workers]]
name = "tes-flux-veto"
main = "src/workers/flux-veto-worker.ts"
# ... KV bindings
```

---

## 8. **Data Migration Strategy**

### Current Issue
No way to migrate existing KV data to DO storage

### Better Approach
```typescript
export class VersionManagementDO {
  private async migrateFromKV(): Promise<void> {
    const migrationKey = 'migration:kv-to-do-complete';
    const migrated = await this.state.storage.get<boolean>(migrationKey);
    
    if (migrated) return; // Already migrated
    
    // Load from KV
    const kvRegistry = await this.env.KV.get('version-registry', { type: 'json' });
    
    if (kvRegistry) {
      // Validate and transform
      const registry = this.validateRegistry(kvRegistry);
      
      // Store in DO
      await this.state.storage.put('version-registry', registry);
      
      // Mark migration complete
      await this.state.storage.put(migrationKey, true);
      
      await logTESEvent('migration_complete', {
        source: 'KV',
        target: 'DO',
        entitiesMigrated: registry.length,
      });
    }
  }
  
  async fetch(req: Request): Promise<Response> {
    // Run migration on first access
    await this.migrateFromKV();
    // ... rest of handler
  }
}
```

---

## 9. **Testing Infrastructure**

### Current Issue
No tests for DO functionality

### Better Approach
```typescript
// test/version-management-do.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { VersionManagementDO } from '../src/version-management-do.ts';

describe('VersionManagementDO', () => {
  let doInstance: VersionManagementDO;
  let mockState: DurableObjectState;
  let mockEnv: VersionDOEnv;
  
  beforeEach(() => {
    // Mock DO state and env
    mockState = createMockDOState();
    mockEnv = createMockEnv();
    doInstance = new VersionManagementDO(mockState, mockEnv);
  });
  
  it('should bump version correctly', async () => {
    const req = new Request('https://test.com/bump', {
      method: 'POST',
      body: JSON.stringify({ scope: 'patch', entityId: 'global:main' }),
    });
    
    const response = await doInstance.fetch(req);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.bumped).toBeDefined();
    expect(data.signature).toBeDefined();
  });
  
  it('should handle WebSocket subprotocol negotiation', async () => {
    const req = new Request('https://test.com/', {
      headers: {
        'upgrade': 'websocket',
        'sec-websocket-protocol': 'tes-subproto-v1',
      },
    });
    
    const response = await doInstance.fetch(req);
    
    expect(response.status).toBe(101);
    expect(response.webSocket).toBeDefined();
  });
});
```

---

## 10. **Performance Optimizations**

### Current Issue
No caching, no batching, repeated key imports

### Better Approach
```typescript
export class VersionManagementDO {
  private signingKeyCache: CryptoKey | null = null;
  private registryCache: VersionedEntity[] | null = null;
  private cacheTimestamp = 0;
  private readonly CACHE_TTL = 60000; // 1 minute
  
  private async getSigningKey(): Promise<CryptoKey> {
    if (this.signingKeyCache) return this.signingKeyCache;
    
    const keyMaterial = await this.getKeyMaterial();
    this.signingKeyCache = await this.importKey(keyMaterial);
    return this.signingKeyCache;
  }
  
  private async getRegistry(cached = true): Promise<VersionedEntity[]> {
    if (cached && this.registryCache && Date.now() - this.cacheTimestamp < this.CACHE_TTL) {
      return this.registryCache;
    }
    
    const registry = await this.loadRegistry();
    this.registryCache = registry;
    this.cacheTimestamp = Date.now();
    return registry;
  }
  
  // Batch operations
  async batchBump(requests: BumpRequest[]): Promise<BumpResponse[]> {
    const registry = await this.getRegistry();
    const results: BumpResponse[] = [];
    
    // Process all bumps in single transaction
    for (const req of requests) {
      const bumped = this.cascadeBump(registry, req.scope, req.entityId);
      results.push({
        success: true,
        bumped,
        changes: this.computeChanges(registry, bumped),
        signature: await this.signResponse(bumped),
        timestamp: Date.now(),
      });
    }
    
    // Single storage write
    await this.state.storage.put('version-registry', registry);
    
    return results;
  }
}
```

---

## 11. **Configuration Management**

### Better Approach
```typescript
// src/config/do-config.ts
export interface DOConfig {
  registryId: string;
  signingKeyEnvVar: string;
  cacheTtl: number;
  alarmTimeout: number;
  maxWebSocketConnections: number;
}

export const DEFAULT_DO_CONFIG: DOConfig = {
  registryId: 'tes-registry-v1',
  signingKeyEnvVar: 'VERSION_SIGNING_KEY',
  cacheTtl: 60000,
  alarmTimeout: 300000,
  maxWebSocketConnections: 100,
};

// Use in DO class
export class VersionManagementDO {
  constructor(
    private state: DurableObjectState,
    private env: VersionDOEnv,
    private config: DOConfig = DEFAULT_DO_CONFIG
  ) {}
}
```

---

## Summary: Priority Improvements

1. **High Priority:**
   - Integrate with existing `VERSION_REGISTRY`
   - Add proper type safety
   - Move signing key to environment variables
   - Add error handling integration

2. **Medium Priority:**
   - Add logging/telemetry integration
   - Implement data migration strategy
   - Add comprehensive tests
   - Fix worker entry point strategy

3. **Low Priority:**
   - Performance optimizations (caching, batching)
   - Enhanced WebSocket lifecycle management
   - Configuration management abstraction

---

## Conclusion

The current implementation provides a solid foundation but would benefit from deeper integration with existing TES patterns, better type safety, and production-ready features like proper error handling, logging, and testing. The suggested improvements maintain the [BUN-FIRST] zero-npm philosophy while adding enterprise-grade reliability and observability.

