/**
 * Goaloo901 Live Parser - TES-NGWS-001.13
 * 
 * Parser for Goaloo901 flashdata API endpoint.
 * Handles live odds data retrieval and parsing with retry logic.
 * 
 * @module src/parsers/goaloo-live-parser
 */

import { GoalooErrorDiagnostics } from '../utils/error-diagnostics.ts';

/**
 * Flash data response from Goaloo901 API
 */
export interface FlashDataResponse {
  match: number;
  timestamp: number;
  odds: {
    total?: {
      line: number;
      over: number;
      under: number;
      providers: string[];
    };
    spread?: {
      line: number;
      home: number;
      away: number;
      providers: string[];
    };
    moneyline?: {
      home: number;
      away: number;
      providers: string[];
    };
  };
  score: {
    home: number;
    away: number;
  };
  status: 'pre-game' | 'live' | 'finished';
}

/**
 * Goaloo901 Live Parser
 * 
 * Parses flashdata from Goaloo901 API endpoint for live odds tracking.
 */
export class GoalooLiveParser {
  private headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://live.goaloo901.com/basketball/match-663637',
    'Accept': 'application/json, text/xml, */*',
    'Cache-Control': 'no-cache',
  };

  private retryCount = 0;
  private maxRetries = 3;
  private retryDelay = 2000;

  /**
   * Parse flashdata for a specific match with retry logic
   * 
   * @param matchId - Match ID to fetch data for
   * @param attempt - Current retry attempt (default: 1)
   * @returns Parsed flashdata response or null if failed
   */
  async parseFlashdata(matchId: number, attempt: number = 1): Promise<FlashDataResponse | null> {
    const timestamp = Date.now();
    const url = `https://live.goaloo901.com/flashdata/get?chbs=${matchId}&convert=2&${timestamp}`;

    try {
      const response = await fetch(url, {
        headers: this.headers,
        // Note: Bun's fetch doesn't support timeout directly, but we can use AbortController
      });

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        (error as any).response = response;
        (error as any).status = response.status;
        throw error;
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(
          `Expected JSON but got ${contentType}. Response preview: ${text.substring(0, 100)}`
        );
      }

      const data = await response.json();
      this.retryCount = 0; // Reset on success

      return {
        match: data.match || matchId,
        timestamp,
        odds: data.odds || {},
        score: data.score || { home: 0, away: 0 },
        status: (data.status || 'pre-game') as FlashDataResponse['status'],
      };
    } catch (error) {
      const diagnostic = GoalooErrorDiagnostics.analyzeError(error, matchId);

      // Only log detailed diagnostics on first attempt or for non-retryable errors
      if (attempt === 1 || diagnostic.retryAfterMs === 0) {
        console.error(`[Goaloo] Match ${matchId}: ${diagnostic.message}`);
        if (diagnostic.suggestions.length > 0) {
          console.log(`[Goaloo] Suggestions:\n  • ${diagnostic.suggestions.join('\n  • ')}`);
        }
      }

      // Retry logic
      if (attempt < this.maxRetries && diagnostic.retryAfterMs && diagnostic.retryAfterMs > 0) {
        console.log(
          `[Goaloo] Retrying in ${diagnostic.retryAfterMs}ms (attempt ${attempt}/${this.maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, diagnostic.retryAfterMs));
        return this.parseFlashdata(matchId, attempt + 1);
      }

      return null;
    }
  }

  /**
   * Parse multiple matches concurrently
   * 
   * @param matchIds - Array of match IDs to fetch
   * @returns Map of match ID to parsed response
   */
  async parseMultipleMatches(matchIds: number[]): Promise<Map<number, FlashDataResponse | null>> {
    const results = await Promise.allSettled(
      matchIds.map(async (matchId) => ({
        matchId,
        data: await this.parseFlashdata(matchId),
      }))
    );

    const map = new Map<number, FlashDataResponse | null>();

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        map.set(result.value.matchId, result.value.data);
      } else {
        map.set(matchIds[index], null);
      }
    });

    return map;
  }
}

