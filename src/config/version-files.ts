/**
 * Version Files Configuration
 * 
 * Defines all files that contain version references and the patterns
 * used to find and replace version strings.
 * 
 * @module src/config/version-files
 */

export interface VersionFilePattern {
  /** File path relative to project root */
  path: string;
  /** Array of regex patterns to find version strings */
  patterns: Array<{
    /** Regex pattern (with capture groups for version) */
    regex: RegExp;
    /** Replacement template (use $1, $2, etc. for capture groups) */
    replacement: string;
    /** Description of what this pattern matches */
    description: string;
  }>;
  /** Whether this file is required (throws error if missing) */
  required?: boolean;
}

/**
 * Version file patterns for TES project
 * 
 * These patterns are used by the bump utility to update version references
 * across the codebase. Patterns are ordered by specificity (most specific first).
 */
export const VERSION_FILES: VersionFilePattern[] = [
  // Package.json - canonical source
  {
    path: 'package.json',
    required: true,
    patterns: [
      {
        regex: /"version":\s*"(\d+\.\d+\.\d+)"/,
        replacement: '"version": "$1"',
        description: 'package.json version field',
      },
    ],
  },

  // Documentation files
  {
    path: 'docs/BETTING-GLOSSARY.md',
    patterns: [
      {
        regex: /# 📚 Betting Glossary - Enhanced Complete Reference \(v(\d+\.\d+\.\d+)\)/,
        replacement: '# 📚 Betting Glossary - Enhanced Complete Reference (v$1)',
        description: 'Header title version',
      },
      {
        regex: /\*\*Version:\*\* (\d+\.\d+\.\d+)/,
        replacement: '**Version:** $1',
        description: 'Version metadata field',
      },
      {
        regex: /Version (\d+\.\d+\.\d+) includes enhanced/,
        replacement: 'Version $1 includes enhanced',
        description: 'Overview text version reference',
      },
    ],
  },

  // Implementation files
  {
    path: 'lib/betting-glossary.ts',
    patterns: [
      {
        regex: /Betting Glossary - Enhanced Comprehensive Implementation \(v(\d+\.\d+\.\d+)\)/,
        replacement: 'Betting Glossary - Enhanced Comprehensive Implementation (v$1)',
        description: 'File header comment version',
      },
    ],
  },

  // HTML templates
  {
    path: 'templates/glossary.html',
    patterns: [
      {
        regex: /<meta name="version" content="(\d+\.\d+\.\d+)">/,
        replacement: '<meta name="version" content="$1">',
        description: 'HTML meta version tag',
      },
    ],
  },

  // Dev server - multiple patterns
  {
    path: 'scripts/dev-server.ts',
    patterns: [
      {
        regex: /Dev Server - Unified API Dashboard \(v(\d+\.\d+\.\d+)\)/,
        replacement: 'Dev Server - Unified API Dashboard (v$1)',
        description: 'Dev server header comment',
      },
      {
        regex: /Enhanced Betting Glossary v(\d+\.\d+\.\d+)/,
        replacement: 'Enhanced Betting Glossary v$1',
        description: 'Dashboard display text',
      },
      {
        regex: /version:\s*['"]v(\d+\.\d+\.\d+)['"]/g,
        replacement: "version: 'v$1'",
        description: 'API endpoint version fields',
      },
      {
        regex: /version:\s*['"](\d+\.\d+\.\d+)['"]/g,
        replacement: "version: '$1'",
        description: 'API endpoint version fields (without v prefix)',
      },
    ],
  },

  // Constants file
  {
    path: 'lib/constants.ts',
    patterns: [
      {
        regex: /let packageVersion = '(\d+\.\d+\.\d+)';/,
        replacement: "let packageVersion = '$1';",
        description: 'Package version constant',
      },
    ],
  },

  // Component versions file (TES-OPS-004.A)
  {
    path: 'src/config/component-versions.ts',
    patterns: [
      {
        regex: /export const BETTING_GLOSSARY_VERSION = '(\d+\.\d+\.\d+)';/,
        replacement: "export const BETTING_GLOSSARY_VERSION = '$1';",
        description: 'Betting Glossary version constant',
      },
      {
        regex: /export const TENSION_API_VERSION = '(\d+\.\d+\.\d+)';/,
        replacement: "export const TENSION_API_VERSION = '$1';",
        description: 'Tension API version constant',
      },
      {
        regex: /export const AI_MAPARSE_VERSION = '(\d+\.\d+\.\d+)';/,
        replacement: "export const AI_MAPARSE_VERSION = '$1';",
        description: 'AI Maparse version constant',
      },
      {
        regex: /export const GAUGE_API_VERSION = '(\d+\.\d+\.\d+)';/,
        replacement: "export const GAUGE_API_VERSION = '$1';",
        description: 'Gauge API version constant',
      },
      {
        regex: /export const WORKER_MANAGEMENT_VERSION = '(\d+\.\d+\.\d+)';/,
        replacement: "export const WORKER_MANAGEMENT_VERSION = '$1';",
        description: 'Worker Management version constant',
      },
      {
        regex: /export const DEV_SERVER_VERSION = '(\d+\.\d+\.\d+)';/,
        replacement: "export const DEV_SERVER_VERSION = '$1';",
        description: 'Dev Server version constant',
      },
      {
        regex: /export const ENDPOINT_CHECKER_VERSION = '(\d+\.\d+\.\d+)';/,
        replacement: "export const ENDPOINT_CHECKER_VERSION = '$1';",
        description: 'Endpoint Checker version constant',
      },
      {
        regex: /export const SPLINE_API_VERSION = '(\d+\.\d+(?:\.\d+)?)';/,
        replacement: "export const SPLINE_API_VERSION = '$1';",
        description: 'Spline API version constant',
      },
      {
        regex: /export const VALIDATION_THRESHOLD_VERSION = '(\d+\.\d+\.\d+)';/,
        replacement: "export const VALIDATION_THRESHOLD_VERSION = '$1';",
        description: 'Validation Threshold version constant',
      },
    ],
  },

  // CLI Tools (TES-OPS-004 Expanded)
  {
    path: 'scripts/map-edge.ts',
    patterns: [
      {
        regex: /\* Edge Mapping CLI - Tension-Color Engine \(v(\d+\.\d+\.\d+)\)/,
        replacement: '* Edge Mapping CLI - Tension-Color Engine (v$1)',
        description: 'Edge Mapping CLI header comment',
      },
      {
        regex: /\* @version (\d+\.\d+\.\d+)/,
        replacement: '* @version $1',
        description: 'Edge Mapping CLI @version annotation',
      },
    ],
  },
  {
    path: 'graph-propagation/cli-absorb.ts',
    patterns: [
      {
        regex: /\* CLI Output Absorption Hook - Graph Propagation \(v(\d+\.\d+\.\d+)\)/,
        replacement: '* CLI Output Absorption Hook - Graph Propagation (v$1)',
        description: 'Graph Propagation CLI header comment',
      },
    ],
  },
  {
    path: 'scripts/static-routes.ts',
    patterns: [
      {
        regex: /\* Static Routes Manifest - Optimized File Serving Strategy \(v(\d+\.\d+\.\d+)\)/,
        replacement: '* Static Routes Manifest - Optimized File Serving Strategy (v$1)',
        description: 'Static Routes header comment',
      },
      {
        regex: /@version (\d+\.\d+\.\d+)/,
        replacement: '@version $1',
        description: 'Static Routes version annotation',
      },
    ],
  },

  // Documentation Files (TES-OPS-004 Expanded)
  {
    path: 'docs/TELEGRAM.md',
    patterns: [
      {
        regex: /\*\*Version:\*\* `(\d+\.\d+\.\d+)`/,
        replacement: '**Version:** `$1`',
        description: 'Telegram documentation version header',
      },
      {
        regex: /\*\*v(\d+\.\d+\.\d+)\*\* - Enhanced with cooldowns/,
        replacement: '**v$1** - Enhanced with cooldowns',
        description: 'Telegram version history entry',
      },
    ],
  },
  {
    path: 'docs/PRODUCTION-SYSTEM.md',
    patterns: [
      {
        regex: /\*\*Version:\*\* `(\d+\.\d+\.\d+)`/,
        replacement: '**Version:** `$1`',
        description: 'Production System documentation version header',
      },
      {
        regex: /\*\*v(\d+\.\d+\.\d+)\*\* - Enhanced with descriptive field names/,
        replacement: '**v$1** - Enhanced with descriptive field names',
        description: 'Production System version history entry',
      },
    ],
  },
  {
    path: 'STATUS.md',
    patterns: [
      {
        regex: /\*\*Version:\*\* `(\d+\.\d+\.\d+)`/,
        replacement: '**Version:** `$1`',
        description: 'Status documentation version header',
      },
    ],
  },
  {
    path: 'PORT.md',
    patterns: [
      {
        regex: /\*\*Version:\*\* `(\d+\.\d+\.\d+)`/,
        replacement: '**Version:** `$1`',
        description: 'Port documentation version header',
      },
    ],
  },
  {
    path: 'COMMANDS.md',
    patterns: [
      {
        regex: /\*\*Version:\*\* `(\d+\.\d+\.\d+)`/,
        replacement: '**Version:** `$1`',
        description: 'Commands documentation version header',
      },
    ],
  },
  {
    path: 'docs/INDEX.md',
    patterns: [
      {
        regex: /\*\*v(\d+\.\d+\.\d+)\*\* - Added Issues Tracking section/,
        replacement: '**v$1** - Added Issues Tracking section',
        description: 'Index documentation version history entry',
      },
    ],
  },
  {
    path: 'docs/TAGS-REFERENCE.md',
    patterns: [
      {
        regex: /\*\*v(\d+\.\d+\.\d+)\*\* - Initial tag reference/,
        replacement: '**v$1** - Initial tag reference',
        description: 'Tags Reference documentation version history entry',
      },
    ],
  },

  // Spline API VERSION constant (TES-OPS-004.2)
  {
    path: 'scripts/spline-api.ts',
    patterns: [
      {
        regex: /export const VERSION = ['"]v?(\d+\.\d+(?:\.\d+)?)['"];/,
        replacement: "export const VERSION = 'v$1';",
        description: 'Spline API VERSION constant',
      },
    ],
  },

  // Validation Threshold VERSION constant (TES-OPS-004.2)
  {
    path: 'macros/validate-threshold.ts',
    patterns: [
      {
        regex: /export const VERSION = ['"]v?(\d+\.\d+\.\d+)['"];/,
        replacement: "export const VERSION = 'v$1';",
        description: 'Validation Threshold VERSION constant',
      },
      {
        regex: /\* Enhanced Threshold Validator - Auto-Corrects Arithmetic Expressions \(v(\d+\.\d+\.\d+)\)/,
        replacement: '* Enhanced Threshold Validator - Auto-Corrects Arithmetic Expressions (v$1)',
        description: 'Validation Threshold header comment version',
      },
    ],
  },

  // Endpoint Checker VERSION constant (TES-OPS-004.2)
  {
    path: 'lib/endpoint-checker.ts',
    patterns: [
      {
        regex: /export const VERSION = ['"]v?(\d+\.\d+\.\d+)['"];/,
        replacement: "export const VERSION = 'v$1';",
        description: 'Endpoint Checker VERSION constant',
      },
    ],
  },
];

/**
 * Get the current version from package.json
 */
export async function getCurrentVersion(): Promise<string> {
  try {
    const packageJson = await Bun.file('package.json').json();
    return packageJson.version || '0.0.0';
  } catch (error) {
    throw new Error(
      `Failed to read package.json: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Increment version based on type
 */
export function incrementVersion(
  currentVersion: string,
  type: 'major' | 'minor' | 'patch'
): string {
  // Remove 'v' prefix if present
  const cleanVersion = currentVersion.replace(/^v/, '');
  const parts = cleanVersion.split('.').map(Number);

  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid version format: ${currentVersion}`);
  }

  let [major, minor, patch] = parts;

  switch (type) {
    case 'major':
      major++;
      minor = 0;
      patch = 0;
      break;
    case 'minor':
      minor++;
      patch = 0;
      break;
    case 'patch':
      patch++;
      break;
    default:
      throw new Error(`Invalid version type: ${type}`);
  }

  return `${major}.${minor}.${patch}`;
}

