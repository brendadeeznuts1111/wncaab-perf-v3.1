/**
 * Endpoint Metadata Registry
 * 
 * Type-safe metadata for all API endpoints with schema validation.
 * Enables automated endpoint discovery and documentation generation.
 * 
 * TES-OPS-004.B.8: Retrospective Implementation - Type-Safe Metadata
 * 
 * Includes:
 * - API endpoints (JSON responses)
 * - Static file routes (file serving)
 * 
 * @module src/lib/endpoint-metadata
 */

/**
 * HTTP Method types
 */
export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'WS';

/**
 * JSON Schema type definition (simplified)
 * Used for request/response validation when Zod is not available
 */
export interface JsonSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  properties?: Record<string, JsonSchema>;
  required?: string[];
  enum?: (string | number)[];
  items?: JsonSchema;
  description?: string;
}

/**
 * Static file route metadata
 * 
 * These routes serve static files from the filesystem.
 * Generated from scripts/static-routes.ts manifest.
 */
export interface StaticRouteMetadata {
  /** HTTP method (always GET for static files) */
  method: 'GET';
  /** Route path */
  path: string;
  /** File system path */
  file: string;
  /** Human-readable description */
  description: string;
  /** Whether file is immutable (affects cache headers) */
  immutable: boolean;
  /** MIME type */
  contentType: string;
  /** Service category */
  service?: 'static';
  /** 
   * Structured cache metadata (machine-readable)
   * Replaces string parsing from description field
   */
  cache: {
    /** Cache duration in seconds */
    duration: number;
    /** Whether file is immutable (affects cache headers) */
    immutable: boolean;
    /** Cache type: public (CDN cacheable) or private (browser-only) */
    type: 'public' | 'private';
  };
}

/**
 * Get static route metadata from static-routes.ts manifest
 * 
 * Synchronous version that returns empty array if import fails.
 * Static routes are loaded dynamically in getAllEndpoints() to prevent circular dependencies.
 * 
 * @returns Array of static route metadata (empty array - loaded dynamically)
 */
export function getStaticRouteMetadata(): StaticRouteMetadata[] {
  // Return empty array - static routes are loaded dynamically in getAllEndpoints()
  // This prevents circular dependencies and allows graceful fallback
  return [];
}

/**
 * Endpoint metadata with schema validation
 */
export interface EndpointMetadata {
  /** HTTP method */
  method: HttpMethod;
  /** Route path */
  path: string;
  /** Human-readable description */
  description: string;
  /** Request body schema (JSON Schema format) */
  bodySchema?: JsonSchema;
  /** Query parameters schema (JSON Schema format) */
  querySchema?: JsonSchema;
  /** Response schema (JSON Schema format) */
  responseSchema?: JsonSchema;
  /** API version */
  version: string;
  /** Requires authentication */
  auth?: boolean;
  /** Rate limit (requests per minute) */
  rateLimit?: number;
  /** Service category (dev, worker, spline) */
  service?: 'dev' | 'worker' | 'spline';
}

/**
 * JSON Schema for bump version request body
 */
export const BumpVersionBodySchema: JsonSchema = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['major', 'minor', 'patch'],
      description: 'Version bump type'
    },
    entity: {
      type: 'string',
      description: 'Optional entity ID for targeted bump'
    }
  },
  required: []
};

/**
 * JSON Schema for version bump response
 */
export const VersionBumpResponseSchema: JsonSchema = {
  type: 'object',
  properties: {
    success: {
      type: 'boolean',
      description: 'Whether the bump was successful'
    },
    message: {
      type: 'string',
      description: 'Success message'
    },
    type: {
      type: 'string',
      enum: ['MAJOR', 'MINOR', 'PATCH'],
      description: 'Bump type that was applied'
    },
    entity: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        displayName: { type: 'string' },
        oldVersion: { type: 'string' },
        newVersion: { type: 'string' }
      }
    },
    affectedEntities: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          displayName: { type: 'string' },
          oldVersion: { type: 'string' },
          newVersion: { type: 'string' }
        }
      }
    },
    timestamp: {
      type: 'string',
      description: 'ISO timestamp of the operation'
    }
  },
  required: ['success', 'message', 'type', 'timestamp']
};

/**
 * JSON Schema for versions response
 */
export const VersionsResponseSchema: JsonSchema = {
  type: 'object',
  properties: {
    package: {
      type: 'object',
      properties: {
        version: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' }
      }
    },
    api: {
      type: 'object',
      properties: {
        version: { type: 'string' }
      }
    },
    components: {
      type: 'object',
      description: 'Component versions map'
    },
    entities: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          displayName: { type: 'string' },
          currentVersion: { type: 'string' },
          type: { type: 'string' }
        }
      }
    }
  }
};

/**
 * JSON Schema for status response
 */
export const StatusResponseSchema: JsonSchema = {
  type: 'object',
  properties: {
    timestamp: { type: 'string' },
    server: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        port: { type: 'number' },
        metrics: {
          type: 'object',
          properties: {
            pendingRequests: { type: 'number' },
            pendingWebSockets: { type: 'number' }
          }
        }
      }
    },
    services: { type: 'object' },
    workers: { type: 'object' },
    endpoints: { type: 'object' }
  }
};

/**
 * Endpoint Metadata Registry
 * 
 * Single source of truth for all API endpoint metadata.
 * Used for automated discovery, validation, and documentation generation.
 */
export const ENDPOINT_METADATA: Record<string, EndpointMetadata> = {
  // ============================================================================
  // Dev API Endpoints
  // ============================================================================
  
  '/api/dev/bump-version': {
    method: 'POST',
    path: '/api/dev/bump-version',
    description: 'Bump version for a component or entity',
    bodySchema: BumpVersionBodySchema,
    responseSchema: VersionBumpResponseSchema,
    version: 'v1.0',
    auth: false,
    service: 'dev'
  },
  
  '/api/dev/endpoints': {
    method: 'GET',
    path: '/api/dev/endpoints',
    description: 'List all API endpoints',
    responseSchema: {
      type: 'object',
      properties: {
        worker: { type: 'object' },
        spline: { type: 'object' },
        dev: { type: 'object' }
      }
    },
    version: 'v2.1.02',
    service: 'dev'
  },
  
  '/api/dev/endpoints/check': {
    method: 'GET',
    path: '/api/dev/endpoints/check',
    description: 'Check all endpoints with header metadata enrichment',
    version: 'v2.1.02',
    service: 'dev'
  },
  
  '/api/dev/versions': {
    method: 'GET',
    path: '/api/dev/versions',
    description: 'Get all component versions',
    responseSchema: VersionsResponseSchema,
    version: 'v2.1.02',
    service: 'dev'
  },
  
  '/api/dev/configs': {
    method: 'GET',
    path: '/api/dev/configs',
    description: 'Show all configs',
    responseSchema: {
      type: 'object',
      properties: {
        bunfig: { type: 'object' },
        'bun-ai': { type: 'object' }
      }
    },
    version: 'v2.1.02',
    service: 'dev'
  },
  
  '/api/dev/colors': {
    method: 'GET',
    path: '/api/dev/colors',
    description: 'Get color palette and usage stats',
    version: 'v2.1.02',
    service: 'dev'
  },
  
  '/api/dev/workers': {
    method: 'GET',
    path: '/api/dev/workers',
    description: 'Worker telemetry',
    responseSchema: {
      type: 'object',
      properties: {
        workers: { type: 'object' },
        summary: { type: 'object' }
      }
    },
    version: 'v2.1.02',
    service: 'dev'
  },
  
  '/api/dev/status': {
    method: 'GET',
    path: '/api/dev/status',
    description: 'System status',
    responseSchema: StatusResponseSchema,
    version: 'v2.1.02',
    service: 'dev'
  },
  
  '/api/dev/metrics': {
    method: 'GET',
    path: '/api/dev/metrics',
    description: 'Server metrics (pendingRequests, pendingWebSockets)',
    responseSchema: {
      type: 'object',
      properties: {
        pendingRequests: { type: 'number' },
        pendingWebSockets: { type: 'number' }
      }
    },
    version: 'v2.1.02',
    service: 'dev'
  },
  
  '/api/dev/event-loop': {
    method: 'GET',
    path: '/api/dev/event-loop',
    description: 'Event loop monitoring metrics',
    version: 'v2.1.02',
    service: 'dev'
  },
  
  '/api/dev/:endpoint': {
    method: 'GET',
    path: '/api/dev/:endpoint',
    description: 'Parameter route for unknown dev endpoints (returns validation error)',
    version: 'v2.1',
    service: 'dev'
  }
};

/**
 * Validate metadata against route handlers
 * 
 * Checks that all metadata entries have corresponding route handlers
 * and that all routes have corresponding metadata.
 * 
 * @param routes - Bun.serve() routes object
 * @returns Validation result with mismatches
 */
export function validateMetadataAgainstRoutes(
  routes: Record<string, unknown>
): {
  valid: boolean;
  missingMetadata: string[];
  orphanedMetadata: string[];
  warnings: string[];
} {
  const routeKeys = new Set(Object.keys(routes));
  const metadataKeys = new Set(Object.keys(ENDPOINT_METADATA));
  
  const missingMetadata: string[] = [];
  const orphanedMetadata: string[] = [];
  const warnings: string[] = [];
  
  // Find routes without metadata (excluding catch-all routes)
  for (const routeKey of routeKeys) {
    if (routeKey === '/*' || routeKey.startsWith('/api/*')) {
      continue; // Skip catch-all routes
    }
    
    // Check exact match
    if (!metadataKeys.has(routeKey)) {
      // Check if it's a parameter route that might match
      const isParameterRoute = routeKey.includes(':');
      if (!isParameterRoute) {
        missingMetadata.push(routeKey);
      }
    }
  }
  
  // Find metadata without routes
  for (const metadataKey of metadataKeys) {
    if (!routeKeys.has(metadataKey)) {
      // Check if it's a parameter route
      const isParameterRoute = metadataKey.includes(':');
      if (isParameterRoute) {
        // Parameter routes might still be valid
        const basePath = metadataKey.split(':')[0];
        const hasMatchingRoute = Array.from(routeKeys).some(key => 
          key.startsWith(basePath) || key === metadataKey.replace(/:[^/]+/g, '*')
        );
        if (!hasMatchingRoute) {
          orphanedMetadata.push(metadataKey);
        }
      } else {
        orphanedMetadata.push(metadataKey);
      }
    }
  }
  
  // Validate metadata structure
  for (const [path, metadata] of Object.entries(ENDPOINT_METADATA)) {
    if (metadata.path !== path) {
      warnings.push(`Metadata path mismatch: ${path} has path ${metadata.path}`);
    }
  }
  
  return {
    valid: missingMetadata.length === 0 && orphanedMetadata.length === 0,
    missingMetadata,
    orphanedMetadata,
    warnings
  };
}

/**
 * Get metadata for a specific endpoint
 * 
 * @param path - Endpoint path
 * @returns Endpoint metadata or undefined
 */
export function getEndpointMetadata(path: string): EndpointMetadata | undefined {
  return ENDPOINT_METADATA[path];
}

/**
 * Get all metadata entries (API + Static routes)
 * 
 * Combines API endpoint metadata with static route metadata.
 * 
 * @returns Combined metadata registry
 */
export function getAllMetadata(): Record<string, EndpointMetadata | StaticRouteMetadata> {
  const staticRoutes = getStaticRouteMetadata();
  const combined: Record<string, EndpointMetadata | StaticRouteMetadata> = { ...ENDPOINT_METADATA };
  
  // Add static routes to combined registry
  for (const staticRoute of staticRoutes) {
    combined[staticRoute.path] = staticRoute;
  }
  
  return combined;
}

