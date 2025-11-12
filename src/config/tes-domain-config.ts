/**
 * TES Domain Configuration - TES-OPS-003.1
 * 
 * Centralized domain configuration for TES APIs and services.
 * Supports environment-based domain resolution for dev/prod.
 * 
 * @module src/config/tes-domain-config
 */

/**
 * TES Domain Configuration
 */
export interface TESDomainConfig {
  /**
   * TES API domain (e.g., "api.nowgoal26.com" or "localhost:3002")
   */
  apiDomain: string;
  
  /**
   * Cookie domain for TES internal cookies (e.g., ".nowgoal26.com" or "localhost")
   */
  cookieDomain: string;
  
  /**
   * Base URL for TES API (e.g., "https://api.nowgoal26.com" or "http://localhost:3002")
   */
  apiBaseUrl: string;
  
  /**
   * Whether running in development mode
   */
  isDevelopment: boolean;
  
  /**
   * NowGoal domain (external service)
   */
  nowgoalDomain: string;
  
  /**
   * NowGoal API base URL
   */
  nowgoalApiBaseUrl: string;
}

/**
 * Get TES domain configuration from environment variables
 * 
 * Environment Variables:
 * - TES_API_DOMAIN: API domain (default: "api.nowgoal26.com" in prod, "localhost:3002" in dev)
 * - TES_COOKIE_DOMAIN: Cookie domain (default: ".nowgoal26.com" in prod, "localhost" in dev)
 * - NOWGOAL_DOMAIN: NowGoal domain (default: "nowgoal26.com")
 * - NODE_ENV or BUN_ENV: Environment mode ("production" = production, else dev)
 * 
 * @returns TES domain configuration
 */
export function getTESDomainConfig(): TESDomainConfig {
  const isDevelopment = 
    process.env.NODE_ENV !== 'production' && 
    process.env.BUN_ENV !== 'production';
  
  // TES API Domain - defaults based on environment
  const tesApiDomain = process.env.TES_API_DOMAIN || 
    (isDevelopment ? 'localhost:3002' : 'api.nowgoal26.com');
  
  // Cookie Domain - defaults based on environment
  const cookieDomain = process.env.TES_COOKIE_DOMAIN || 
    (isDevelopment ? 'localhost' : '.nowgoal26.com');
  
  // NowGoal Domain - external service
  const nowgoalDomain = process.env.NOWGOAL_DOMAIN || 'nowgoal26.com';
  
  // Build base URLs
  const apiProtocol = isDevelopment ? 'http' : 'https';
  const apiBaseUrl = `${apiProtocol}://${tesApiDomain}`;
  const nowgoalApiBaseUrl = `https://${nowgoalDomain}`;
  
  return {
    apiDomain: tesApiDomain,
    cookieDomain,
    apiBaseUrl,
    isDevelopment,
    nowgoalDomain,
    nowgoalApiBaseUrl,
  };
}

/**
 * Get TES domain configuration (singleton instance)
 * 
 * Cached after first call for performance
 */
let cachedConfig: TESDomainConfig | null = null;

export function getTESDomainConfigCached(): TESDomainConfig {
  if (!cachedConfig) {
    cachedConfig = getTESDomainConfig();
  }
  return cachedConfig;
}

/**
 * Reset cached configuration (useful for testing)
 */
export function resetTESDomainConfigCache(): void {
  cachedConfig = null;
}

/**
 * Validate domain configuration
 * 
 * @param config - Domain configuration to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateTESDomainConfig(config: TESDomainConfig): string[] {
  const errors: string[] = [];
  
  if (!config.apiDomain || config.apiDomain.trim() === '') {
    errors.push('TES_API_DOMAIN is required');
  }
  
  if (!config.cookieDomain || config.cookieDomain.trim() === '') {
    errors.push('TES_COOKIE_DOMAIN is required');
  }
  
  // Validate cookie domain format
  if (config.cookieDomain.startsWith('.') && config.isDevelopment) {
    errors.push('Cookie domain should not start with "." in development mode');
  }
  
  if (!config.cookieDomain.startsWith('.') && !config.isDevelopment && config.cookieDomain !== 'localhost') {
    errors.push('Cookie domain should start with "." in production mode (e.g., ".nowgoal26.com")');
  }
  
  return errors;
}

