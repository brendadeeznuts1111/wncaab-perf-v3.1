/**
 * Match Discovery Tool - TES-NGWS-001.13
 * 
 * Discovers active matches by scanning Goaloo901 API.
 * 
 * @module src/utils/match-discovery
 */

import { GoalooLiveParser } from '../parsers/goaloo-live-parser.ts';

/**
 * Discovered match information
 */
export interface DiscoveredMatch {
  matchId: number;
  status: 'active' | 'expired' | 'not_found' | 'error';
  league?: string;
  teams?: { home: string; away: string };
  startTime?: string;
  lastChecked: number;
}

/**
 * Match Discovery
 * 
 * Scans Goaloo901 API to find active matches and saves them for quick startup.
 */
export class MatchDiscovery {
  private parser = new GoalooLiveParser();
  private discovered = new Map<number, DiscoveredMatch>();

  /**
   * Discover matches by scanning a range of IDs
   * 
   * @param startId - Starting match ID
   * @param endId - Ending match ID
   * @param concurrency - How many to check simultaneously (default: 5)
   * @returns Array of discovered matches
   */
  async scanRange(
    startId: number,
    endId: number,
    concurrency: number = 5
  ): Promise<DiscoveredMatch[]> {
    console.log(`🔍 Scanning matches ${startId} to ${endId}...`);

    const matches: DiscoveredMatch[] = [];
    const queue: number[] = [];

    for (let id = startId; id <= endId; id++) {
      queue.push(id);
    }

    // Process in batches
    while (queue.length > 0) {
      const batch = queue.splice(0, concurrency);
      const results = await Promise.all(batch.map((id) => this.checkMatch(id)));
      matches.push(...(results.filter((m) => m !== null) as DiscoveredMatch[]));

      // Rate limiting between batches
      if (queue.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    const active = matches.filter((m) => m.status === 'active');
    console.log(`✅ Scan complete: ${active.length} active matches found`);

    return matches;
  }

  /**
   * Check if a specific match ID is active
   * 
   * @param matchId - Match ID to check
   * @returns Discovered match information or null
   */
  private async checkMatch(matchId: number): Promise<DiscoveredMatch | null> {
    try {
      const result = await this.parser.parseFlashdata(matchId);

      const match: DiscoveredMatch = {
        matchId,
        status: result ? 'active' : 'not_found',
        lastChecked: Date.now(),
      };

      if (result) {
        // Extract teams from any available data
        // Note: Actual team names would come from a separate schedule endpoint
        match.teams = {
          home: `Team-${matchId}-Home`,
          away: `Team-${matchId}-Away`,
        };
        match.startTime = new Date().toISOString(); // Would be actual game time
        this.discovered.set(matchId, match);
      }

      return match;
    } catch (error) {
      return {
        matchId,
        status: 'error',
        lastChecked: Date.now(),
      };
    }
  }

  /**
   * Get all active matches
   * 
   * @returns Array of active matches sorted by start time
   */
  getActiveMatches(): DiscoveredMatch[] {
    return Array.from(this.discovered.values())
      .filter((m) => m.status === 'active')
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }

  /**
   * Save discovered matches to disk for quick startup
   * 
   * @param path - File path to save to (default: active-matches.json)
   */
  async saveToDisk(path: string = 'active-matches.json'): Promise<void> {
    const data = {
      discoveredAt: Date.now(),
      matches: Array.from(this.discovered.values()),
    };

    await Bun.write(path, JSON.stringify(data, null, 2));
    console.log(`💾 Saved ${this.discovered.size} matches to ${path}`);
  }

  /**
   * Load discovered matches from disk
   * 
   * @param path - File path to load from (default: active-matches.json)
   */
  async loadFromDisk(path: string = 'active-matches.json'): Promise<void> {
    try {
      const file = Bun.file(path);
      if (await file.exists()) {
        const data = JSON.parse(await file.text());
        this.discovered = new Map(
          data.matches.map((m: DiscoveredMatch) => [m.matchId, m])
        );
        console.log(`📂 Loaded ${this.discovered.size} matches from ${path}`);
      } else {
        console.log(`📂 No saved matches found at ${path}`);
      }
    } catch (error) {
      console.log(`📂 Failed to load matches from ${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get discovered match by ID
   * 
   * @param matchId - Match ID to look up
   * @returns Discovered match or undefined
   */
  getMatch(matchId: number): DiscoveredMatch | undefined {
    return this.discovered.get(matchId);
  }

  /**
   * Clear all discovered matches
   */
  clear(): void {
    this.discovered.clear();
  }
}

