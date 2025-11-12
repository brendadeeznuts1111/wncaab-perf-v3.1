/**
 * NowGoal Tick Data Model - TES-NGWS-001.4a
 * 
 * TypeScript interfaces for NowGoal WebSocket tick data.
 * 
 * @module src/models/nowgoal-tick
 */

/**
 * NowGoal Tick - Core data structure for odds changes
 */
export interface NowGoalTick {
  gameId: string;
  bookmakerId: "nowgoal-ws" | string;
  oddsType: "moneyline" | "spread" | "total" | "player_prop";
  oldValue: number;
  newValue: number;
  timestamp: number; // Unix milliseconds
  market: {
    homeTeam: string;
    awayTeam: string;
    league: "WNCAAB" | "NBA" | "EuroLeague" | string;
  };
  rgMetadata?: string; // RG-compatible metadata from parse step
}

/**
 * NowGoal Player Prop Tick - Extended tick for player props
 */
export interface NowGoalPlayerPropTick extends NowGoalTick {
  playerId: string;
  playerName: string;
  statType: "points" | "rebounds" | "assists" | string;
}

/**
 * Helper function to check if tick is a player prop
 */
export function isPlayerPropTick(tick: NowGoalTick): tick is NowGoalPlayerPropTick {
  return tick.oddsType === "player_prop" && 
         'playerId' in tick && 
         'playerName' in tick;
}

