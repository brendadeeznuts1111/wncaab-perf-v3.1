/**
 * Total Movement Detector - TES-NGWS-001.13
 * 
 * Detects significant movements in total line odds and calculates steam index.
 * 
 * @module src/detectors/total-movement-detector
 */

import type { FlashDataResponse } from '../parsers/goaloo-live-parser.ts';

/**
 * Total movement data structure
 */
export interface TotalMovement {
  teamHome: string;
  teamAway: string;
  timestamp: number;
  linePrevious: number;
  lineCurrent: number;
  lineMovement: number; // Change in line (e.g., -1.0 means line moved down 1 point)
  overPrevious: number;
  overCurrent: number;
  overChangePercent: number | null;
  underPrevious: number;
  underCurrent: number;
  underChangePercent: number | null;
  steamIndex: number;
  scoreHome: number;
  scoreAway: number;
  // Enhanced fields for actionable alerts
  providers?: string[]; // Bookmaker/operator sources (e.g., ['DraftKings', 'FanDuel'])
  openingLine?: number; // Initial total line at poll start
  tickCount?: number; // Number of ticks since opening or last alert
}

/**
 * Total Movement Detector
 * 
 * Analyzes consecutive flashdata responses to detect significant line movements
 * and calculate steam index for alert prioritization.
 */
export class TotalMovementDetector {
  private lastTotal: FlashDataResponse | null = null;
  private movementThreshold: number;

  /**
   * Create a new total movement detector
   * 
   * @param movementThreshold - Minimum line movement to trigger detection (default: 0.5)
   */
  constructor(movementThreshold: number = 0.5) {
    this.movementThreshold = movementThreshold;
  }

  /**
   * Detect movement between current and previous flashdata
   * 
   * @param current - Current flashdata response
   * @param previous - Previous flashdata response (null for first detection)
   * @param providers - Optional providers/bookmakers array from current data
   * @param openingLine - Optional opening line value
   * @param tickCount - Optional tick count since opening
   * @returns Detected movement or null if no significant movement
   */
  detectMovement(
    current: FlashDataResponse,
    previous: FlashDataResponse | null,
    providers?: string[],
    openingLine?: number,
    tickCount?: number
  ): TotalMovement | null {
    // Require total odds data
    if (!current.odds.total || !previous?.odds.total) {
      return null;
    }

    const linePrev = previous.odds.total.line;
    const lineCurr = current.odds.total.line;
    const lineMovement = lineCurr - linePrev;

    // Filter out movements below threshold
    if (Math.abs(lineMovement) < this.movementThreshold) {
      return null;
    }

    // Calculate over odds change percentage
    const overPrev = previous.odds.total.over;
    const overCurr = current.odds.total.over;
    const overChange = overPrev
      ? ((overCurr - overPrev) / Math.abs(overPrev)) * 100
      : null;

    // Calculate under odds change percentage
    const underPrev = previous.odds.total.under;
    const underCurr = current.odds.total.under;
    const underChange = underPrev
      ? ((underCurr - underPrev) / Math.abs(underPrev)) * 100
      : null;

    // Calculate steam index (line movement × odds volatility)
    const oddsVolatility = Math.abs(overChange || 0) + Math.abs(underChange || 0);
    const steamIndex = Math.abs(lineMovement) * (oddsVolatility / 100);

    // Extract team names from match data (placeholder - replace with actual data)
    const teamHome = 'Team A'; // TODO: Extract from match metadata
    const teamAway = 'Team B'; // TODO: Extract from match metadata

    return {
      teamHome,
      teamAway,
      timestamp: current.timestamp,
      linePrevious: linePrev,
      lineCurrent: lineCurr,
      lineMovement,
      overPrevious: overPrev,
      overCurrent: overCurr,
      overChangePercent: overChange,
      underPrevious: underPrev,
      underCurrent: underCurr,
      underChangePercent: underChange,
      steamIndex,
      scoreHome: current.score.home,
      scoreAway: current.score.away,
      // Enhanced fields
      providers: providers || current.odds.total?.providers || ['Unknown'],
      openingLine,
      tickCount,
    };
  }

  /**
   * Update the last seen total data
   * 
   * @param data - Flashdata response to store
   */
  updateLastTotal(data: FlashDataResponse): void {
    this.lastTotal = data;
  }

  /**
   * Get the last seen total data
   * 
   * @returns Last flashdata response or null
   */
  getLastTotal(): FlashDataResponse | null {
    return this.lastTotal;
  }

  /**
   * Reset detector state (clear last total)
   */
  reset(): void {
    this.lastTotal = null;
  }
}

