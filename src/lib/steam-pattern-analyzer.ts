/**
 * Steam Pattern Analyzer - TES-NGWS-001.11b
 * 
 * Detects steam patterns (rapid odds movement) from NowGoal ticks.
 * Enhanced with sport-specific thresholds and volume weighting.
 * Required by defensive-bookmaker-detection.ts
 * 
 * @module src/lib/steam-pattern-analyzer
 */

import { NowGoalTick } from "../models/nowgoal-tick.ts";
import { getTESDomainConfigCached } from "../config/tes-domain-config.ts";
import { getSteamConfig, SteamConfig } from "../config/steam-config.ts";

/**
 * Steam Data Point interface
 * Required by defensive-bookmaker-detection.ts
 */
export interface SteamDataPoint {
  timestamp: number;
  bookmakerId: string;
  odds: number;
  velocity: number;  // Change magnitude
  volume?: number;  // Optional: if available from NowGoal
}

/**
 * Log header with rg-compatible metadata enrichment
 */
function logHeadersForRg(rgBlock: string): void {
  const logLine = `${new Date().toISOString()} ${rgBlock}\n`;
  Bun.write('logs/headers-index.log', logLine, { createPath: true, flag: 'a' }).catch((error) => {
    console.error(`[Steam Pattern Analyzer] Failed to write rg log: ${error}`);
  });
}

/**
 * Generate RG-compatible block for steam detection
 */
function generateRgBlock(params: {
  scope: string;
  domain: string;
  type: string;
  meta: string;
  version: string;
  ticket: string;
  bunApi: string;
  ref: string;
}): string {
  const timestamp = Date.now();
  return `[HEADERS_BLOCK_START:v1]{${params.ref}}~[${params.scope}][${params.domain}][${params.type}][${params.meta}][${params.version}][${params.ticket}][${params.bunApi}][#REF:${params.ref}][TIMESTAMP:${timestamp}][HEADERS_BLOCK_END]`;
}

/**
 * Steam Pattern Analyzer
 * 
 * TES-NGWS-001.11b: Enhanced with sport-specific thresholds and volume weighting
 */
export class SteamPatternAnalyzer {
  private recentChanges: Map<string, SteamDataPoint[]> = new Map();
  private config: SteamConfig;
  
  constructor(config?: SteamConfig) {
    // Use provided config or default (will be set per-tick based on league)
    this.config = config || {
      velocityThreshold: 0.03,
      timeWindow: 1500,
      volumeWeight: 0.5,
      minRapidChanges: 2
    };
  }
  
  /**
   * Detect steam pattern: rapid odds movement
   * 
   * TES-NGWS-001.11b: Enhanced detection with:
   * - Sport-specific thresholds
   * - Volume weighting
   * - Multiple rapid change detection
   * - Large single move detection (≥10%)
   * 
   * @param tick - NowGoal tick to analyze
   * @returns true if steam pattern detected
   */
  detectSteam(tick: NowGoalTick): boolean {
    // Get sport-specific config
    const config = getSteamConfig(tick.market.league, tick.oddsType);
    this.config = config;
    
    const key = `${tick.gameId}:${tick.bookmakerId}:${tick.oddsType}`;
    const now = tick.timestamp;
    // Calculate velocity as percentage change (not absolute difference)
    const velocity = Math.abs((tick.newValue - tick.oldValue) / tick.oldValue);
    
    // Clean old entries (>timeWindow old)
    const windowStart = now - config.timeWindow;
    const changes = this.recentChanges.get(key) || [];
    const filtered = changes.filter(c => c.timestamp > windowStart);
    
    // Add current change
    const dataPoint: SteamDataPoint = {
      timestamp: now,
      bookmakerId: tick.bookmakerId,
      odds: tick.newValue,
      velocity,
      volume: undefined // NowGoal may not provide volume
    };
    
    filtered.push(dataPoint);
    this.recentChanges.set(key, filtered);
    
    // Rule 1: Single large move (≥10%) - always trigger
    if (velocity >= 0.10) {
      this.logSteamDetection(key, tick, velocity, "LARGE_SINGLE");
      return true;
    }
    
    // Rule 2: Multiple rapid moves (≥minRapidChanges changes >threshold)
    if (filtered.length >= config.minRapidChanges) {
      const rapidCount = filtered.filter(c => c.velocity >= config.velocityThreshold).length;
      
      if (rapidCount >= config.minRapidChanges) {
        // Calculate steam index (weighted by volume if available)
        const steamIndex = this.calculateSteamIndex(filtered, config);
        
        // Adjusted threshold: steam index >= 1.5 (on 0-10 scale)
        // This corresponds to ~2.1% average velocity with no volume
        if (steamIndex >= 1.5) {
          this.logSteamDetection(key, tick, steamIndex, "MULTI_RAPID");
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Calculate steam index (weighted by velocity and volume)
   * Velocity is already a percentage (0.03 = 3%), so we scale it appropriately
   */
  private calculateSteamIndex(changes: SteamDataPoint[], config: SteamConfig): number {
    if (changes.length === 0) return 0;
    
    // Velocity is already percentage change (0.03 = 3%)
    // Scale to 0-100 range for easier threshold comparison
    const avgVelocity = changes.reduce((sum, c) => sum + c.velocity, 0) / changes.length;
    const avgVolume = changes.reduce((sum, c) => sum + (c.volume || 0), 0) / changes.length;
    
    // Weighted index: velocity (70%) + volume (30%)
    // Velocity is multiplied by 100 to convert from decimal (0.03) to percentage scale (3.0)
    // Then normalized to 0-10 range for threshold comparison
    const velocityScore = avgVelocity * 100; // Convert 0.03 to 3.0
    const normalizedVolume = Math.min(avgVolume / 10000, 1.0);
    const volumeScore = normalizedVolume * config.volumeWeight * 10; // Scale to 0-10
    
    // Final index: velocity (70%) + volume (30%), scaled to 0-10 range
    return velocityScore * 0.7 + volumeScore * 0.3;
  }
  
  /**
   * Log steam detection with RG-compatible format
   */
  private logSteamDetection(key: string, tick: NowGoalTick, metric: number, type: string): void {
    const tesConfig = getTESDomainConfigCached();
    const changes = this.recentChanges.get(key) || [];
    const steamIndex = this.calculateSteamIndex(changes, this.config);
    
    const rgBlock = generateRgBlock({
      scope: "ANALYSIS",
      domain: tesConfig.nowgoalDomain,
      type: "DETECTION",
      meta: `STEAM_${type}`,
      version: "BUN-V1.3",
      ticket: "TES-NGWS-001.11b",
      bunApi: "SteamPatternAnalyzer",
      ref: `gameId:${tick.gameId}|velocity:${metric.toFixed(4)}|steamIndex:${steamIndex.toFixed(3)}|rapidChanges:${changes.length}|bookmaker:${tick.bookmakerId}|league:${tick.market.league}`
    });
    
    console.log(`[STEAM_DETECTED] ${tick.gameId} | ${type} | velocity:${metric.toFixed(4)} | steamIndex:${steamIndex.toFixed(3)}`);
    logHeadersForRg(rgBlock);
    
    // Archive detection state for forensics
    this.archiveSteamState(key, tick, metric, type);
  }
  
  /**
   * Archive steam detection state for forensics
   */
  private archiveSteamState(key: string, tick: NowGoalTick, metric: number, type: string): void {
    const state = {
      timestamp: Date.now(),
      gameId: tick.gameId,
      bookmaker: tick.bookmakerId,
      metric,
      detectionType: type,
      recentChanges: this.recentChanges.get(key) || [],
      config: this.config
    };
    
    // Write to forensic log (rg-indexed)
    const logFile = `logs/steam-archive-${tick.gameId}.log`;
    Bun.write(logFile, JSON.stringify(state) + "\n", { createPath: true, flag: 'a' }).catch((error) => {
      console.error(`[Steam Pattern Analyzer] Failed to archive state: ${error}`);
    });
  }
  
  /**
   * Convert NowGoalTick to SteamDataPoint
   * For compatibility with defensive-bookmaker-detection.ts
   */
  toSteamDataPoint(tick: NowGoalTick): SteamDataPoint {
    return {
      timestamp: tick.timestamp,
      bookmakerId: tick.bookmakerId,
      odds: tick.newValue,
      velocity: Math.abs((tick.newValue - tick.oldValue) / tick.oldValue), // Percentage change
      volume: undefined, // NowGoal may not provide volume
    };
  }
  
  /**
   * Clear old tick history (prevent memory leak)
   */
  cleanup(maxAge: number = 60000): void {
    const cutoff = Date.now() - maxAge;
    for (const [key, changes] of this.recentChanges.entries()) {
      const filtered = changes.filter(c => c.timestamp >= cutoff);
      if (filtered.length === 0) {
        this.recentChanges.delete(key);
      } else {
        this.recentChanges.set(key, filtered);
      }
    }
  }
}

