/**
 * Temporal Veto Registry Configuration
 * 
 * Bunfig.toml deterministic config hydration for temporal testing
 * 
 * Tags: [DOMAIN:defensive-testing][SCOPE:bun-mock-time][META:config-hydration][SEMANTIC:bunfig-toml][TYPE:config-schema][#REF]{BUN-CONFIG}
 */

import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Temporal registry configuration schema
 */
export interface TemporalRegistryConfig {
  /** Maximum veto threshold before enforcement */
  vetoThreshold: number;
  /** Enable AI-powered flux enforcement */
  enableFluxEnforcement: boolean;
  /** Enable epoch bundle signing */
  enableEpochSigning: boolean;
  /** Enable flux history tracking */
  enableFluxHistory: boolean;
  /** Maximum flux history entries */
  maxFluxHistoryEntries: number;
  /** Default timezone for operations */
  defaultTimezone: string;
  /** Enable dark-mode visualizations */
  enableDarkMode: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: TemporalRegistryConfig = {
  vetoThreshold: 100,
  enableFluxEnforcement: true,
  enableEpochSigning: true,
  enableFluxHistory: true,
  maxFluxHistoryEntries: 1000,
  defaultTimezone: 'America/New_York',
  enableDarkMode: true,
};

/**
 * Load configuration from bunfig.toml
 * 
 * Uses Bun's native TOML parsing (zero dependencies)
 */
export function loadTemporalConfig(): TemporalRegistryConfig {
  try {
    const bunfigPath = join(process.cwd(), 'bunfig.toml');
    const bunfigContent = readFileSync(bunfigPath, 'utf-8');
    
    // Parse TOML (Bun has native support, but we'll use simple parsing for now)
    // In production, use Bun's native TOML parser when available
    const config: Partial<TemporalRegistryConfig> = {};
    
    // Extract [temporal.registry] section
    const temporalSection = bunfigContent.match(/\[temporal\.registry\]([\s\S]*?)(?=\[|\n$)/);
    if (temporalSection) {
      const sectionContent = temporalSection[1];
      
      // Parse key-value pairs
      const vetoThresholdMatch = sectionContent.match(/veto_threshold\s*=\s*(\d+)/);
      if (vetoThresholdMatch) {
        config.vetoThreshold = parseInt(vetoThresholdMatch[1], 10);
      }
      
      const enableFluxMatch = sectionContent.match(/enable_flux_enforcement\s*=\s*(true|false)/);
      if (enableFluxMatch) {
        config.enableFluxEnforcement = enableFluxMatch[1] === 'true';
      }
      
      const enableSigningMatch = sectionContent.match(/enable_epoch_signing\s*=\s*(true|false)/);
      if (enableSigningMatch) {
        config.enableEpochSigning = enableSigningMatch[1] === 'true';
      }
      
      const enableHistoryMatch = sectionContent.match(/enable_flux_history\s*=\s*(true|false)/);
      if (enableHistoryMatch) {
        config.enableFluxHistory = enableHistoryMatch[1] === 'true';
      }
      
      const maxHistoryMatch = sectionContent.match(/max_flux_history_entries\s*=\s*(\d+)/);
      if (maxHistoryMatch) {
        config.maxFluxHistoryEntries = parseInt(maxHistoryMatch[1], 10);
      }
      
      const timezoneMatch = sectionContent.match(/default_timezone\s*=\s*"([^"]+)"/);
      if (timezoneMatch) {
        config.defaultTimezone = timezoneMatch[1];
      }
      
      const darkModeMatch = sectionContent.match(/enable_dark_mode\s*=\s*(true|false)/);
      if (darkModeMatch) {
        config.enableDarkMode = darkModeMatch[1] === 'true';
      }
    }
    
    return { ...DEFAULT_CONFIG, ...config };
  } catch (error) {
    // Fallback to defaults if bunfig.toml not found or parse fails
    console.warn('[TEMPORAL-CONFIG] Using default configuration:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Get configuration (cached)
 */
let cachedConfig: TemporalRegistryConfig | null = null;

export function getTemporalConfig(): TemporalRegistryConfig {
  if (!cachedConfig) {
    cachedConfig = loadTemporalConfig();
  }
  return cachedConfig;
}

