/**
 * Component Version Constants
 * 
 * Centralized version exports for major TES components.
 * These versions are displayed in the dashboard UI and updated by the bump utility.
 * 
 * @module src/config/component-versions
 */

/**
 * Enhanced Betting Glossary Version
 */
export const BETTING_GLOSSARY_VERSION = '2.1.02';

/**
 * Tension Mapping API Version
 */
export const TENSION_API_VERSION = '1.6.0';

/**
 * AI Maparse Version
 */
export const AI_MAPARSE_VERSION = '1.4.2';

/**
 * Gauge API Version (WNBATOR)
 */
export const GAUGE_API_VERSION = '1.4.2';

/**
 * Worker Management Version
 */
export const WORKER_MANAGEMENT_VERSION = '1.0.0';

/**
 * Dev Server Version
 */
export const DEV_SERVER_VERSION = '2.1.02';

/**
 * Endpoint Checker Version
 */
export const ENDPOINT_CHECKER_VERSION = '2.0.0';

/**
 * Spline API Version
 */
export const SPLINE_API_VERSION = '1.0';

/**
 * Validation Threshold Version
 */
export const VALIDATION_THRESHOLD_VERSION = '1.4.2';

/**
 * Tension Visualizer Version
 */
export const TENSION_VISUALIZER_VERSION = '1.0.0';

/**
 * Get all component versions as a map
 */
export function getComponentVersions(): Record<string, string> {
  return {
    'Betting Glossary': BETTING_GLOSSARY_VERSION,
    'Tension API': TENSION_API_VERSION,
    'Tension Visualizer': TENSION_VISUALIZER_VERSION,
    'AI Maparse': AI_MAPARSE_VERSION,
    'Gauge API': GAUGE_API_VERSION,
    'Worker Management': WORKER_MANAGEMENT_VERSION,
    'Dev Server': DEV_SERVER_VERSION,
    'Endpoint Checker': ENDPOINT_CHECKER_VERSION,
    'Spline API': SPLINE_API_VERSION,
    'Validation Threshold': VALIDATION_THRESHOLD_VERSION,
  };
}


    'Spline API': SPLINE_API_VERSION,
    'Validation Threshold': VALIDATION_THRESHOLD_VERSION,
  };
}

