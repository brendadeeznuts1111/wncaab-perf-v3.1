/**
 * TES-OPS-004.B: Advanced Version Management Framework
 * 
 * Central registry of all versioned entities in TES with metadata-driven configuration.
 * This is the single source of truth for all 40+ versioned entities.
 * 
 * @module src/config/version-registry
 */

/**
 * Type of versioned entity
 */
export type EntityType = 'global' | 'component' | 'api-scope' | 'cli-tool' | 'documentation';

/**
 * Update strategy for versioned entities
 */
export type UpdateStrategy = 'linked-to-parent' | 'independent';

/**
 * File pattern configuration for version updates
 */
export interface FilePattern {
  /** File path relative to project root */
  path: string;
  /** Regex pattern to find version strings (with capture groups) */
  pattern: string;
  /** Replacement template (use $1, $2, etc. for capture groups) */
  replacement: string;
  /** Description of what this pattern matches */
  description: string;
  /** Default version to use if pattern not found in file (optional) */
  defaultVersion?: string;
  /** Whether this file is required (throws error if missing) */
  required?: boolean;
}

/**
 * Versioned Entity Metadata Schema
 * 
 * Defines all metadata for a versioned entity in TES.
 */
export interface VersionedEntity {
  /** Unique identifier (e.g., 'global:main', 'component:betting-glossary', 'api:glossary:v2.1') */
  id: string;
  /** Type of entity */
  type: EntityType;
  /** Current version (read dynamically from files) */
  currentVersion: string;
  /** Array of file paths and patterns to update */
  files: FilePattern[];
  /** Update strategy */
  updateStrategy: UpdateStrategy;
  /** Parent version ID for linked entities (e.g., 'global:main') */
  parentVersionId?: string;
  /** Whether to display in dashboard UI */
  displayInUi: boolean;
  /** API endpoint prefix for api-scope types (e.g., '/api/glossary') */
  apiEndpointPrefix?: string;
  /** CLI command name for cli-tool types */
  cliCommandName?: string;
  /** Human-readable display name */
  displayName: string;
  /** Description of the entity */
  description?: string;
}

/**
 * Version Registry - Single Source of Truth
 * 
 * Contains all 40+ versioned entities in TES with their metadata.
 * This registry is used by the bump utility, dashboard UI, and API endpoints.
 */
export const VERSION_REGISTRY: VersionedEntity[] = [
  // ============================================================================
  // GLOBAL ENTITIES
  // ============================================================================
  {
    id: 'global:main',
    type: 'global',
    currentVersion: '3.1.0', // Read from package.json
    displayName: 'Main Package',
    description: 'Project-wide version in package.json',
    updateStrategy: 'independent',
    displayInUi: true,
    files: [
      {
        path: 'package.json',
        pattern: '"version":\\s*"(\\d+\\.\\d+\\.\\d+)"',
        replacement: '"version": "$1"',
        description: 'package.json version field',
        required: true,
      },
    ],
  },
  {
    id: 'global:api-version',
    type: 'global',
    currentVersion: '1.6.0', // Read from lib/constants.ts
    displayName: 'API Version',
    description: 'Tension Mapping API version',
    updateStrategy: 'independent',
    displayInUi: true,
    files: [
      {
        path: 'lib/constants.ts',
        pattern: "let packageVersion = '(\\d+\\.\\d+\\.\\d+)';",
        replacement: "let packageVersion = '$1';",
        description: 'API version constant',
      },
    ],
  },

  // ============================================================================
  // COMPONENT ENTITIES
  // ============================================================================
  {
    id: 'component:betting-glossary',
    type: 'component',
    currentVersion: '2.1.02',
    displayName: 'Betting Glossary',
    description: 'Enhanced betting terminology API with search, autocomplete, and relationships',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'global:main',
    displayInUi: true,
    files: [
      {
        path: 'src/config/component-versions.ts',
        pattern: "export const BETTING_GLOSSARY_VERSION = '(\\d+\\.\\d+\\.\\d+)';",
        replacement: "export const BETTING_GLOSSARY_VERSION = '$1';",
        description: 'Betting Glossary version constant',
      },
      {
        path: 'docs/BETTING-GLOSSARY.md',
        pattern: '# 📚 Betting Glossary - Enhanced Complete Reference \\(v(\\d+\\.\\d+\\.\\d+)\\)',
        replacement: '# 📚 Betting Glossary - Enhanced Complete Reference (v$1)',
        description: 'Header title version',
      },
      {
        path: 'docs/BETTING-GLOSSARY.md',
        pattern: '\\*\\*Version:\\*\\* (\\d+\\.\\d+\\.\\d+)',
        replacement: '**Version:** $1',
        description: 'Version metadata field',
      },
      {
        path: 'lib/betting-glossary.ts',
        pattern: 'Betting Glossary - Enhanced Comprehensive Implementation \\(v(\\d+\\.\\d+\\.\\d+)\\)',
        replacement: 'Betting Glossary - Enhanced Comprehensive Implementation (v$1)',
        description: 'File header comment version',
      },
      {
        path: 'templates/glossary.html',
        pattern: '<meta name="version" content="(\\d+\\.\\d+\\.\\d+)">',
        replacement: '<meta name="version" content="$1">',
        description: 'HTML meta version tag',
      },
    ],
  },
  {
    id: 'component:tension-api',
    type: 'component',
    currentVersion: '1.6.0',
    displayName: 'Tension API',
    description: 'Tension mapping and batch processing API',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'global:api-version',
    displayInUi: true,
    files: [
      {
        path: 'src/config/component-versions.ts',
        pattern: "export const TENSION_API_VERSION = '(\\d+\\.\\d+\\.\\d+)';",
        replacement: "export const TENSION_API_VERSION = '$1';",
        description: 'Tension API version constant',
      },
    ],
  },
  {
    id: 'component:ai-maparse',
    type: 'component',
    currentVersion: '1.4.2',
    displayName: 'AI Maparse',
    description: 'AI-powered auto-maparse curve detection and model management',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'global:main',
    displayInUi: true,
    files: [
      {
        path: 'src/config/component-versions.ts',
        pattern: "export const AI_MAPARSE_VERSION = '(\\d+\\.\\d+\\.\\d+)';",
        replacement: "export const AI_MAPARSE_VERSION = '$1';",
        description: 'AI Maparse version constant',
      },
    ],
  },
  {
    id: 'component:gauge-api',
    type: 'component',
    currentVersion: '1.4.2',
    displayName: 'Gauge API',
    description: 'WNBATOR Gauge API for women\'s sports metrics',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'global:main',
    displayInUi: true,
    files: [
      {
        path: 'src/config/component-versions.ts',
        pattern: "export const GAUGE_API_VERSION = '(\\d+\\.\\d+\\.\\d+)';",
        replacement: "export const GAUGE_API_VERSION = '$1';",
        description: 'Gauge API version constant',
      },
    ],
  },
  {
    id: 'component:worker-management',
    type: 'component',
    currentVersion: '1.0.0',
    displayName: 'Worker Management',
    description: 'Worker pool and lifecycle management',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'global:main',
    displayInUi: true,
    files: [
      {
        path: 'src/config/component-versions.ts',
        pattern: "export const WORKER_MANAGEMENT_VERSION = '(\\d+\\.\\d+\\.\\d+)';",
        replacement: "export const WORKER_MANAGEMENT_VERSION = '$1';",
        description: 'Worker Management version constant',
      },
    ],
  },
  {
    id: 'component:dev-server',
    type: 'component',
    currentVersion: '2.1.02',
    displayName: 'Dev Server',
    description: 'Development server API for monitoring, configuration, and management',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'global:main',
    displayInUi: true,
    files: [
      {
        path: 'src/config/component-versions.ts',
        pattern: "export const DEV_SERVER_VERSION = '(\\d+\\.\\d+\\.\\d+)';",
        replacement: "export const DEV_SERVER_VERSION = '$1';",
        description: 'Dev Server version constant',
      },
      {
        path: 'scripts/dev-server.ts',
        pattern: 'Dev Server - Unified API Dashboard \\(v(\\d+\\.\\d+\\.\\d+)\\)',
        replacement: 'Dev Server - Unified API Dashboard (v$1)',
        description: 'Dev server header comment',
      },
    ],
  },
  {
    id: 'component:endpoint-checker',
    type: 'component',
    currentVersion: '2.0.0',
    displayName: 'Endpoint Checker',
    description: 'Critical operational tool for endpoint verification and health checks',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'global:main',
    displayInUi: true,
    files: [
      {
        path: 'src/config/component-versions.ts',
        pattern: "export const ENDPOINT_CHECKER_VERSION = '(\\d+\\.\\d+\\.\\d+)';",
        replacement: "export const ENDPOINT_CHECKER_VERSION = '$1';",
        description: 'Endpoint Checker version constant',
      },
      {
        path: 'lib/endpoint-checker.ts',
        pattern: "export const VERSION = ['\"]v?(\\d+\\.\\d+\\.\\d+)['\"];",
        replacement: "export const VERSION = 'v$1';",
        description: 'Endpoint Checker VERSION constant',
      },
    ],
  },
  {
    id: 'component:spline-api',
    type: 'component',
    currentVersion: '1.0',
    displayName: 'Spline API',
    description: 'Spline path rendering, prediction, and preset management',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'global:main',
    displayInUi: true,
    files: [
      {
        path: 'src/config/component-versions.ts',
        pattern: "export const SPLINE_API_VERSION = '(\\d+\\.\\d+(?:\\.\\d+)?)';",
        replacement: "export const SPLINE_API_VERSION = '$1';",
        description: 'Spline API version constant',
      },
      {
        path: 'scripts/spline-api.ts',
        pattern: "export const VERSION = ['\"]v?(\\d+\\.\\d+(?:\\.\\d+)?)['\"];",
        replacement: "export const VERSION = 'v$1';",
        description: 'Spline API VERSION constant',
      },
    ],
  },
  {
    id: 'component:validation-threshold',
    type: 'component',
    currentVersion: '1.4.2',
    displayName: 'Validation Threshold',
    description: 'Threshold validator with auto-correction capabilities',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'global:main',
    displayInUi: true,
    files: [
      {
        path: 'src/config/component-versions.ts',
        pattern: "export const VALIDATION_THRESHOLD_VERSION = '(\\d+\\.\\d+\\.\\d+)';",
        replacement: "export const VALIDATION_THRESHOLD_VERSION = '$1';",
        description: 'Validation Threshold version constant',
      },
      {
        path: 'macros/validate-threshold.ts',
        pattern: "export const VERSION = ['\"]v?(\\d+\\.\\d+\\.\\d+)['\"];",
        replacement: "export const VERSION = 'v$1';",
        description: 'Validation Threshold VERSION constant',
      },
      {
        path: 'macros/validate-threshold.ts',
        pattern: '\\* Enhanced Threshold Validator - Auto-Corrects Arithmetic Expressions \\(v(\\d+\\.\\d+\\.\\d+)\\)',
        replacement: '* Enhanced Threshold Validator - Auto-Corrects Arithmetic Expressions (v$1)',
        description: 'Validation Threshold header comment version',
      },
    ],
  },
  {
    id: 'component:tension-visualizer',
    type: 'component',
    currentVersion: '1.0.0',
    displayName: 'Tension Visualizer',
    description: 'Tension Mapping Visualizer - Real-time color generation visualizer for conflict, entropy, and tension mapping',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'global:main',
    displayInUi: true,
    files: [
      {
        path: 'src/config/component-versions.ts',
        pattern: "export const TENSION_VISUALIZER_VERSION = '(\\d+\\.\\d+\\.\\d+)';",
        replacement: "export const TENSION_VISUALIZER_VERSION = '$1';",
        description: 'Tension Visualizer version constant',
      },
      {
        path: 'templates/tension.html',
        pattern: '<meta http-equiv="X-APEX-Version" content="(\\d+\\.\\d+\\.\\d+)">',
        replacement: '<meta http-equiv="X-APEX-Version" content="$1">',
        description: 'HTML meta version tag',
      },
      {
        path: 'scripts/dev-server.ts',
        pattern: "'X-APEX-Version':\\s*TENSION_VISUALIZER_VERSION",
        replacement: "'X-APEX-Version': TENSION_VISUALIZER_VERSION",
        description: 'Dev server route header version',
      },
    ],
  },

  // ============================================================================
  // API SCOPE ENTITIES
  // ============================================================================
  {
    id: 'api:glossary',
    type: 'api-scope',
    currentVersion: '2.1.02',
    displayName: 'Glossary API',
    description: 'Enhanced betting terminology API endpoints',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'component:betting-glossary',
    displayInUi: true,
    apiEndpointPrefix: '/api/glossary',
    files: [
      // API endpoint versions are dynamically referenced in dev-server.ts
      // No direct file updates needed - they use component version constants
    ],
  },
  {
    id: 'api:gauge',
    type: 'api-scope',
    currentVersion: '1.4.2',
    displayName: 'Gauge API',
    description: 'WNBATOR Gauge API endpoints',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'component:gauge-api',
    displayInUi: true,
    apiEndpointPrefix: '/api/gauge',
    files: [],
  },
  {
    id: 'api:ai',
    type: 'api-scope',
    currentVersion: '1.4.2',
    displayName: 'AI Maparse API',
    description: 'AI-powered auto-maparse curve detection endpoints',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'component:ai-maparse',
    displayInUi: true,
    apiEndpointPrefix: '/api/ai',
    files: [],
  },
  {
    id: 'api:validate',
    type: 'api-scope',
    currentVersion: '1.4.2',
    displayName: 'Validation API',
    description: 'Threshold validator endpoints',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'component:validation-threshold',
    displayInUi: true,
    apiEndpointPrefix: '/api/validate',
    files: [],
  },
  {
    id: 'api:tension',
    type: 'api-scope',
    currentVersion: '1.6.0',
    displayName: 'Tension API',
    description: 'Tension mapping endpoints',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'component:tension-api',
    displayInUi: true,
    apiEndpointPrefix: '/api/tension',
    files: [],
  },
  {
    id: 'api:spline',
    type: 'api-scope',
    currentVersion: '1.0',
    displayName: 'Spline API',
    description: 'Spline path rendering endpoints',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'component:spline-api',
    displayInUi: true,
    apiEndpointPrefix: '/api/spline',
    files: [],
  },
  {
    id: 'api:dev',
    type: 'api-scope',
    currentVersion: '2.1.02',
    displayName: 'Dev API',
    description: 'Development server API endpoints',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'component:dev-server',
    displayInUi: true,
    apiEndpointPrefix: '/api/dev',
    files: [],
  },
  {
    id: 'api:bet-type',
    type: 'api-scope',
    currentVersion: '1.0.0',
    displayName: 'Bet Type API',
    description: 'Bet-type pattern detection endpoints',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'global:main',
    displayInUi: true,
    apiEndpointPrefix: '/api/bet-type',
    files: [],
  },
  {
    id: 'api:system',
    type: 'api-scope',
    currentVersion: '1.0.0',
    displayName: 'System API',
    description: 'System lifecycle and worker management endpoints',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'component:worker-management',
    displayInUi: true,
    apiEndpointPrefix: '/api/system',
    files: [],
  },
  {
    id: 'api:bookmakers',
    type: 'api-scope',
    currentVersion: '1.0.0',
    displayName: 'Bookmaker API',
    description: 'Bookmaker registry and feature flag management endpoints',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'global:main',
    displayInUi: true,
    apiEndpointPrefix: '/api/bookmakers',
    files: [],
  },
  {
    id: 'api:registry',
    type: 'api-scope',
    currentVersion: '1.0.0',
    displayName: 'Registry API',
    description: 'Registry API for R2 URLs, profiles, manifests, and tier distribution',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'global:main',
    displayInUi: true,
    apiEndpointPrefix: '/api/registry',
    files: [],
  },
  {
    id: 'api:feature-flags',
    type: 'api-scope',
    currentVersion: '1.0.0',
    displayName: 'Feature Flags API',
    description: 'Feature flag management and control endpoints',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'global:main',
    displayInUi: true,
    apiEndpointPrefix: '/api/feature-flags',
    files: [],
  },
  {
    id: 'api:feeds',
    type: 'api-scope',
    currentVersion: '1.0.0',
    displayName: 'Feeds API',
    description: 'Complete feed matrix endpoints',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'global:main',
    displayInUi: true,
    apiEndpointPrefix: '/api/feeds',
    files: [],
  },
  {
    id: 'api:shadow-ws',
    type: 'api-scope',
    currentVersion: '1.0.0',
    displayName: 'Shadow WebSocket API',
    description: 'Shadow WebSocket server status and health monitoring endpoints',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'global:main',
    displayInUi: true,
    apiEndpointPrefix: '/api/shadow-ws',
    files: [],
  },
  {
    id: 'api:lifecycle',
    type: 'api-scope',
    currentVersion: '1.0.0',
    displayName: 'Lifecycle API',
    description: 'TES lifecycle management endpoints',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'component:worker-management',
    displayInUi: true,
    apiEndpointPrefix: '/api/lifecycle',
    files: [],
  },

  // ============================================================================
  // CLI TOOL ENTITIES
  // ============================================================================
  {
    id: 'cli:map-edge',
    type: 'cli-tool',
    currentVersion: '1.6.0',
    displayName: 'Edge Mapping CLI',
    description: 'Tension-Color Engine CLI tool',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'component:tension-api',
    displayInUi: false,
    cliCommandName: 'map-edge',
    files: [
      {
        path: 'scripts/map-edge.ts',
        pattern: '\\* Edge Mapping CLI - Tension-Color Engine \\(v(\\d+\\.\\d+\\.\\d+)\\)',
        replacement: '* Edge Mapping CLI - Tension-Color Engine (v$1)',
        description: 'Edge Mapping CLI header comment',
      },
      {
        path: 'scripts/map-edge.ts',
        pattern: '\\* @version (\\d+\\.\\d+\\.\\d+)',
        replacement: '* @version $1',
        description: 'Edge Mapping CLI @version annotation',
      },
    ],
  },
  {
    id: 'cli:graph-propagation',
    type: 'cli-tool',
    currentVersion: '1.4.1',
    displayName: 'Graph Propagation CLI',
    description: 'CLI Output Absorption Hook for Graph Propagation',
    // TES-OPS-004.B.2.A.3: Intentionally independent - utility tool with flexible release cycle
    // Version mismatch (v1.4.1 vs tension-api v1.6.0) indicates intentional independence
    // Business requirement: CLI tools should have flexible release cycles independent of components
    updateStrategy: 'independent',
    displayInUi: false,
    cliCommandName: 'cli-absorb',
    files: [
      {
        path: 'graph-propagation/cli-absorb.ts',
        pattern: '\\* CLI Output Absorption Hook - Graph Propagation \\(v(\\d+\\.\\d+\\.\\d+)\\)',
        replacement: '* CLI Output Absorption Hook - Graph Propagation (v$1)',
        description: 'Graph Propagation CLI header comment',
      },
    ],
  },
  {
    id: 'cli:static-routes',
    type: 'cli-tool',
    currentVersion: '1.2.0',
    displayName: 'Static Routes Manifest',
    description: 'Optimized File Serving Strategy CLI',
    // TES-OPS-004.B.2.A.3: Intentionally independent - utility tool with flexible release cycle
    // Version mismatch (v1.2.0 vs dev-server v2.1.02) indicates intentional independence
    // Business requirement: CLI tools should have flexible release cycles independent of components
    updateStrategy: 'independent',
    displayInUi: false,
    cliCommandName: 'static-routes',
    files: [
      {
        path: 'scripts/static-routes.ts',
        pattern: '\\* Static Routes Manifest - Optimized File Serving Strategy \\(v(\\d+\\.\\d+\\.\\d+)\\)',
        replacement: '* Static Routes Manifest - Optimized File Serving Strategy (v$1)',
        description: 'Static Routes header comment',
      },
      {
        path: 'scripts/static-routes.ts',
        pattern: '@version (\\d+\\.\\d+\\.\\d+)',
        replacement: '@version $1',
        description: 'Static Routes version annotation',
      },
    ],
  },

  // ============================================================================
  // DOCUMENTATION ENTITIES
  // ============================================================================
  {
    id: 'doc:telegram',
    type: 'documentation',
    currentVersion: '2.0.0',
    displayName: 'Telegram Documentation',
    description: 'Telegram integration documentation',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'global:main',
    displayInUi: false,
    files: [
      {
        path: 'docs/TELEGRAM.md',
        pattern: '\\*\\*Version:\\*\\* `(\\d+\\.\\d+\\.\\d+)`',
        replacement: '**Version:** `$1`',
        description: 'Telegram documentation version header',
      },
      {
        path: 'docs/TELEGRAM.md',
        pattern: '\\*\\*v(\\d+\\.\\d+\\.\\d+)\\*\\* - Enhanced with cooldowns',
        replacement: '**v$1** - Enhanced with cooldowns',
        description: 'Telegram version history entry',
      },
    ],
  },
  {
    id: 'doc:production-system',
    type: 'documentation',
    currentVersion: '1.2.0',
    displayName: 'Production System Documentation',
    description: 'Production system architecture documentation',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'global:main',
    displayInUi: false,
    files: [
      {
        path: 'docs/PRODUCTION-SYSTEM.md',
        pattern: '\\*\\*Version:\\*\\* `(\\d+\\.\\d+\\.\\d+)`',
        replacement: '**Version:** `$1`',
        description: 'Production System documentation version header',
      },
      {
        path: 'docs/PRODUCTION-SYSTEM.md',
        pattern: '\\*\\*v(\\d+\\.\\d+\\.\\d+)\\*\\* - Enhanced with descriptive field names',
        replacement: '**v$1** - Enhanced with descriptive field names',
        description: 'Production System version history entry',
      },
    ],
  },
  {
    id: 'doc:status',
    type: 'documentation',
    currentVersion: '1.0.0',
    displayName: 'Status Documentation',
    description: 'Project status documentation',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'global:main',
    displayInUi: false,
    files: [
      {
        path: 'STATUS.md',
        pattern: '\\*\\*Version:\\*\\* `(\\d+\\.\\d+\\.\\d+)`',
        replacement: '**Version:** `$1`',
        description: 'Status documentation version header',
      },
    ],
  },
  {
    id: 'doc:port',
    type: 'documentation',
    currentVersion: '1.0.0',
    displayName: 'Port Documentation',
    description: 'Port configuration documentation',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'global:main',
    displayInUi: false,
    files: [
      {
        path: 'PORT.md',
        pattern: '\\*\\*Version:\\*\\* `(\\d+\\.\\d+\\.\\d+)`',
        replacement: '**Version:** `$1`',
        description: 'Port documentation version header',
      },
    ],
  },
  {
    id: 'doc:commands',
    type: 'documentation',
    currentVersion: '1.0.0',
    displayName: 'Commands Documentation',
    description: 'CLI commands documentation',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'global:main',
    displayInUi: false,
    files: [
      {
        path: 'COMMANDS.md',
        pattern: '\\*\\*Version:\\*\\* `(\\d+\\.\\d+\\.\\d+)`',
        replacement: '**Version:** `$1`',
        description: 'Commands documentation version header',
      },
    ],
  },
  {
    id: 'doc:index',
    type: 'documentation',
    currentVersion: '1.1.0',
    displayName: 'Index Documentation',
    description: 'Documentation index',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'global:main',
    displayInUi: false,
    files: [
      {
        path: 'docs/INDEX.md',
        pattern: '\\*\\*v(\\d+\\.\\d+\\.\\d+)\\*\\* - Added Issues Tracking section',
        replacement: '**v$1** - Added Issues Tracking section',
        description: 'Index documentation version history entry',
      },
    ],
  },
  {
    id: 'doc:tags-reference',
    type: 'documentation',
    currentVersion: '1.0.0',
    displayName: 'Tags Reference Documentation',
    description: 'Tag reference documentation',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'global:main',
    displayInUi: false,
    files: [
      {
        path: 'docs/TAGS-REFERENCE.md',
        pattern: '\\*\\*v(\\d+\\.\\d+\\.\\d+)\\*\\* - Initial tag reference',
        replacement: '**v$1** - Initial tag reference',
        description: 'Tags Reference documentation version history entry',
      },
    ],
  },
  {
    id: 'doc:telegram-config-template',
    type: 'documentation',
    currentVersion: '1.8.0',
    displayName: 'Telegram Config Template Documentation',
    description: 'Telegram supergroup configuration template documentation',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'global:main',
    displayInUi: false,
    files: [
      {
        path: 'docs/TELEGRAM-CONFIG-TEMPLATE.md',
        pattern: '\\*\\*Version:\\*\\* `(\\d+\\.\\d+\\.\\d+)`',
        replacement: '**Version:** `$1`',
        description: 'Telegram Config Template documentation version header',
      },
    ],
  },
  {
    id: 'doc:betting-glossary',
    type: 'documentation',
    currentVersion: '2.1.02',
    displayName: 'Betting Glossary Documentation',
    description: 'Enhanced betting glossary complete reference documentation',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'component:betting-glossary',
    displayInUi: false,
    files: [
      {
        path: 'docs/BETTING-GLOSSARY.md',
        pattern: '# 📚 Betting Glossary - Enhanced Complete Reference \\(v(\\d+\\.\\d+\\.\\d+)\\)',
        replacement: '# 📚 Betting Glossary - Enhanced Complete Reference (v$1)',
        description: 'Header title version',
      },
      {
        path: 'docs/BETTING-GLOSSARY.md',
        pattern: '\\*\\*Version:\\*\\* (\\d+\\.\\d+\\.\\d+)',
        replacement: '**Version:** $1',
        description: 'Version metadata field',
      },
    ],
  },
  {
    id: 'file:betting-glossary-impl',
    type: 'documentation',
    currentVersion: '2.1.02',
    displayName: 'Betting Glossary Implementation',
    description: 'Betting glossary TypeScript implementation file',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'component:betting-glossary',
    displayInUi: false,
    files: [
      {
        path: 'lib/betting-glossary.ts',
        pattern: 'Betting Glossary - Enhanced Comprehensive Implementation \\(v(\\d+\\.\\d+\\.\\d+)\\)',
        replacement: 'Betting Glossary - Enhanced Comprehensive Implementation (v$1)',
        description: 'File header comment version',
      },
    ],
  },
  {
    id: 'file:glossary-template',
    type: 'documentation',
    currentVersion: '2.1.02',
    displayName: 'Glossary HTML Template',
    description: 'Glossary HTML template file',
    updateStrategy: 'linked-to-parent',
    parentVersionId: 'component:betting-glossary',
    displayInUi: false,
    files: [
      {
        path: 'templates/glossary.html',
        pattern: '<meta name="version" content="(\\d+\\.\\d+\\.\\d+)">',
        replacement: '<meta name="version" content="$1">',
        description: 'HTML meta version tag',
      },
    ],
  },
];

/**
 * Get entity by ID
 */
export function getEntity(id: string): VersionedEntity | undefined {
  return VERSION_REGISTRY.find(entity => entity.id === id);
}

/**
 * Get all entities
 */
export function getAllEntities(): VersionedEntity[] {
  return VERSION_REGISTRY;
}

/**
 * Get entities by type
 */
export function getEntitiesByType(type: EntityType): VersionedEntity[] {
  return VERSION_REGISTRY.filter(entity => entity.type === type);
}

/**
 * Get entities linked to a parent
 */
export function getLinkedEntities(parentId: string): VersionedEntity[] {
  return VERSION_REGISTRY.filter(entity => entity.parentVersionId === parentId);
}

/**
 * Get entities that should be displayed in UI
 */
export function getDisplayableEntities(): VersionedEntity[] {
  return VERSION_REGISTRY.filter(entity => entity.displayInUi);
}

/**
 * Get all entities that would be affected by bumping a parent entity
 */
export function getAffectedEntities(entityId: string): VersionedEntity[] {
  const entity = getEntity(entityId);
  if (!entity) return [];
  
  const affected: VersionedEntity[] = [entity];
  
  // If entity has linked children, include them recursively
  const linked = getLinkedEntities(entityId);
  for (const child of linked) {
    affected.push(...getAffectedEntities(child.id));
  }
  
  return affected;
}

