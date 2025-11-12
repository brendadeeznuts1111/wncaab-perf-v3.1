/**
 * Steam Detection Configuration - TES-NGWS-001.11b
 * 
 * Sport-specific steam detection thresholds based on historical analysis.
 */

export interface SteamConfig {
  velocityThreshold: number;        // % change (e.g., 0.03 = 3%)
  timeWindow: number;               // ms (e.g., 1500 = 1.5 seconds)
  volumeWeight: number;             // 0-1 (default: 0.5)
  minRapidChanges: number;          // Minimum rapid changes to trigger (e.g., 2)
}

/**
 * Sport-specific steam detection configurations
 * Based on historical WNCAAAB/NBA steam analysis
 */
export const STEAM_CONFIGS: Record<string, SteamConfig> = {
  wncaab_prop: {
    velocityThreshold: 0.03,  // 3% - typical steam is 3-4%
    timeWindow: 1500,         // 1.5 seconds
    volumeWeight: 0.5,
    minRapidChanges: 2         // 2 rapid changes trigger
  },
  wncaab_main: {
    velocityThreshold: 0.025, // 2.5% - main lines move slower
    timeWindow: 2000,         // 2 seconds
    volumeWeight: 0.5,
    minRapidChanges: 2
  },
  nba_prop: {
    velocityThreshold: 0.05,  // 5% - NBA props move faster
    timeWindow: 1000,         // 1 second
    volumeWeight: 0.5,
    minRapidChanges: 3        // Need 3 rapid changes
  },
  nba_main: {
    velocityThreshold: 0.04,  // 4% - NBA main lines
    timeWindow: 1500,         // 1.5 seconds
    volumeWeight: 0.5,
    minRapidChanges: 2
  },
  // Default fallback
  default: {
    velocityThreshold: 0.03,  // Conservative default
    timeWindow: 1500,
    volumeWeight: 0.5,
    minRapidChanges: 2
  }
};

/**
 * Get steam config for a given league and odds type
 */
export function getSteamConfig(league: string, oddsType: string): SteamConfig {
  const key = `${league.toLowerCase()}_${oddsType === 'player_prop' ? 'prop' : 'main'}`;
  return STEAM_CONFIGS[key] || STEAM_CONFIGS.default;
}







