/**
 * NowGoal Data Transformer - TES-NGWS-001.4b
 * 
 * Transforms parsed XML data to NowGoalTick data model.
 * 
 * @module src/lib/transform-nowgoal
 */

import { NowGoalTick, NowGoalPlayerPropTick } from "../models/nowgoal-tick.ts";

/**
 * Map odds type from XML attribute to TypeScript type
 */
function mapOddsType(xmlType: string): NowGoalTick["oddsType"] {
  const typeMap: Record<string, NowGoalTick["oddsType"]> = {
    "moneyline": "moneyline",
    "ml": "moneyline",
    "spread": "spread",
    "line": "spread",
    "total": "total",
    "overunder": "total",
    "ou": "total",
    "player_prop": "player_prop",
    "prop": "player_prop",
  };
  
  return typeMap[xmlType?.toLowerCase()] || "moneyline";
}

/**
 * Detect league from XML data
 */
function detectLeague(leagueName: string): NowGoalTick["market"]["league"] {
  const leagueMap: Record<string, NowGoalTick["market"]["league"]> = {
    "wncaab": "WNCAAB",
    "ncaab": "WNCAAB",
    "nba": "NBA",
    "euroleague": "EuroLeague",
    "euro": "EuroLeague",
  };
  
  const normalized = leagueName?.toLowerCase().replace(/[^a-z]/g, "");
  return leagueMap[normalized] || normalized || "WNCAAB";
}

/**
 * Transform parsed XML data to NowGoalTick
 * 
 * TES-NGWS-001.4b: Transform & Enrich Data
 * 
 * @param parsed - Parsed XML object from fast-xml-parser
 * @param rgMetadata - RG metadata from parse step
 * @returns Transformed NowGoalTick
 */
export function transformToNowGoalTick(parsed: any, rgMetadata: string): NowGoalTick {
  // Extract from XML structure (adjust based on actual NowGoal XML format)
  // This is a template - update based on actual XML structure from reverse-engineering
  
  const oddsChange = parsed.oddsChange || parsed.odds || parsed.change || parsed;
  
  const tick: NowGoalTick = {
    gameId: oddsChange?.["@_gameId"] || oddsChange?.gameId || oddsChange?.id || "unknown",
    bookmakerId: "nowgoal-ws",
    oddsType: mapOddsType(oddsChange?.["@_type"] || oddsChange?.type || "moneyline"),
    oldValue: parseFloat(oddsChange?.["@_old"] || oddsChange?.old || oddsChange?.oldValue || "0"),
    newValue: parseFloat(oddsChange?.["@_new"] || oddsChange?.new || oddsChange?.newValue || "0"),
    timestamp: parseInt(oddsChange?.["@_time"] || oddsChange?.time || oddsChange?.timestamp || String(Date.now())),
    market: {
      homeTeam: oddsChange?.market?.["@_home"] || oddsChange?.market?.home || oddsChange?.homeTeam || "Unknown",
      awayTeam: oddsChange?.market?.["@_away"] || oddsChange?.market?.away || oddsChange?.awayTeam || "Unknown",
      league: detectLeague(oddsChange?.market?.["@_league"] || oddsChange?.market?.league || oddsChange?.league || "WNCAAB"),
    },
    rgMetadata,
  };
  
  // Handle player props if present
  if (tick.oddsType === "player_prop" && oddsChange?.player) {
    const playerTick = tick as NowGoalPlayerPropTick;
    playerTick.playerId = oddsChange.player["@_id"] || oddsChange.player.id || "unknown";
    playerTick.playerName = oddsChange.player["@_name"] || oddsChange.player.name || "Unknown";
    playerTick.statType = oddsChange.player["@_stat"] || oddsChange.player.stat || "points";
    return playerTick;
  }
  
  return tick;
}

