/**
 * [@CORE] Defensive Bookmaker Detector v3.0: Unified High-Value Integration
 *
 * [@BUN-API] Uses: Bun.Crypto, Bun.fetch, Bun.serve
 * [@INTEGRATION] P88 Partner API, PandBet/BetInAsia proxies
 * [@SECURITY] Signed: Ed25519 with audit trails
 *
 * [DOMAIN:betting][SCOPE:arbitrage-asia-highvalue][META:p88-pandbet-feeds][SEMANTIC:exhaustion-rlm][TYPE:detector]
 *
 * Unified detector supporting:
 * - Four-phase pattern detection (Steam → Hold → Absorption → Exhaustion)
 * - P88 Partner API integration (Asian Handicap, Virtual Sports)
 * - PandBet/BetInAsia integration (Esports, Live Casino)
 * - High-value market signal detection
 * - RLM (Reverse Line Movement) analytics
 * - Backward compatibility with SteamDataPoint format
 */

import { signatureCache } from './ed25519-audit.ts';
import type { SteamDataPoint } from './steam-pattern-analyzer.ts';
import { BOOKMAKER_CONFIG, BOOKMAKER_TIERS } from './bookmaker-registry.ts';
import { rgIndexDiff, type RGIndexDiff } from '../macros/rg-index.macro.ts';
import './bookmaker-core-utils.ts'; // Initialize global BookmakerCore

/**
 * [@TYPE] KV Namespace Interface (Cloudflare Workers compatible)
 */
export interface KVNamespace {
  get(key: string, options?: { type?: 'json' | 'text' }): Promise<any>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string }): Promise<{ keys: Array<{ name: string }> }>;
}

/**
 * [@TYPE] Defensive Pattern Types
 */
export type DefensivePhase = 'steam_hit' | 'defensive_hold' | 'absorption' | 'exhaustion';
export type DefenderType = 'auto_risk_limit' | 'manual_trader' | 'liability_algo';
export type FeedSource = 'p88' | 'pandbet' | 'generic';
export type MarketType = 'soccer' | 'virtual' | 'esports' | 'basketball' | 'live-casino' | 'generic';

/**
 * [@TYPE] Bet Type Detection
 */
export type BetType = 'team-total' | 'parlay' | 'same-game-parlay' | 'teaser' | 'bought-points' | 'total';
export type BetTiming = 'live' | 'pregame';
export type BetSpecifics = {
  legs?: number[];
  team?: string;
  teaserPoints?: number;
  correlationRisk?: number;
  complexityScore?: number;
};

/**
 * [@INTERFACE] Bet Type Market Pattern
 */
export interface BetTypeMarketPattern {
  betType: BetType;
  betTiming: BetTiming;
  betSpecifics?: BetSpecifics;
  correlationRisk: number;
  complexityScore: number;
}

/**
 * [@INTERFACE] Unified Tick Data Format
 */
export interface UnifiedTickData {
  time: number;
  O: number; // Over odds
  line: number;
  U?: number; // Under odds (optional)
  isAsiaEvent?: boolean;
  cryptoBacked?: boolean;
  market?: string;
  event?: string;
  source?: FeedSource;
  marketType?: MarketType;
}

/**
 * [@INTERFACE] Defensive Holding Pattern (Enhanced with Bookmaker Profile & RG)
 */
export interface DefensiveHoldingPattern {
  phase: DefensivePhase;
  startTime: number;
  duration: number;
  originalLine: number;
  defendedLine: number;
  pricePressure: 'over' | 'under';
  defenderType: DefenderType;
  exhaustionSignal: boolean;
  exhaustionConfidence: number;
  rlmIndicator: boolean;
  highValueMarketSignal: boolean;
  source: FeedSource;
  cryptoBacked: boolean;
  volatilityScore: number;
  signedData?: string;
  tradeOpportunities?: ExploitationPlan[];
  betType?: BetType;
  betTiming?: BetTiming;
  betSpecifics?: BetSpecifics;
  correlationRisk?: number;
  complexityScore?: number;
  // Bookmaker Profile Integration
  bookmakerTier?: keyof typeof BOOKMAKER_TIERS;
  bookmakerClassification?: string;
  bookmakerLatency?: number;
  // RG Integration
  rgIndexDiff?: RGIndexDiff;
  rgCompliant?: boolean;
  ruinRisk?: number;
  // P88 Liquidity Enforcement
  wagerSpecifics?: {
    periods?: Array<'ht' | 'q1' | 'q2' | 'q3' | 'q4' | 'ft'>;
    qualifiedLimit?: number;
    liquidityAvailable?: number;
    vetoReason?: string;
    exposureSnapshot?: { over: number; under: number; total: number };
    scaledStake?: number;
    auditHash?: string; // Rapid hash of audit trail for deduplication
  };
  liquidityEnforcement?: {
    tier: 'bronze' | 'silver' | 'gold';
    multiplierApplied: number;
    vetoTriggered: boolean;
    auditTrail: Array<{ timestamp: number; action: 'query' | 'veto' | 'scale'; details: string; hash?: string }>;
  };
}

/**
 * [@INTERFACE] Exploitation Plan
 */
export interface ExploitationPlan {
  strategy: string;
  reasoning: string;
  execution: string;
  expectedEdge: string;
  risk: string;
  optimalStake?: string;
  maxDuration?: string;
  meta?: string;
}

/**
 * [@CONSTANTS] High-Value Market Thresholds
 */
export const HIGH_VALUE_THRESHOLDS = {
  P88_ASIAN_HANDICAP: {
    minTick: 0.025,
    maxLatency: 20000,
    cryptoBoost: 0.35,
    priority: 1,
  },
  PANDBET_ESPORTS: {
    minTick: 0.03,
    maxLatency: 15000,
    cryptoBoost: 0.25,
    priority: 2,
  },
  VIRTUAL_SPORTS: {
    minTick: 0.02,
    maxLatency: 10000,
    cryptoBoost: 0.40,
    priority: 1,
  },
  GENERIC: {
    minTick: 0.04,
    maxLatency: 30000,
    cryptoBoost: 0.0,
    priority: 3,
  },
} as const;

/**
 * [@CONSTANTS] Bet Type Thresholds
 */
export const BET_TYPE_THRESHOLDS = {
  'team-total': {
    minTick: 0.5,
    volatilityMultiplier: 1.2,
    correlationThreshold: 0.6,
  },
  'parlay': {
    minTick: 0.3,
    volatilityMultiplier: 1.5,
    correlationThreshold: 0.7,
  },
  'same-game-parlay': {
    minTick: 0.25,
    volatilityMultiplier: 1.8,
    correlationThreshold: 0.75,
  },
  'teaser': {
    minTick: 0.4,
    volatilityMultiplier: 1.3,
    correlationThreshold: 0.65,
  },
  'bought-points': {
    minTick: 0.35,
    volatilityMultiplier: 1.4,
    correlationThreshold: 0.7,
  },
  'total': {
    minTick: 0.5,
    volatilityMultiplier: 1.0,
    correlationThreshold: 0.5,
  },
} as const;

/**
 * [@CONSTANTS] Bet Type Timing Thresholds
 */
export const BET_TIMING_THRESHOLDS = {
  'live': {
    volatilityMultiplier: 1.5,
    latencyBoost: 0.15,
  },
  'pregame': {
    volatilityMultiplier: 1.0,
    latencyBoost: 0.0,
  },
} as const;

/**
 * [@UTILITY] Normalize tick data to unified format
 */
function normalizeTickData(data: Array<any> | SteamDataPoint[]): UnifiedTickData[] {
  return data.map((tick: any) => {
    // Handle SteamDataPoint format (legacy)
    if ('time' in tick && typeof tick.time === 'string') {
      const [datePart, timePart] = tick.time.split(' ');
      const [month, day] = datePart.split('-');
      const [hour, minute] = timePart.split(':');
      return {
        time: new Date(`2024-${month}-${day}T${hour}:${minute}:00Z`).getTime(),
        O: tick.O,
        line: tick.line,
        U: tick.U,
        source: 'generic' as FeedSource,
      };
    }
    // Handle unified format
    return {
      time: tick.time || Date.now(),
      O: tick.O || 0,
      line: tick.line || 0,
      U: tick.U || (2.0 - (tick.O || 0)),
      isAsiaEvent: tick.isAsiaEvent || false,
      cryptoBacked: tick.cryptoBacked || false,
      market: tick.market,
      event: tick.event,
      source: tick.source || 'generic',
      marketType: tick.marketType || 'generic',
    };
  });
}

/**
 * [@INTEGRATION-P88] P88 Partner API Feed Ingestion
 */
export class P88Integration {
  private apiKey: string;
  private baseUrl = 'https://api.p88.bet/partner';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * [@METHOD] Ingest Asian Handicap feeds from P88
   */
  async ingestAsianHandicapFeeds(marketId: string): Promise<UnifiedTickData[]> {
    const response = await fetch(
      `${this.baseUrl}/odds?sport=soccer&markets=asian-handicap,total&api_key=${this.apiKey}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Bun-HighValue-Detector/3.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`P88 API error: ${response.status}`);
    }

    const oddsData = await response.json();
    const ticks = oddsData.odds?.map((odd: any) => ({
      time: Date.now(),
      O: parseFloat(odd.over_odds || odd.O || 1.95),
      line: parseFloat(odd.line || odd.handicap || 0),
      isAsiaEvent: true,
      cryptoBacked: odd.payment_methods?.includes('BTC') || odd.crypto_enabled || false,
      market: odd.market_name || 'asian-handicap',
      event: odd.event_name || marketId,
      source: 'p88' as FeedSource,
      marketType: 'soccer' as MarketType,
    })) || [];

    return ticks.filter(tick => tick.cryptoBacked && Math.abs(tick.line) <= 2.5);
  }

  /**
   * [@METHOD] Ingest Bet Type Feeds from P88
   */
  async ingestBetTypeFeeds(marketId: string, sport: string, betType: BetType): Promise<UnifiedTickData[]> {
    // Build endpoint based on bet type
    let endpoint = `/odds?sport=${sport}&markets=total&api_key=${this.apiKey}`;

    switch (betType) {
      case 'team-total':
        endpoint = `/odds?sport=${sport}&markets=team-totals&team=lakers&api_key=${this.apiKey}`;
        break;
      case 'parlay':
        endpoint = `/odds?sport=${sport}&markets=parlay&legs=6&correlated=true&api_key=${this.apiKey}`;
        break;
      case 'same-game-parlay':
        endpoint = `/odds?sport=${sport}&markets=parlay?correlated=true&api_key=${this.apiKey}`;
        break;
      case 'teaser':
        endpoint = `/odds?sport=${sport}&markets=teaser&points=6&api_key=${this.apiKey}`;
        break;
      case 'bought-points':
        endpoint = `/odds?sport=${sport}&markets=spread&bought=1.5&price=-120&api_key=${this.apiKey}`;
        break;
      default:
        endpoint = `/odds?sport=${sport}&markets=total&api_key=${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Bun-BetType-Detector/3.0',
      },
    });

    if (!response.ok) {
      throw new Error(`P88 BetType API error: ${response.status}`);
    }

    const oddsData = await response.json();
    return oddsData.markets?.flatMap((market: any) =>
      market.odds?.map((odd: any) => ({
        time: Date.now(),
        O: parseFloat(odd.over_odds || odd.O || 1.95),
        line: parseFloat(odd.line || odd.total || 0),
        isAsiaEvent: true,
        cryptoBacked: odd.payment_methods?.includes('BTC') || odd.crypto_enabled || false,
        market: market.market_name || betType,
        event: market.event_name || marketId,
        source: 'p88' as FeedSource,
        marketType: sport as MarketType,
        U: parseFloat(odd.under_odds || odd.U || (2.0 - parseFloat(odd.over_odds || odd.O || 1.95))),
      })) || []
    ) || [];
  }

  async ingestVirtualSportsFeeds(): Promise<UnifiedTickData[]> {
    const response = await fetch(
      `${this.baseUrl}/odds?sport=virtual&markets=winner,total&api_key=${this.apiKey}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Bun-HighValue-Detector/3.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`P88 Virtual API error: ${response.status}`);
    }

    const virtualData = await response.json();
    return virtualData.odds?.map((odd: any) => ({
      time: Date.now(),
      O: parseFloat(odd.odds || odd.O || 1.90),
      line: parseFloat(odd.line || 0),
      isAsiaEvent: true,
      cryptoBacked: true,
      market: 'virtual',
      event: odd.virtual_event || 'virtual-sports',
      source: 'p88' as FeedSource,
      marketType: 'virtual' as MarketType,
      U: 2.0 - parseFloat(odd.odds || odd.O || 1.90),
    })) || [];
  }
}

/**
 * [@INTEGRATION-PANDBET] PandBet Esports & Live Casino Integration
 */
export class PandBetIntegration {
  private apiKey: string;
  private baseUrl = 'https://api.betinasia.com/black/odds';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async ingestEsportsFeeds(marketId: string): Promise<UnifiedTickData[]> {
    const response = await fetch(
      `${this.baseUrl}?sport=esports&bookmakers=pandbet&api_key=${this.apiKey}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Bun-Esports-Detector/3.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`PandBet API error: ${response.status}`);
    }

    const oddsData = await response.json();
    return oddsData.odds?.map((odd: any) => ({
      time: Date.now(),
      O: parseFloat(odd.over_odds || odd.O || 1.90),
      line: parseFloat(odd.line || odd.total || 0),
      isAsiaEvent: true,
      cryptoBacked: odd.crypto_enabled || odd.payment_methods?.includes('BTC') || false,
      market: odd.game_type || 'esports',
      event: odd.match_name || marketId,
      source: 'pandbet' as FeedSource,
      marketType: 'esports' as MarketType,
      U: 2.0 - parseFloat(odd.over_odds || odd.O || 1.90),
    })) || [];
  }

  async ingestLiveCasinoFeeds(): Promise<UnifiedTickData[]> {
    const response = await fetch(
      `${this.baseUrl}?sport=live-casino&bookmakers=pandbet&api_key=${this.apiKey}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Bun-Casino-Detector/3.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`PandBet Casino API error: ${response.status}`);
    }

    const casinoData = await response.json();
    return casinoData.odds?.map((odd: any) => ({
      time: Date.now(),
      O: parseFloat(odd.odds || odd.O || 1.90),
      line: parseFloat(odd.line || 0),
      isAsiaEvent: true,
      cryptoBacked: true,
      market: odd.casino_game || 'live-casino',
      source: 'pandbet' as FeedSource,
      marketType: 'live-casino' as MarketType,
      U: 2.0 - parseFloat(odd.odds || odd.O || 1.90),
    })) || [];
  }
}

/**
 * [@CORE] Unified Defensive Bookmaker Detector
 */
export class DefensiveBookmakerDetector {
  private holdingPatterns = new Map<string, DefensiveHoldingPattern>();
  private p88Integration?: P88Integration;
  private pandbetIntegration?: PandBetIntegration;
  private kv?: KVNamespace;

  constructor(
    kv?: KVNamespace,
    p88Key?: string,
    pandbetKey?: string
  ) {
    this.kv = kv;
    if (p88Key) {
      this.p88Integration = new P88Integration(p88Key);
    }
    if (pandbetKey) {
      this.pandbetIntegration = new PandBetIntegration(pandbetKey);
    }
  }

  /**
   * [@METHOD] Main detection entry point (unified with bookmaker profile & RG)
   */
  async detectHoldingPattern(
    bookieId: string,
    marketId: string,
    data?: Array<any> | SteamDataPoint[],
    source: FeedSource = 'generic',
    betType?: BetType,
    betSpecifics?: BetSpecifics,
    bankroll?: number, // For RG calculations
    userTier?: 'bronze' | 'silver' | 'gold',
    proposedStake?: number,
    periods?: Array<'ht' | 'q1' | 'q2' | 'q3' | 'q4' | 'ft'>
  ): Promise<DefensiveHoldingPattern | null> {
    const startTime = globalThis.BookmakerCore?.timer.start() || Date.now();
    const key = `${bookieId}:${marketId}:${source}`;

    // Normalize input data
    let feedData: UnifiedTickData[] = [];
    if (data) {
      feedData = normalizeTickData(data);
    } else if (source === 'p88' && this.p88Integration) {
      // Use bet-type specific ingestion if provided
      if (betType) {
        feedData = await this.p88Integration.ingestBetTypeFeeds(marketId, 'basketball', betType);
      } else {
        feedData = await this.p88Integration.ingestAsianHandicapFeeds(marketId);
      }
    } else if (source === 'pandbet' && this.pandbetIntegration) {
      feedData = await this.pandbetIntegration.ingestEsportsFeeds(marketId);
    }

    if (!feedData || feedData.length === 0) {
      return null;
    }

    const pattern = this.identifyFourPhasePattern(feedData, source);
    if (!pattern) return null;

    // Enhanced AI scoring with bet-type detection
    pattern.exhaustionConfidence = this.computeExhaustionConfidence(pattern, feedData);
    pattern.highValueMarketSignal = this.detectHighValueMarketSignal(feedData, source);
    pattern.cryptoBacked = feedData.some(d => d.cryptoBacked);
    pattern.volatilityScore = this.calculateVolatilityScore(feedData);

    // Bet-type specific scoring
    if (betType) {
      pattern.betType = betType;
      pattern.betTiming = this.detectBetTiming(feedData);
      pattern.betSpecifics = betSpecifics;
      pattern.correlationRisk = this.computeBetTypeCorrelationRisk(feedData, betType);
      pattern.complexityScore = this.computeComplexityScore(feedData, betType);

      // Enhanced confidence with bet-type multipliers
      const betTypeThresholds = BET_TYPE_THRESHOLDS[betType];
      const betTimingThresholds = BET_TIMING_THRESHOLDS[pattern.betTiming || 'pregame'];
      pattern.exhaustionConfidence *= betTypeThresholds.volatilityMultiplier;
      pattern.exhaustionConfidence += betTimingThresholds.latencyBoost;
      pattern.exhaustionConfidence = Math.min(1.0, pattern.exhaustionConfidence);
    }

    // P88 Liquidity Enforcement (if P88 source and user tier provided)
    if (source === 'p88' && userTier && proposedStake && this.p88ApiKey) {
      const kellyEdge = pattern.exhaustionConfidence * 0.1; // Estimate edge from confidence
      const enforcement = await this.detailedLiquidityEnforcement(
        bookieId, marketId, proposedStake, userTier, kellyEdge, periods
      );

      // Add rapid hash to audit trail for deduplication
      if (enforcement.auditTrail) {
        enforcement.auditTrail.forEach((entry, i) => {
          entry.hash = globalThis.BookmakerCore?.rapidHash.liquidityKey(
            `${bookieId}:${marketId}`,
            entry.timestamp.toString(),
            i.toString()
          ).toString(36) || '';
        });
      }

      pattern.liquidityEnforcement = enforcement;
      pattern.wagerSpecifics = {
        periods,
        qualifiedLimit: enforcement.qualifiedLimit,
        liquidityAvailable: enforcement.liquidityAvailable,
        vetoReason: enforcement.vetoTriggered ? 'Liquidity limit exceeded' : undefined,
        scaledStake: enforcement.scaledStake,
        auditHash: globalThis.BookmakerCore?.rapidHash.liquidityKey(
          bookieId, marketId, userTier
        ).toString(36) || '',
      };
    }

    // Bookmaker Profile Integration
    const bookmakerProfile = this.getBookmakerProfile(bookieId);
    if (bookmakerProfile) {
      pattern.bookmakerTier = bookmakerProfile.tier;
      pattern.bookmakerClassification = BOOKMAKER_TIERS[bookmakerProfile.tier].classification;
      pattern.bookmakerLatency = BOOKMAKER_TIERS[bookmakerProfile.tier].typicalLatency;

      // Adjust thresholds based on bookmaker tier
      const tierMultiplier = this.getTierMultiplier(bookmakerProfile.tier);
      pattern.exhaustionConfidence *= tierMultiplier;

      // Tier-specific bet-type adjustments
      if (betType && bookmakerProfile.tier === 'TIER_1_SHARP') {
        // Sharp books have tighter bet-type thresholds
        pattern.exhaustionConfidence *= 1.1; // Boost for sharp books
      } else if (betType && bookmakerProfile.tier === 'TIER_3_US_RECREATIONAL') {
        // Recreational books have looser thresholds but higher RG compliance
        pattern.exhaustionConfidence *= 0.95; // Slight reduction for recreational
      }
    }

    // RG Integration: Calculate RG index diff
    if (feedData.length >= 2 && bankroll) {
      const cacheOdds = feedData[0].O;
      const streamOdds = feedData[feedData.length - 1].O;
      pattern.rgIndexDiff = rgIndexDiff(cacheOdds, streamOdds, bankroll);
      pattern.ruinRisk = pattern.rgIndexDiff.ruinRisk;
      pattern.rgCompliant = !pattern.rgIndexDiff.rgAlert && pattern.rgIndexDiff.ruinRisk < 2.5;

      // RG-based bet-type adjustments
      if (betType && pattern.rgIndexDiff.rgAlert) {
        // Reduce confidence if RG alert triggered
        pattern.exhaustionConfidence *= 0.8;
      }

      // Bet-type specific RG thresholds
      if (betType === 'same-game-parlay' && pattern.rgIndexDiff.ruinRisk > 1.5) {
        // SGPs have stricter RG thresholds
        pattern.rgCompliant = false;
        pattern.exhaustionConfidence *= 0.7;
      }
    }

    // Sign pattern
    const signedPattern = await this.signPattern(pattern);
    pattern.signedData = signedPattern;

    // Store and alert
    if (this.kv) {
      await this.triggerHighValueAlert(bookieId, marketId, pattern, signedPattern);
      await this.storeVulnerability(key, pattern);
    }

    const tradeOpportunities = this.generateExploitationPlan(pattern);
    pattern.tradeOpportunities = tradeOpportunities;

    this.holdingPatterns.set(key, pattern);

    // Log with clean ANSI-stripped format for P88 audit
    if (globalThis.BookmakerCore) {
      const elapsed = globalThis.BookmakerCore.timer.end(startTime);
      console.log(globalThis.BookmakerCore.ansi.color(
        `[BUN-API] Pattern detected for ${marketId} (took ${elapsed}ms)`,
        'green'
      ));
    }

    return pattern;
  }

  /**
   * [@METHOD] Identify four-phase defensive pattern
   */
  private identifyFourPhasePattern(
    data: UnifiedTickData[],
    source: FeedSource
  ): DefensiveHoldingPattern | null {
    const steamBurst = this.findSteamBurst(data, source);
    if (!steamBurst) return null;

    const defensiveHold = this.findDefensiveHold(data, steamBurst.endIndex);
    if (!defensiveHold) return null;

    const absorption = this.findAbsorptionPhase(data, defensiveHold.endIndex, steamBurst.pressure);
    if (!absorption) return null;

    const exhaustion = this.findExhaustionPhase(data, absorption.endIndex, steamBurst.pressure, defensiveHold);
    if (!exhaustion) return null;

    return {
      phase: 'exhaustion',
      startTime: steamBurst.startTime,
      duration: exhaustion.endTime - steamBurst.startTime,
      originalLine: steamBurst.originalLine,
      defendedLine: defensiveHold.defendedLine,
      pricePressure: steamBurst.pressure,
      defenderType: this.identifyDefenderType(defensiveHold, absorption),
      exhaustionSignal: exhaustion.isExhausted,
      exhaustionConfidence: 0,
      rlmIndicator: this.detectRLM(data, steamBurst, defensiveHold),
      highValueMarketSignal: false,
      source,
      cryptoBacked: data.some(d => d.cryptoBacked),
      volatilityScore: 0,
    };
  }

  /**
   * [@METHOD] Find steam burst pattern
   */
  private findSteamBurst(
    data: UnifiedTickData[],
    source: FeedSource
  ): {
    startIndex: number;
    endIndex: number;
    startTime: number;
    originalLine: number;
    pressure: 'over' | 'under';
  } | null {
    const threshold = HIGH_VALUE_THRESHOLDS[
      source === 'p88' ? 'P88_ASIAN_HANDICAP' :
      source === 'pandbet' ? 'PANDBET_ESPORTS' :
      'GENERIC'
    ];

    for (let i = 0; i < data.length - 2; i++) {
      const moves: Array<{ tick: number; direction: 'up' | 'down'; line: number; time: number }> = [];
      let lastMoveTime = data[i].time;

      for (let j = i + 1; j < Math.min(i + 4, data.length); j++) {
        const tick = Math.abs(data[j].O - data[j - 1].O);
        const moveTime = data[j].time;
        const timeDiff = moveTime - lastMoveTime;

        if (timeDiff <= 5 * 60 * 1000) {
          if (tick >= threshold.minTick || tick >= 0.03) {
            moves.push({
              tick,
              direction: data[j].O > data[j - 1].O ? 'up' : 'down',
              line: data[j].line,
              time: moveTime,
            });
            lastMoveTime = moveTime;
          } else {
            lastMoveTime = moveTime;
          }
        } else {
          break;
        }
      }

      if (moves.length >= 2) {
        const endIdx = i + moves.length - 1;
        const upMoves = moves.filter(m => m.direction === 'up').length;
        return {
          startIndex: i,
          endIndex: endIdx < data.length ? endIdx : data.length - 1,
          startTime: data[i].time,
          originalLine: data[i].line,
          pressure: upMoves > moves.length / 2 ? 'over' : 'under',
        };
      }
    }
    return null;
  }

  /**
   * [@METHOD] Find defensive hold pattern
   */
  private findDefensiveHold(
    data: UnifiedTickData[],
    startIndex: number
  ): {
    startIndex: number;
    endIndex: number;
    defendedLine: number;
  } | null {
    const window = data.slice(startIndex + 1, Math.min(startIndex + 7, data.length));
    if (window.length < 3) return null;

    const tickSizes: number[] = [];
    for (let i = 1; i < window.length; i++) {
      tickSizes.push(Math.abs(window[i].O - window[i - 1].O));
    }

    const avgTick = tickSizes.reduce((a, b) => a + b, 0) / tickSizes.length;
    const isOscillating = this.detectOscillation(window);
    const lineRange = Math.max(...window.map(d => d.line)) - Math.min(...window.map(d => d.line));

    if (avgTick <= 0.03 && isOscillating && lineRange <= 1) {
      return {
        startIndex: startIndex + 1,
        endIndex: startIndex + 1 + window.length,
        defendedLine: window[window.length - 1].line,
      };
    }
    return null;
  }

  /**
   * [@METHOD] Find absorption phase
   */
  private findAbsorptionPhase(
    data: UnifiedTickData[],
    startIndex: number,
    pressure: 'over' | 'under'
  ): { startIndex: number; endIndex: number } | null {
    const window = data.slice(startIndex, Math.min(startIndex + 5, data.length));
    if (window.length < 2) return null;

    const moves: Array<{ direction: 'up' | 'down'; magnitude: number }> = [];
    for (let i = 1; i < window.length; i++) {
      moves.push({
        direction: window[i].O > window[i - 1].O ? 'up' : 'down',
        magnitude: Math.abs(window[i].O - window[i - 1].O),
      });
    }

    const smallMoves = moves.filter(m => m.magnitude < 0.03).length;
    if (smallMoves >= moves.length * 0.6) {
      return {
        startIndex,
        endIndex: startIndex + window.length,
      };
    }
    return null;
  }

  /**
   * [@METHOD] Find exhaustion phase
   */
  private findExhaustionPhase(
    data: UnifiedTickData[],
    startIndex: number,
    pressure: 'over' | 'under',
    defensiveHold: any
  ): { endTime: number; isExhausted: boolean } | null {
    const window = data.slice(startIndex, Math.min(startIndex + 5, data.length));
    if (window.length < 2) return null;

    const isReversing = this.isReversing(window, pressure);
    const isDecaying = this.isDecaying(window);
    const isWeak = this.isWeak(window);

    if (isReversing || isDecaying || isWeak) {
      return {
        endTime: window[window.length - 1].time,
        isExhausted: true,
      };
    }
    return null;
  }

  /**
   * [@METHOD] Enhanced RLM detection
   */
  private detectRLM(data: UnifiedTickData[], steamBurst: any, defensiveHold: any): boolean {
    const earlyMoves = data.slice(0, Math.floor(data.length * 0.3));
    const lateMoves = data.slice(Math.floor(data.length * 0.7));

    const earlyPressure = this.calculatePressureDirection(earlyMoves);
    const latePressure = this.calculatePressureDirection(lateMoves);

    return earlyPressure !== latePressure && earlyPressure !== 'neutral';
  }

  /**
   * [@METHOD] Detect high-value market signals
   */
  private detectHighValueMarketSignal(data: UnifiedTickData[], source: FeedSource): boolean {
    const hasAsiaCrypto = data.filter(d => d.isAsiaEvent && d.cryptoBacked).length > 2;
    const avgDuration = this.calculateAverageUpdateDuration(data);

    const thresholds = HIGH_VALUE_THRESHOLDS[
      source === 'p88' ? 'P88_ASIAN_HANDICAP' :
      source === 'pandbet' ? 'PANDBET_ESPORTS' :
      'GENERIC'
    ];

    return hasAsiaCrypto && avgDuration < thresholds.maxLatency;
  }

  /**
   * [@METHOD] Compute exhaustion confidence
   */
  private computeExhaustionConfidence(pattern: DefensiveHoldingPattern, data: UnifiedTickData[]): number {
    let score = 0;

    if (pattern.rlmIndicator) score += 0.35;
    if (pattern.exhaustionSignal) score += 0.25;
    if (pattern.highValueMarketSignal) {
      const boost = HIGH_VALUE_THRESHOLDS[
        pattern.source === 'p88' ? 'P88_ASIAN_HANDICAP' :
        pattern.source === 'pandbet' ? 'PANDBET_ESPORTS' :
        'GENERIC'
      ].cryptoBoost;
      score += boost;
    }
    if (pattern.duration < 900000) score += 0.2;

    return Math.min(1, score);
  }

  /**
   * [@METHOD] Sign pattern with Ed25519
   */
  private async signPattern(pattern: DefensiveHoldingPattern): Promise<string> {
    return await signatureCache.getSignature({
      pattern: {
        phase: pattern.phase,
        exhaustionConfidence: pattern.exhaustionConfidence,
        highValueMarketSignal: pattern.highValueMarketSignal,
        source: pattern.source,
      },
    });
  }

  /**
   * [@METHOD] Trigger high-value alerts
   */
  private async triggerHighValueAlert(
    bookieId: string,
    marketId: string,
    pattern: DefensiveHoldingPattern,
    signedData: string
  ): Promise<void> {
    if (!this.kv) return;

    const exploitationPlan = this.generateExploitationPlan(pattern);
    await this.kv.put(`alert:${bookieId}:${marketId}`, JSON.stringify({
      pattern,
      signedData,
      exploitationPlan,
      timestamp: new Date().toISOString(),
      priority: pattern.highValueMarketSignal ? 'HIGH' : 'MEDIUM',
    }), { expirationTtl: 7200 });
  }

  /**
   * [@METHOD] Generate exploitation plans (enhanced with bet-type strategies & RG compliance)
   */
  private generateExploitationPlan(pattern: DefensiveHoldingPattern): ExploitationPlan[] {
    const plans: ExploitationPlan[] = [];

    // Bet-type specific exploitation plans
    if (pattern.betType === 'same-game-parlay' && pattern.correlationRisk && pattern.correlationRisk > 0.6) {
      plans.push({
        strategy: 'EXPLOIT_SGP_CORRELATION_RLM',
        reasoning: 'High correlation in SGP legs (e.g., Q1 Over + player prop) drains live liability',
        execution: 'Pulse correlated legs via /markets/parlay?correlated=true, front-run quarter exhaustion',
        expectedEdge: '9-13%',
        risk: 'Medium - monitor leg-by-leg RLM',
        meta: `[META:sgp-live-exhaustion][SEMANTIC:correlation-reversal][TIER:${pattern.bookmakerTier || 'unknown'}][RG:${pattern.rgCompliant ? 'compliant' : 'alert'}]`,
      });
    }

    if (pattern.betType === 'team-total' && pattern.betTiming === 'live') {
      plans.push({
        strategy: 'EXPLOIT_TEAM_TOTAL_LIVE_EXHAUSTION',
        reasoning: 'Team totals show tighter defensive holds during live play',
        execution: 'Focus on team-specific rotations, exploit quarter/half transitions',
        expectedEdge: '7-11%',
        risk: 'Medium - requires game context awareness',
        meta: `[META:team-total-live][SEMANTIC:rotation-exhaustion][TIER:${pattern.bookmakerTier || 'unknown'}]`,
      });
    }

    if (pattern.betType === 'teaser' && pattern.betSpecifics?.teaserPoints) {
      plans.push({
        strategy: 'EXPLOIT_TEASER_KEY_NUMBERS',
        reasoning: 'Teasers exploit key number crosses (3, 4, 7 in football)',
        execution: 'Target key numbers with cross-sport correlation analysis',
        expectedEdge: '8-12%',
        risk: 'Medium - adjusted line volatility',
        meta: `[META:teaser-key-numbers][SEMANTIC:cross-sport-correlation][TIER:${pattern.bookmakerTier || 'unknown'}]`,
      });
    }

    if (pattern.betType === 'bought-points') {
      plans.push({
        strategy: 'EXPLOIT_BOUGHT_POINTS_KEY_CROSS',
        reasoning: 'Bought points protect key number crosses (+3/-3 in basketball)',
        execution: 'Monitor key number crosses with bought point protection',
        expectedEdge: '7-10%',
        risk: 'Low - predictable key number behavior',
        meta: `[META:bought-points-key-cross][SEMANTIC:key-number-protection][TIER:${pattern.bookmakerTier || 'unknown'}]`,
      });
    }

    // RG-aware exploitation plans
    if (pattern.rgIndexDiff && pattern.rgCompliant && pattern.exhaustionConfidence > 0.75) {
      plans.push({
        strategy: 'EXPLOIT_RG_COMPLIANT_PATTERN',
        reasoning: `RG-compliant pattern detected (ruin-risk: ${pattern.ruinRisk?.toFixed(2)}%, tier: ${pattern.bookmakerTier})`,
        execution: `Safe exploitation within RG limits, monitor ${pattern.betType || 'standard'} market`,
        expectedEdge: pattern.betType === 'same-game-parlay' ? '9-13%' : '6-10%',
        risk: 'Low - RG compliant',
        meta: `[META:rg-compliant][SEMANTIC:safe-exploitation][TIER:${pattern.bookmakerTier || 'unknown'}][BET-TYPE:${pattern.betType || 'standard'}]`,
      });
    }

    // Standard exploitation plans
    if (pattern.highValueMarketSignal && pattern.exhaustionConfidence > 0.80) {
      const sourceStrat = pattern.source === 'p88'
        ? 'EXPLOIT_P88_PARTNER_RLM'
        : pattern.source === 'pandbet'
        ? 'EXPLOIT_PANDBET_ESPORTS_RLM'
        : 'EXPLOIT_GENERIC_RLM';

      plans.push({
        strategy: sourceStrat,
        reasoning: `${pattern.source.toUpperCase()} ${pattern.cryptoBacked ? 'crypto-backed ' : ''}market showing defensive exhaustion`,
        execution: `Timed entry on ${pattern.pricePressure} side during RLM reversal`,
        expectedEdge: pattern.source === 'p88' ? '8-11%' : pattern.source === 'pandbet' ? '7-10%' : '3-5%',
        risk: 'LOW - API-stable high-value source',
        optimalStake: 'Kelly 0.15',
        maxDuration: '30 minutes',
        meta: `[META:${pattern.source}-highvalue][SEMANTIC:defensive-exhaustion][TIER:${pattern.bookmakerTier || 'unknown'}]`,
      });
    }

    if (pattern.defenderType === 'manual_trader') {
      plans.push({
        strategy: 'EXHAUST_THE_TRADER',
        reasoning: 'Human traders have limited capital and will give up',
        execution: 'Keep hitting the same side every 30-60s until they stop defending',
        expectedEdge: '3-5% after exhaustion',
        risk: 'Medium - trader may have deep pockets today',
        optimalStake: 'Kelly 0.15',
        maxDuration: '30 minutes',
      });
    }

    if (pattern.defenderType === 'auto_risk_limit') {
      plans.push({
        strategy: 'TRIGGER_THE_LIMIT',
        reasoning: 'Auto systems have hard-coded exposure limits',
        execution: 'Calculate their risk threshold and force them to freeze the market',
        expectedEdge: '2-3% when market freezes + you can arb out',
        risk: 'Low - systems are predictable',
        optimalStake: 'Kelly 0.12',
        maxDuration: '15 minutes',
      });
    }

    if (pattern.exhaustionSignal) {
      plans.push({
        strategy: 'FRONT_RUN_THE_EXHAUSTION',
        reasoning: 'Defender is out of ammo, true price about to move hard',
        execution: 'Bet with the defensive pressure BEFORE they give up',
        expectedEdge: '4-7% (highest)',
        risk: 'High - requires perfect timing',
        optimalStake: 'Kelly 0.18',
        maxDuration: '10 minutes',
      });
    }

    return plans;
  }

  /**
   * [@METHOD] Store vulnerability in KV
   */
  private async storeVulnerability(key: string, pattern: DefensiveHoldingPattern): Promise<void> {
    if (!this.kv) return;

    await this.kv.put(`vulnerable:${key}`, JSON.stringify({
      pattern,
      expiresAt: Date.now() + 3600000,
      priority: pattern.highValueMarketSignal ? 1 : 2,
    }), { expirationTtl: 3600 });
  }

  /**
   * [@UTILITY] Calculate average update duration
   */
  private calculateAverageUpdateDuration(data: UnifiedTickData[]): number {
    if (data.length < 2) return 0;
    const durations: number[] = [];
    for (let i = 1; i < data.length; i++) {
      durations.push(data[i].time - data[i - 1].time);
    }
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }

  /**
   * [@UTILITY] Calculate volatility score
   */
  private calculateVolatilityScore(data: UnifiedTickData[]): number {
    if (data.length < 2) return 0;
    const changes: number[] = [];
    for (let i = 1; i < data.length; i++) {
      changes.push(Math.abs(data[i].O - data[i - 1].O));
    }
    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
    return Math.min(1, avgChange * 10);
  }

  /**
   * [@UTILITY] Calculate pressure direction
   */
  private calculatePressureDirection(moves: UnifiedTickData[]): 'over' | 'under' | 'neutral' {
    if (moves.length < 2) return 'neutral';
    const upMoves = moves.filter((m, i) => i > 0 && m.O > moves[i - 1].O).length;
    const downMoves = moves.filter((m, i) => i > 0 && m.O < moves[i - 1].O).length;
    if (upMoves > downMoves) return 'over';
    if (downMoves > upMoves) return 'under';
    return 'neutral';
  }

  /**
   * [@UTILITY] Detect oscillation
   */
  private detectOscillation(data: UnifiedTickData[]): boolean {
    if (data.length < 3) return false;
    let directionChanges = 0;
    for (let i = 1; i < data.length - 1; i++) {
      const prevDir = data[i].O > data[i - 1].O ? 'up' : 'down';
      const currDir = data[i + 1].O > data[i].O ? 'up' : 'down';
      if (prevDir !== currDir) directionChanges++;
    }
    return directionChanges >= 2;
  }

  /**
   * [@UTILITY] Check if reversing
   */
  private isReversing(window: UnifiedTickData[], originalPressure: 'over' | 'under'): boolean {
    if (window.length < 2) return false;
    const firstOdds = window[0].O;
    const lastOdds = window[window.length - 1].O;
    const movedUp = lastOdds > firstOdds;
    return originalPressure === 'over' ? movedUp : !movedUp;
  }

  /**
   * [@UTILITY] Check if decaying
   */
  private isDecaying(window: UnifiedTickData[]): boolean {
    if (window.length < 3) return false;
    const ticks: number[] = [];
    for (let i = 1; i < window.length; i++) {
      ticks.push(Math.abs(window[i].O - window[i - 1].O));
    }
    return ticks.length >= 2 && ticks[ticks.length - 1] < ticks[0] * 0.5;
  }

  /**
   * [@UTILITY] Check if weak
   */
  private isWeak(window: UnifiedTickData[]): boolean {
    if (window.length < 2) return false;
    const avgTick = window.slice(1).reduce((sum, d, i) =>
      sum + Math.abs(d.O - window[i].O), 0
    ) / (window.length - 1);
    return avgTick < 0.02;
  }

  /**
   * [@UTILITY] Identify defender type
   */
  private identifyDefenderType(defensiveHold: any, absorption: any): DefenderType {
    // Enhanced classification logic
    if (defensiveHold.characteristics?.avgTick) {
      const rounded = Math.round(defensiveHold.characteristics.avg
