/**
 * TES-OPS-004.B.2: Version Registry Loader
 * 
 * Utility to load and validate the version registry at runtime,
 * reading current versions dynamically from files.
 * 
 * @module src/config/version-registry-loader
 */

import {
  VERSION_REGISTRY,
  type VersionedEntity,
  getEntity,
  getLinkedEntities,
  getAllEntities,
} from './version-registry.ts';

/**
 * Loaded version entity with dynamically read current version
 */
export interface LoadedVersionEntity extends VersionedEntity {
  /** Dynamically read current version from files */
  currentVersion: string;
  /** Whether the version was successfully read */
  versionRead: boolean;
  /** Error message if version read failed */
  versionError?: string;
}

/**
 * Validation result for registry validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
}

/**
 * Version Registry Loader
 * 
 * Provides methods to load and validate the version registry,
 * reading current versions dynamically from files.
 */
export class VersionRegistryLoader {
  private loadedEntities: Map<string, LoadedVersionEntity> = new Map();
  private initialized = false;

  /**
   * Trace a dependency chain to check if it terminates at a global entity
   * Returns detailed chain information including path, types, and strategies
   */
  private traceChainToGlobal(
    entityId: string,
    visited: Set<string> = new Set(),
    path: string[] = [],
    details: Array<{ id: string; type: string; strategy: string }> = []
  ): {
    terminatesAtGlobal: boolean;
    path: string[];
    isCircular: boolean;
    details: Array<{ id: string; type: string; strategy: string }>;
  } {
    const entity = getEntity(entityId);
    if (!entity) {
      return {
        terminatesAtGlobal: false,
        path,
        isCircular: false,
        details: [...details, { id: entityId, type: 'NOT_FOUND', strategy: 'unknown' }],
      };
    }

    // Check for circular dependency
    if (visited.has(entityId)) {
      return {
        terminatesAtGlobal: false,
        path: [...path, entityId],
        isCircular: true,
        details: [...details, { id: entityId, type: entity.type, strategy: entity.updateStrategy }],
      };
    }

    visited.add(entityId);
    const newPath = [...path, entityId];
    const newDetails = [
      ...details,
      {
        id: entityId,
        type: entity.type,
        strategy: entity.updateStrategy,
      },
    ];

    // If this is a global entity, chain terminates here
    if (entity.type === 'global') {
      return {
        terminatesAtGlobal: true,
        path: newPath,
        isCircular: false,
        details: newDetails,
      };
    }

    // If no parent, chain doesn't terminate at global
    if (!entity.parentVersionId) {
      return {
        terminatesAtGlobal: false,
        path: newPath,
        isCircular: false,
        details: newDetails,
      };
    }

    // Recursively check parent
    return this.traceChainToGlobal(entity.parentVersionId, visited, newPath, newDetails);
  }

  /**
   * Validate the version registry at runtime
   * Checks for duplicate IDs, invalid parent references, circular dependencies, etc.
   */
  validateRegistry(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const info: string[] = [];
    const seenIds = new Set<string>();

    for (const entity of VERSION_REGISTRY) {
      // Check for duplicate IDs
      if (seenIds.has(entity.id)) {
        errors.push(`Duplicate entity ID: ${entity.id}`);
      }
      seenIds.add(entity.id);

      // Validate parent references
      if (entity.parentVersionId) {
        const parent = getEntity(entity.parentVersionId);
        if (!parent) {
          errors.push(
            `Entity ${entity.id} (${entity.type}) references non-existent parent: ${entity.parentVersionId}`
          );
        } else if (parent.updateStrategy === 'linked-to-parent') {
          // Check if this creates a valid chain or a problem
          const chainResult = this.traceChainToGlobal(entity.id);

          // Build verbose chain description
          const chainDetails = chainResult.details
            .map((d) => `${d.id} [${d.type}, ${d.strategy}]`)
            .join(' → ');

          if (chainResult.isCircular) {
            errors.push(
              `🔴 CIRCULAR DEPENDENCY: ${chainDetails}\n` +
                `   Path: ${chainResult.path.join(' → ')}\n` +
                `   Entity: ${entity.id} (${entity.type})\n` +
                `   Parent: ${entity.parentVersionId} (${parent.type}, ${parent.updateStrategy})`
            );
          } else if (!chainResult.terminatesAtGlobal) {
            warnings.push(
              `⚠️  NON-TERMINATING CHAIN: ${chainDetails}\n` +
                `   Path: ${chainResult.path.join(' → ')}\n` +
                `   Entity: ${entity.id} (${entity.type})\n` +
                `   Parent: ${entity.parentVersionId} (${parent.type}, ${parent.updateStrategy})\n` +
                `   Issue: Chain does not terminate at a global entity`
            );
          } else {
            // Valid linear chain - log as verbose info
            const chainPath = chainResult.path.join(' → ');
            const chainTypes = chainResult.details.map((d) => d.type).join(' → ');
            info.push(
              `✅ VALID LINEAR CHAIN: ${chainDetails}\n` +
                `   Path: ${chainPath}\n` +
                `   Entity: ${entity.id} (${entity.type})\n` +
                `   Parent: ${entity.parentVersionId} (${parent.type}, ${parent.updateStrategy})\n` +
                `   Chain Types: ${chainTypes}\n` +
                `   Terminates at: ${chainResult.path[chainResult.path.length - 1]} (global)`
            );
          }
        }
      }

      // Validate required files exist
      for (const file of entity.files) {
        if (file.required) {
          try {
            const fileHandle = Bun.file(file.path);
            // Note: We can't check existence synchronously, but we'll catch errors during load
          } catch (error) {
            warnings.push(`Required file ${file.path} for entity ${entity.id} may not exist`);
          }
        }
      }

      // Validate API scope entities have apiEndpointPrefix
      if (entity.type === 'api-scope' && !entity.apiEndpointPrefix) {
        warnings.push(`API scope entity ${entity.id} missing apiEndpointPrefix`);
      }

      // Validate CLI tool entities have cliCommandName
      if (entity.type === 'cli-tool' && !entity.cliCommandName) {
        warnings.push(`CLI tool entity ${entity.id} missing cliCommandName`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      info,
    };
  }

  /**
   * Initialize the loader by reading all current versions
   * Validates the registry before loading
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Validate registry first
    const validation = this.validateRegistry();
    if (!validation.valid) {
      console.error('❌ Version Registry Validation Failed:');
      for (const error of validation.errors) {
        console.error(`  - ${error}`);
      }
      throw new Error(`Version registry validation failed: ${validation.errors.join('; ')}`);
    }

    if (validation.warnings.length > 0) {
      console.warn('⚠️  Version Registry Warnings:');
      for (const warning of validation.warnings) {
        console.warn(`  - ${warning}`);
      }
    }

    if (validation.info.length > 0) {
      console.info('ℹ️  Version Registry Info:');
      for (const infoMsg of validation.info) {
        console.info(`  - ${infoMsg}`);
      }
    }

    // Load all entity versions
    for (const entity of VERSION_REGISTRY) {
      const loaded = await this.loadEntityVersion(entity);
      this.loadedEntities.set(entity.id, loaded);
    }

    this.initialized = true;
  }

  /**
   * Load current version for an entity by reading from its files
   * 
   * Priority order:
   * 1. Special handling for global:main (package.json)
   * 2. Special handling for global:api-version (lib/constants.ts)
   * 3. Component entities: Try component-versions.ts first
   * 4. Try files[0].path (first file pattern)
   * 5. Try all file patterns in order
   * 6. Use defaultVersion from file pattern if available
   * 7. Fallback to entity.currentVersion (default from registry)
   */
  private async loadEntityVersion(entity: VersionedEntity): Promise<LoadedVersionEntity> {
    // Special handling for global:main (read from package.json)
    if (entity.id === 'global:main') {
      try {
        const packageJson = await Bun.file('package.json').json();
        const version = packageJson.version || entity.currentVersion;
        return {
          ...entity,
          currentVersion: version,
          versionRead: true,
        };
      } catch (error) {
        return {
          ...entity,
          versionRead: false,
          versionError: `Failed to read package.json: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }

    // Special handling for global:api-version (read from lib/constants.ts)
    if (entity.id === 'global:api-version') {
      try {
        const constantsFile = await Bun.file('lib/constants.ts').text();
        const match = constantsFile.match(/let packageVersion = ['"](\d+\.\d+\.\d+)['"];/);
        if (match && match[1]) {
          return {
            ...entity,
            currentVersion: match[1],
            versionRead: true,
          };
        }
      } catch (error) {
        return {
          ...entity,
          versionRead: false,
          versionError: `Failed to read lib/constants.ts: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }

    // For component entities, try to read from component-versions.ts first
    if (entity.type === 'component' && entity.files.length > 0) {
      const componentVersionsFile = entity.files.find(f => f.path === 'src/config/component-versions.ts');
      if (componentVersionsFile) {
        try {
          const fileContent = await Bun.file('src/config/component-versions.ts').text();
          const regex = new RegExp(componentVersionsFile.pattern);
          const match = fileContent.match(regex);
          if (match && match[1]) {
            return {
              ...entity,
              currentVersion: match[1],
              versionRead: true,
            };
          }
        } catch (error) {
          // Fall through to try other files
        }
      }
    }

    // Try reading from files[0].path (first file pattern) as specified in requirements
    if (entity.files.length > 0) {
      const firstFile = entity.files[0];
      
      // Check if file exists
      const fileHandle = Bun.file(firstFile.path);
      const fileExists = await fileHandle.exists();
      
      if (!fileExists) {
        // If file doesn't exist and has defaultVersion, use it
        if (firstFile.defaultVersion) {
          return {
            ...entity,
            currentVersion: firstFile.defaultVersion,
            versionRead: true,
          };
        }
        
        // If required, return error
        if (firstFile.required) {
          return {
            ...entity,
            versionRead: false,
            versionError: `Required file ${firstFile.path} does not exist`,
          };
        }
        
        // If not required, try other files or fallback
      } else {
        // File exists, try to read version
        try {
          const fileContent = await fileHandle.text();
          const regex = new RegExp(firstFile.pattern);
          const match = fileContent.match(regex);
          if (match && match[1]) {
            return {
              ...entity,
              currentVersion: match[1],
              versionRead: true,
            };
          } else if (firstFile.defaultVersion) {
            // Pattern not found but defaultVersion available
            return {
              ...entity,
              currentVersion: firstFile.defaultVersion,
              versionRead: true,
            };
          }
        } catch (error) {
          // File read error
          if (firstFile.required) {
            return {
              ...entity,
              versionRead: false,
              versionError: `Failed to read required file ${firstFile.path}: ${error instanceof Error ? error.message : String(error)}`,
            };
          }
          // Not required, continue to try other files
        }
      }
    }

    // Try all other file patterns if first file didn't work
    if (entity.files.length > 1) {
      for (let i = 1; i < entity.files.length; i++) {
        const file = entity.files[i];
        try {
          const fileHandle = Bun.file(file.path);
          const fileExists = await fileHandle.exists();
          if (fileExists) {
            const fileContent = await fileHandle.text();
            const regex = new RegExp(file.pattern);
            const match = fileContent.match(regex);
            if (match && match[1]) {
              return {
                ...entity,
                currentVersion: match[1],
                versionRead: true,
              };
            }
          }
        } catch (error) {
          // Continue to next file
          continue;
        }
      }
    }

    // Fallback to default version from registry
    return {
      ...entity,
      versionRead: true, // Using default from registry, not an error
    };
  }

  /**
   * Get all loaded entities
   */
  getEntities(): LoadedVersionEntity[] {
    if (!this.initialized) {
      throw new Error('VersionRegistryLoader not initialized. Call initialize() first.');
    }
    return Array.from(this.loadedEntities.values());
  }

  /**
   * Get entity by ID
   */
  getEntity(id: string): LoadedVersionEntity | undefined {
    if (!this.initialized) {
      throw new Error('VersionRegistryLoader not initialized. Call initialize() first.');
    }
    return this.loadedEntities.get(id);
  }

  /**
   * Get entities linked to a parent
   */
  getLinkedEntities(parentId: string): LoadedVersionEntity[] {
    if (!this.initialized) {
      throw new Error('VersionRegistryLoader not initialized. Call initialize() first.');
    }
    return getLinkedEntities(parentId)
      .map(entity => this.loadedEntities.get(entity.id))
      .filter((e): e is LoadedVersionEntity => e !== undefined);
  }

  /**
   * Get all entities that would be affected by bumping a parent entity
   */
  getAffectedEntities(entityId: string): LoadedVersionEntity[] {
    if (!this.initialized) {
      throw new Error('VersionRegistryLoader not initialized. Call initialize() first.');
    }
    
    const entity = this.getEntity(entityId);
    if (!entity) return [];
    
    const affected: LoadedVersionEntity[] = [entity];
    
    // If entity has linked children, include them recursively
    const linked = this.getLinkedEntities(entityId);
    for (const child of linked) {
      affected.push(...this.getAffectedEntities(child.id));
    }
    
    return affected;
  }

  /**
   * Get entities that should be displayed in UI
   */
  getDisplayableEntities(): LoadedVersionEntity[] {
    if (!this.initialized) {
      throw new Error('VersionRegistryLoader not initialized. Call initialize() first.');
    }
    return this.getEntities().filter(entity => entity.displayInUi);
  }

  /**
   * Refresh a specific entity's version
   */
  async refreshEntity(entityId: string): Promise<void> {
    const entity = getEntity(entityId);
    if (!entity) {
      throw new Error(`Entity not found: ${entityId}`);
    }
    
    const loaded = await this.loadEntityVersion(entity);
    this.loadedEntities.set(entityId, loaded);
  }

  /**
   * Refresh all entities
   */
  async refreshAll(): Promise<void> {
    for (const entity of VERSION_REGISTRY) {
      const loaded = await this.loadEntityVersion(entity);
      this.loadedEntities.set(entity.id, loaded);
    }
  }
}

/**
 * Singleton instance
 */
let loaderInstance: VersionRegistryLoader | null = null;

/**
 * Get or create the singleton loader instance
 */
export function getVersionRegistryLoader(): VersionRegistryLoader {
  if (!loaderInstance) {
    loaderInstance = new VersionRegistryLoader();
  }
  return loaderInstance;
}

