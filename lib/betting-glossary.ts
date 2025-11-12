/**
 * Betting Glossary - Enhanced Comprehensive Implementation (v2.1.02)
 *
 * Full betting terminology with categories, definitions, search functionality,
 * ranked search results, autocomplete suggestions, and term relationships.
 * 
 * Features:
 * - 70+ betting terms across 5 categories
 * - Ranked search results with relevance scoring
 * - Autocomplete suggestions
 * - Term relationship graph
 * - Advanced filtering and sorting
 */

/**
 * Betting Glossary Version
 * TES-OPS-004.A.1: Canonical version constant for /bump utility
 */
export const VERSION = '2.1.02';

export type TermCategory = 'bet-types' | 'markets' | 'odds' | 'general' | 'rg_compliance';

export interface SearchResult {
  term: GlossaryTerm;
  score: number;
  matchType: 'exact' | 'term' | 'abbreviation' | 'definition' | 'tag' | 'example';
}

// Export TermCategory as a value for runtime use
export const TermCategory = {
  BET_TYPES: 'bet-types' as const,
  MARKETS: 'markets' as const,
  ODDS: 'odds' as const,
  GENERAL: 'general' as const,
  RG_COMPLIANCE: 'rg_compliance' as const,
  'bet-types': 'bet-types' as const,
  'markets': 'markets' as const,
  'odds': 'odds' as const,
  'general': 'general' as const,
  'rg_compliance': 'rg_compliance' as const,
};

export interface GlossaryTerm {
  id: string;
  term: string;
  abbreviation?: string;
  category: TermCategory;
  definition: string;
  examples?: string[];
  relatedTerms?: string[];
  tags?: string[];
  rgCompliant?: boolean;
  complexity?: 'basic' | 'intermediate' | 'advanced';
  synonyms?: string[]; // Alternative names for the term
  seeAlso?: string[]; // Related terms to explore
}

export class BettingGlossaryRegistry {
  private static instance: BettingGlossaryRegistry;
  private terms: Map<string, GlossaryTerm> = new Map();
  private termsByCategory: Map<TermCategory, GlossaryTerm[]> = new Map();
  private searchIndex: Map<string, Set<string>> = new Map(); // Word -> term IDs for fast lookup

  constructor() {
    this.initializeTerms();
  }

  static getInstance(): BettingGlossaryRegistry {
    if (!BettingGlossaryRegistry.instance) {
      BettingGlossaryRegistry.instance = new BettingGlossaryRegistry();
    }
    return BettingGlossaryRegistry.instance;
  }

  private initializeTerms(): void {
    const glossaryData: GlossaryTerm[] = [
      // Bet Types
      {
        id: 'moneyline',
        term: 'Moneyline',
        abbreviation: 'ML',
        category: 'bet-types',
        definition: 'A bet on which team or player will win the event. No point spread involved.',
        examples: ['Lakers ML vs Celtics', 'Tom Brady ML vs Patrick Mahomes'],
        relatedTerms: ['spread', 'total'],
        tags: ['basic', 'straight-bet'],
        rgCompliant: true,
        complexity: 'basic',
      },
      {
        id: 'spread',
        term: 'Point Spread',
        abbreviation: 'Spread',
        category: 'bet-types',
        definition: 'A bet where one team is given a points handicap. The favorite must win by more than the spread, or the underdog can lose by less than the spread.',
        examples: ['Lakers -5.5 vs Celtics', 'Chiefs +3.5 vs Buccaneers'],
        relatedTerms: ['moneyline', 'cover'],
        tags: ['handicap', 'points'],
        rgCompliant: true,
        complexity: 'basic',
      },
      {
        id: 'total',
        term: 'Total (Over/Under)',
        abbreviation: 'O/U',
        category: 'bet-types',
        definition: 'A bet on whether the total points scored in a game will be over or under a specified number.',
        examples: ['Over 220.5 points', 'Under 45.5 rushing yards'],
        relatedTerms: ['over', 'under'],
        tags: ['total', 'points'],
        rgCompliant: true,
        complexity: 'basic',
      },
      {
        id: 'parlay',
        term: 'Parlay',
        category: 'bet-types',
        definition: 'A single bet that combines multiple individual bets. All legs must win for the parlay to pay out.',
        examples: ['2-leg parlay: Lakers ML + Over 220.5', '3-leg parlay with moneyline, spread, and total'],
        relatedTerms: ['teaser', 'round-robin'],
        tags: ['multiple', 'combination'],
        rgCompliant: true,
        complexity: 'intermediate',
      },
      {
        id: 'teaser',
        term: 'Teaser',
        category: 'bet-types',
        definition: 'A type of parlay where the point spreads are adjusted in the bettor\'s favor, but at reduced odds.',
        examples: ['6-point teaser: Move spreads 6 points in your favor', '10-point teaser for NFL'],
        relatedTerms: ['parlay', 'pleaser'],
        tags: ['adjusted', 'spread'],
        rgCompliant: true,
        complexity: 'intermediate',
      },
      {
        id: 'same-game-parlay',
        term: 'Same Game Parlay',
        abbreviation: 'SGP',
        category: 'bet-types',
        definition: 'A parlay combining multiple bets from the same game, such as player props and team outcomes.',
        examples: ['Luka Doncic over 25.5 points + Mavericks ML', 'Patrick Mahomes over 250 passing yards + Chiefs -3.5'],
        relatedTerms: ['parlay', 'player-props'],
        tags: ['same-game', 'combination'],
        rgCompliant: true,
        complexity: 'intermediate',
      },
      {
        id: 'bought-points',
        term: 'Bought Points',
        category: 'bet-types',
        definition: 'Purchasing additional points on a spread bet, which reduces the payout but makes covering easier.',
        examples: ['Buying half a point on a -3.5 spread', 'Moving from -7 to -6.5 for better odds'],
        relatedTerms: ['spread', 'run-line'],
        tags: ['adjustment', 'points'],
        rgCompliant: true,
        complexity: 'advanced',
      },
      {
        id: 'round-robin',
        term: 'Round Robin',
        category: 'bet-types',
        definition: 'A betting strategy that creates multiple smaller parlays from a larger set of bets.',
        examples: ['3-out-of-5 round robin creates 10 separate 3-leg parlays', 'Reduces risk compared to single large parlay'],
        relatedTerms: ['parlay', 'combination'],
        tags: ['strategy', 'multiple'],
        rgCompliant: true,
        complexity: 'advanced',
      },
      {
        id: 'pleaser',
        term: 'Pleaser',
        category: 'bet-types',
        definition: 'The opposite of a teaser - spreads are moved against the bettor for higher payouts.',
        examples: ['10-point pleaser: Move spreads 10 points against you', 'Higher risk, higher reward'],
        relatedTerms: ['teaser', 'spread'],
        tags: ['high-risk', 'adjusted'],
        rgCompliant: true,
        complexity: 'advanced',
      },
      {
        id: 'if-bet',
        term: 'If Bet',
        category: 'bet-types',
        definition: 'A series of bets where each subsequent bet is only placed if the previous one wins.',
        examples: ['If Bet: First bet wins, then place second bet', 'Stops losses if first bet loses'],
        relatedTerms: ['parlay', 'conditional'],
        tags: ['conditional', 'series'],
        rgCompliant: true,
        complexity: 'intermediate',
      },
      {
        id: 'action-reversals',
        term: 'Action Reversals',
        category: 'bet-types',
        definition: 'Bets that reverse the action of another bet, effectively hedging or creating arbitrage opportunities.',
        examples: ['Reverse a moneyline bet with a spread bet', 'Creating risk-free scenarios'],
        relatedTerms: ['hedge', 'arbitrage'],
        tags: ['hedging', 'advanced'],
        rgCompliant: true,
        complexity: 'advanced',
      },

      // Markets
      {
        id: 'player-props',
        term: 'Player Props',
        abbreviation: 'Props',
        category: 'markets',
        definition: 'Bets on individual player performances, such as points scored, rebounds, or passing yards.',
        examples: ['Stephen Curry over 25.5 points', 'Christian McCaffrey over 85.5 rushing yards'],
        relatedTerms: ['prop-bet', 'player-specific'],
        tags: ['player', 'performance'],
        rgCompliant: true,
        complexity: 'basic',
      },
      {
        id: 'team-total',
        term: 'Team Total',
        category: 'markets',
        definition: 'A bet on the total points scored by one specific team, rather than both teams combined.',
        examples: ['Lakers over 115.5 points', 'Chiefs under 23.5 points'],
        relatedTerms: ['total', 'team-specific'],
        tags: ['team', 'total'],
        rgCompliant: true,
        complexity: 'intermediate',
      },
      {
        id: 'first-half',
        term: 'First Half',
        abbreviation: '1H',
        category: 'markets',
        definition: 'Bets that only consider the first half of a game.',
        examples: ['First half moneyline', 'First half total over 45.5'],
        relatedTerms: ['second-half', 'live-betting'],
        tags: ['half', 'timing'],
        rgCompliant: true,
        complexity: 'basic',
      },
      {
        id: 'second-half',
        term: 'Second Half',
        abbreviation: '2H',
        category: 'markets',
        definition: 'Bets that only consider the second half of a game.',
        examples: ['Second half moneyline', 'Second half total under 35.5'],
        relatedTerms: ['first-half', 'live-betting'],
        tags: ['half', 'timing'],
        rgCompliant: true,
        complexity: 'basic',
      },
      {
        id: 'live-betting',
        term: 'Live Betting',
        abbreviation: 'In-Play',
        category: 'markets',
        definition: 'Bets placed after a game has started, with odds that change in real-time.',
        examples: ['Live spread betting', 'Live player props during game'],
        relatedTerms: ['in-game', 'real-time'],
        tags: ['live', 'dynamic'],
        rgCompliant: true,
        complexity: 'intermediate',
      },
      {
        id: 'quarter-betting',
        term: 'Quarter Betting',
        category: 'markets',
        definition: 'Bets on specific quarters of a game, such as first quarter or third quarter.',
        examples: ['First quarter total over 22.5', 'Third quarter moneyline'],
        relatedTerms: ['half', 'live-betting'],
        tags: ['quarter', 'timing'],
        rgCompliant: true,
        complexity: 'intermediate',
      },
      {
        id: 'period-betting',
        term: 'Period Betting',
        category: 'markets',
        definition: 'Bets on specific periods in hockey, soccer, or other sports with periods.',
        examples: ['First period total goals', 'Third period moneyline'],
        relatedTerms: ['quarter', 'live-betting'],
        tags: ['period', 'timing'],
        rgCompliant: true,
        complexity: 'intermediate',
      },
      {
        id: 'inning-betting',
        term: 'Inning Betting',
        category: 'markets',
        definition: 'Bets on specific innings in baseball games.',
        examples: ['First inning total runs', 'Seventh inning moneyline'],
        relatedTerms: ['live-betting', 'baseball'],
        tags: ['inning', 'baseball'],
        rgCompliant: true,
        complexity: 'advanced',
      },
      {
        id: 'futures-betting',
        term: 'Futures Betting',
        category: 'markets',
        definition: 'Bets on events that will happen in the future, such as season winners or awards.',
        examples: ['Super Bowl winner', 'MVP winner', 'World Series champion'],
        relatedTerms: ['season-long', 'outcomes'],
        tags: ['future', 'season'],
        rgCompliant: true,
        complexity: 'basic',
      },
      {
        id: 'season-props',
        term: 'Season Props',
        category: 'markets',
        definition: 'Bets on season-long achievements or statistics.',
        examples: ['Player to score 2000+ points', 'Team to win 60+ games'],
        relatedTerms: ['futures', 'achievements'],
        tags: ['season', 'achievement'],
        rgCompliant: true,
        complexity: 'intermediate',
      },

      // Odds
      {
        id: 'decimal-odds',
        term: 'Decimal Odds',
        category: 'odds',
        definition: 'Odds format showing the total payout including stake. Popular in Europe.',
        examples: ['2.50 (returns $2.50 for every $1 bet)', '1.80 (returns $1.80 for every $1 bet)'],
        relatedTerms: ['american-odds', 'fractional-odds'],
        tags: ['format', 'decimal'],
        rgCompliant: true,
        complexity: 'basic',
      },
      {
        id: 'american-odds',
        term: 'American Odds',
        category: 'odds',
        definition: 'Odds format using positive/negative numbers. Positive shows profit on $100 bet, negative shows amount needed to win $100.',
        examples: ['+150 (win $150 on $100 bet)', '-200 (bet $200 to win $100)'],
        relatedTerms: ['decimal-odds', 'moneyline'],
        tags: ['format', 'american'],
        rgCompliant: true,
        complexity: 'basic',
      },
      {
        id: 'implied-probability',
        term: 'Implied Probability',
        category: 'odds',
        definition: 'The probability of an outcome as implied by the odds. Calculated as 1 divided by decimal odds.',
        examples: ['2.0 odds = 50% implied probability', '4.0 odds = 25% implied probability'],
        relatedTerms: ['vig', 'edge'],
        tags: ['probability', 'calculation'],
        rgCompliant: true,
        complexity: 'intermediate',
      },
      {
        id: 'vig',
        term: 'Vigorish (Vig)',
        category: 'odds',
        definition: 'The bookmaker\'s commission built into the odds, also known as the juice or margin.',
        examples: ['Standard vig of 4.76% on NFL spreads', 'Reduced vig on sharp money lines'],
        relatedTerms: ['juice', 'margin'],
        tags: ['commission', 'house-edge'],
        rgCompliant: true,
        complexity: 'advanced',
      },
      {
        id: 'fractional-odds',
        term: 'Fractional Odds',
        abbreviation: 'UK Odds',
        category: 'odds',
        definition: 'Odds format popular in the UK, shown as fractions (e.g., 5/1, 2/1). The first number shows profit, second shows stake.',
        examples: ['5/1 (win $5 for every $1 bet)', '2/1 (win $2 for every $1 bet)', '1/2 (bet $2 to win $1)'],
        relatedTerms: ['decimal-odds', 'american-odds'],
        tags: ['format', 'fractional', 'uk'],
        rgCompliant: true,
        complexity: 'basic',
      },
      {
        id: 'run-line',
        term: 'Run Line',
        abbreviation: 'RL',
        category: 'bet-types',
        definition: 'Baseball equivalent of point spread. Typically set at -1.5 for the favorite and +1.5 for the underdog.',
        examples: ['Yankees -1.5 run line', 'Dodgers +1.5 run line'],
        relatedTerms: ['spread', 'bought-points'],
        tags: ['baseball', 'spread', 'handicap'],
        rgCompliant: true,
        complexity: 'basic',
      },
      {
        id: 'prop-bet',
        term: 'Prop Bet',
        abbreviation: 'Prop',
        category: 'markets',
        definition: 'A bet on a specific event or outcome within a game, often unrelated to the final score.',
        examples: ['Coin toss winner', 'First team to score', 'Player to score first touchdown'],
        relatedTerms: ['player-props', 'game-props'],
        tags: ['proposition', 'special'],
        rgCompliant: true,
        complexity: 'basic',
      },
      {
        id: 'game-props',
        term: 'Game Props',
        category: 'markets',
        definition: 'Proposition bets related to game events rather than individual player performances.',
        examples: ['Total turnovers in game', 'First team to score 10 points', 'Will game go to overtime'],
        relatedTerms: ['prop-bet', 'player-props'],
        tags: ['proposition', 'game-events'],
        rgCompliant: true,
        complexity: 'intermediate',
      },
      {
        id: 'over',
        term: 'Over',
        abbreviation: 'O',
        category: 'bet-types',
        definition: 'Betting that the total will exceed the specified number.',
        examples: ['Over 220.5 points', 'Over 45.5 rushing yards'],
        relatedTerms: ['total', 'under'],
        tags: ['total', 'over-under'],
        rgCompliant: true,
        complexity: 'basic',
      },
      {
        id: 'under',
        term: 'Under',
        abbreviation: 'U',
        category: 'bet-types',
        definition: 'Betting that the total will be below the specified number.',
        examples: ['Under 220.5 points', 'Under 45.5 rushing yards'],
        relatedTerms: ['total', 'over'],
        tags: ['total', 'over-under'],
        rgCompliant: true,
        complexity: 'basic',
      },
      {
        id: 'favorite',
        term: 'Favorite',
        abbreviation: 'Fav',
        category: 'general',
        definition: 'The team or player expected to win, indicated by negative odds or point spread.',
        examples: ['Lakers are -200 favorites', 'The favorite in a moneyline bet'],
        relatedTerms: ['chalk', 'underdog'],
        tags: ['outcome', 'prediction'],
        rgCompliant: true,
        complexity: 'basic',
      },
      {
        id: 'underdog',
        term: 'Underdog',
        abbreviation: 'Dog',
        category: 'general',
        definition: 'The team or player expected to lose, indicated by positive odds or point spread.',
        examples: ['Chiefs are +150 underdogs', 'The underdog in a spread bet'],
        relatedTerms: ['dog', 'favorite'],
        tags: ['outcome', 'prediction'],
        rgCompliant: true,
        complexity: 'basic',
      },
      {
        id: 'longshot',
        term: 'Longshot',
        category: 'general',
        definition: 'A bet with very low probability of winning but high potential payout.',
        examples: ['+1000 longshot to win the championship', 'Betting on a major upset'],
        relatedTerms: ['underdog', 'value'],
        tags: ['high-risk', 'high-reward'],
        rgCompliant: true,
        complexity: 'intermediate',
      },
      {
        id: 'expected-value',
        term: 'Expected Value (EV)',
        abbreviation: 'EV',
        category: 'general',
        definition: 'The average amount a bettor can expect to win or lose per bet over the long term.',
        examples: ['Positive EV bet: +5% expected value', 'Calculating EV: (probability × payout) - stake'],
        relatedTerms: ['edge', 'value'],
        tags: ['calculation', 'profitability'],
        rgCompliant: true,
        complexity: 'advanced',
      },
      {
        id: 'steam',
        term: 'Steam',
        category: 'general',
        definition: 'Rapid line movement caused by sharp bettors placing large wagers.',
        examples: ['Steam move: Line moved from -3 to -5 in minutes', 'Following steam moves'],
        relatedTerms: ['sharp', 'line-movement'],
        tags: ['line-movement', 'sharp-money'],
        rgCompliant: true,
        complexity: 'advanced',
      },
      {
        id: 'reverse-line-movement',
        term: 'Reverse Line Movement',
        abbreviation: 'RLM',
        category: 'general',
        definition: 'When the betting line moves opposite to the public betting percentages, indicating sharp action.',
        examples: ['Public bets favorite but line moves toward underdog', 'Sharp money indicator'],
        relatedTerms: ['steam', 'sharp'],
        tags: ['line-movement', 'sharp-money'],
        rgCompliant: true,
        complexity: 'advanced',
      },
      {
        id: 'public-money',
        term: 'Public Money',
        category: 'general',
        definition: 'Bets placed by casual or recreational bettors, often following popular teams or trends.',
        examples: ['Public money on the Lakers', 'Fading public money'],
        relatedTerms: ['fade', 'sharp'],
        tags: ['betting-patterns', 'recreational'],
        rgCompliant: true,
        complexity: 'intermediate',
      },
      {
        id: 'cooling-off',
        term: 'Cooling-Off Period',
        category: 'rg_compliance',
        definition: 'A temporary break from gambling activities, typically 24 hours to 6 weeks.',
        examples: ['24-hour cooling-off period', 'Taking a break from betting'],
        relatedTerms: ['self-exclusion', 'responsible-gaming'],
        tags: ['safety', 'temporary', 'break'],
        rgCompliant: true,
        complexity: 'basic',
      },
      {
        id: 'spending-limits',
        term: 'Spending Limits',
        category: 'rg_compliance',
        definition: 'Maximum amounts that can be wagered within specified time periods.',
        examples: ['Daily spending limit of $200', 'Weekly wagering limit of $1000'],
        relatedTerms: ['deposit-limits', 'responsible-gaming'],
        tags: ['safety', 'limits', 'financial'],
        rgCompliant: true,
        complexity: 'basic',
      },
      {
        id: 'time-limits',
        term: 'Time Limits',
        category: 'rg_compliance',
        definition: 'Maximum time allowed for gambling sessions before automatic breaks.',
        examples: ['2-hour session time limit', 'Daily time limit of 4 hours'],
        relatedTerms: ['reality-check', 'responsible-gaming'],
        tags: ['safety', 'time', 'session'],
        rgCompliant: true,
        complexity: 'basic',
      },

      // General Terms
      {
        id: 'cover',
        term: 'Cover',
        category: 'general',
        definition: 'When a bet wins. A team/player covers the spread or beats the total.',
        examples: ['The Lakers covered the -5.5 spread', 'The over covered with 225 points'],
        relatedTerms: ['push', 'beat'],
        tags: ['outcome', 'win'],
        rgCompliant: true,
        complexity: 'basic',
      },
      {
        id: 'push',
        term: 'Push',
        category: 'general',
        definition: 'When a bet results in a tie and all money is refunded. No winner or loser.',
        examples: ['Game ends exactly on the total', 'Spread bet where favorite wins by exactly the spread'],
        relatedTerms: ['cover', 'refund'],
        tags: ['outcome', 'tie'],
        rgCompliant: true,
        complexity: 'basic',
      },
      {
        id: 'bankroll',
        term: 'Bankroll',
        category: 'general',
        definition: 'The total amount of money dedicated to betting activities.',
        examples: ['$1000 bankroll for NFL season', 'Managing bankroll with 1% per bet rule'],
        relatedTerms: ['unit', 'stake'],
        tags: ['money', 'management'],
        rgCompliant: true,
        complexity: 'basic',
      },
      {
        id: 'unit',
        term: 'Unit',
        category: 'general',
        definition: 'A standardized bet size used for record keeping and bankroll management.',
        examples: ['1 unit = $100', 'Betting 2 units on a strong favorite'],
        relatedTerms: ['bankroll', 'stake'],
        tags: ['size', 'standardization'],
        rgCompliant: true,
        complexity: 'basic',
      },
      {
        id: 'juice',
        term: 'Juice',
        category: 'general',
        definition: 'The bookmaker\'s commission or vig built into the betting odds.',
        examples: ['-110 juice on NFL spreads', 'Reduced juice on moneyline bets'],
        relatedTerms: ['vig', 'commission'],
        tags: ['commission', 'house-edge'],
        rgCompliant: true,
        complexity: 'intermediate',
      },
      {
        id: 'edge',
        term: 'Edge',
        category: 'general',
        definition: 'The advantage a bettor has over the bookmaker, usually expressed as a percentage.',
        examples: ['5% edge on NBA spreads', 'Finding value where implied probability is wrong'],
        relatedTerms: ['value', 'expected-value'],
        tags: ['advantage', 'profitability'],
        rgCompliant: true,
        complexity: 'advanced',
      },
      {
        id: 'value',
        term: 'Value',
        category: 'general',
        definition: 'When a bet offers better odds than the true probability suggests.',
        examples: ['+150 underdog with 40% chance = value bet', 'Finding bets where you have an edge'],
        relatedTerms: ['edge', 'expected-value'],
        tags: ['opportunity', 'profit'],
        rgCompliant: true,
        complexity: 'intermediate',
      },
      {
        id: 'hedge',
        term: 'Hedge',
        category: 'general',
        definition: 'Placing an additional bet to reduce risk on an existing wager.',
        examples: ['Hedging a moneyline bet with a spread bet', 'Reducing potential losses'],
        relatedTerms: ['insurance', 'risk-management'],
        tags: ['risk', 'protection'],
        rgCompliant: true,
        complexity: 'intermediate',
      },
      {
        id: 'arbitrage',
        term: 'Arbitrage',
        category: 'general',
        definition: 'Exploiting different odds from multiple bookmakers to guarantee a profit.',
        examples: ['Same game at +150 on one site, -140 on another', 'Risk-free profit opportunity'],
        relatedTerms: ['sure-thing', 'guaranteed-profit'],
        tags: ['profit', 'guarantee'],
        rgCompliant: true,
        complexity: 'advanced',
      },
      {
        id: 'fade',
        term: 'Fade',
        category: 'general',
        definition: 'Betting against a team/player that is heavily favored by the public.',
        examples: ['Fading the Lakers when they\'re heavy favorites', 'Going against public sentiment'],
        relatedTerms: ['contrarian', 'public-money'],
        tags: ['strategy', 'contrarian'],
        rgCompliant: true,
        complexity: 'intermediate',
      },
      {
        id: 'chalk',
        term: 'Chalk',
        category: 'general',
        definition: 'A heavy favorite or highly likely outcome.',
        examples: ['The Lakers are chalk at -8.5', 'Moneyline favorite is the chalk'],
        relatedTerms: ['favorite', 'heavy-underdog'],
        tags: ['favorite', 'predictable'],
        rgCompliant: true,
        complexity: 'basic',
      },
      {
        id: 'dog',
        term: 'Dog',
        category: 'general',
        definition: 'An underdog or less favored team/player.',
        examples: ['Chiefs are 7-point dogs', 'The underdog in a moneyline bet'],
        relatedTerms: ['underdog', 'longshot'],
        tags: ['underdog', 'value'],
        rgCompliant: true,
        complexity: 'basic',
      },
      {
        id: 'sharp',
        term: 'Sharp',
        category: 'general',
        definition: 'A sophisticated bettor who consistently beats the bookmaker.',
        examples: ['Sharp money moving the line', 'Professional bettors vs recreational'],
        relatedTerms: ['wiseguy', 'professional'],
        tags: ['expert', 'professional'],
        rgCompliant: true,
        complexity: 'intermediate',
      },

      // RG Compliance Terms
      {
        id: 'responsible-gaming',
        term: 'Responsible Gaming',
        abbreviation: 'RG',
        category: 'rg_compliance',
        definition: 'Practices and policies designed to prevent problem gambling and promote safe betting habits.',
        examples: ['Self-exclusion programs', 'Deposit limits', 'Reality checks during play'],
        relatedTerms: ['self-exclusion', 'deposit-limits'],
        tags: ['safety', 'compliance', 'regulation'],
        rgCompliant: true,
        complexity: 'basic',
      },
      {
        id: 'self-exclusion',
        term: 'Self-Exclusion',
        category: 'rg_compliance',
        definition: 'Voluntary ban from gambling activities for a specified period or permanently.',
        examples: ['6-month self-exclusion', 'Permanent self-exclusion from all sports betting'],
        relatedTerms: ['responsible-gaming', 'cooling-off'],
        tags: ['safety', 'voluntary', 'ban'],
        rgCompliant: true,
        complexity: 'basic',
      },
      {
        id: 'deposit-limits',
        term: 'Deposit Limits',
        category: 'rg_compliance',
        definition: 'Maximum amounts that can be deposited into a gambling account within specified time periods.',
        examples: ['Daily deposit limit of $500', 'Weekly deposit limit of $2000'],
        relatedTerms: ['responsible-gaming', 'spending-limits'],
        tags: ['safety', 'limits', 'financial'],
        rgCompliant: true,
        complexity: 'basic',
      },
      {
        id: 'reality-check',
        term: 'Reality Check',
        category: 'rg_compliance',
        definition: 'Automatic reminders during gambling sessions showing time spent and money wagered.',
        examples: ['Reality check every 30 minutes', 'Session time and loss limit notifications'],
        relatedTerms: ['responsible-gaming', 'time-limits'],
        tags: ['safety', 'awareness', 'reminders'],
        rgCompliant: true,
        complexity: 'basic',
      },
      {
        id: 'gambling-addiction',
        term: 'Problem Gambling',
        category: 'rg_compliance',
        definition: 'Gambling behavior that causes negative consequences and loss of control.',
        examples: ['Chasing losses', 'Betting more than can afford', 'Neglecting responsibilities'],
        relatedTerms: ['responsible-gaming', 'help-resources'],
        tags: ['health', 'addiction', 'warning'],
        rgCompliant: true,
        complexity: 'intermediate',
      },
    ];

    // Initialize the data structures
    for (const term of glossaryData) {
      this.terms.set(term.id, term);

      if (!this.termsByCategory.has(term.category)) {
        this.termsByCategory.set(term.category, []);
      }
      this.termsByCategory.get(term.category)!.push(term);
      
      // Build search index for faster lookups
      this.indexTerm(term);
    }
  }

  /**
   * Index a term for fast search lookups
   */
  private indexTerm(term: GlossaryTerm): void {
    const words = [
      term.term.toLowerCase(),
      term.abbreviation?.toLowerCase(),
      ...(term.synonyms || []).map(s => s.toLowerCase()),
      ...(term.tags || []).map(t => t.toLowerCase()),
    ].filter(Boolean) as string[];

    for (const word of words) {
      const normalized = word.toLowerCase().trim();
      if (!this.searchIndex.has(normalized)) {
        this.searchIndex.set(normalized, new Set());
      }
      this.searchIndex.get(normalized)!.add(term.id);
    }
  }

  getTerm(termId: string): GlossaryTerm | null {
    return this.terms.get(termId) || null;
  }

  /**
   * Enhanced search with relevance ranking
   * Returns results sorted by relevance score (highest first)
   */
  search(query: string): GlossaryTerm[] {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchTerm = query.toLowerCase().trim();
    const searchWords = searchTerm.split(/\s+/).filter(w => w.length > 0);
    const results: SearchResult[] = [];
    const seenIds = new Set<string>();

    for (const term of this.terms.values()) {
      let score = 0;
      let matchType: SearchResult['matchType'] = 'example';

      const termLower = term.term.toLowerCase();
      const abbrevLower = term.abbreviation?.toLowerCase() || '';
      const definitionLower = term.definition.toLowerCase();
      const synonymsLower = (term.synonyms || []).map(s => s.toLowerCase());
      const tagsLower = (term.tags || []).map(t => t.toLowerCase());

      // Exact match on term name (highest score)
      if (termLower === searchTerm) {
        score += 100;
        matchType = 'exact';
      } else if (termLower.includes(searchTerm)) {
        score += 50;
        matchType = 'term';
      }

      // Exact match on abbreviation
      if (abbrevLower === searchTerm) {
        score += 80;
        matchType = 'abbreviation';
      } else if (abbrevLower.includes(searchTerm)) {
        score += 40;
        matchType = 'abbreviation';
      }

      // Synonym matches
      for (const synonym of synonymsLower) {
        if (synonym === searchTerm) {
          score += 70;
        } else if (synonym.includes(searchTerm)) {
          score += 35;
        }
      }

      // Word-by-word matching (for multi-word queries)
      if (searchWords.length > 1) {
        let wordMatches = 0;
        for (const word of searchWords) {
          if (termLower.includes(word)) wordMatches++;
          if (definitionLower.includes(word)) wordMatches++;
          if (tagsLower.some(t => t.includes(word))) wordMatches++;
        }
        score += wordMatches * 10;
      }

      // Definition match
      if (definitionLower.includes(searchTerm)) {
        score += 20;
        if (matchType === 'example') matchType = 'definition';
      }

      // Tag match
      if (tagsLower.some(tag => tag.includes(searchTerm))) {
        score += 15;
        if (matchType === 'example') matchType = 'tag';
      }

      // Example match (lowest priority)
      if (term.examples && term.examples.some(example => example.toLowerCase().includes(searchTerm))) {
        score += 5;
      }

      // Boost score for basic complexity (more commonly searched)
      if (term.complexity === 'basic') {
        score += 2;
      }

      if (score > 0 && !seenIds.has(term.id)) {
        results.push({ term, score, matchType });
        seenIds.add(term.id);
      }
    }

    // Sort by score (descending) and return terms
    return results
      .sort((a, b) => b.score - a.score)
      .map(r => r.term);
  }

  /**
   * Get search suggestions for autocomplete
   * Returns up to 10 suggestions matching the query prefix
   */
  getSuggestions(query: string, limit: number = 10): string[] {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = query.toLowerCase().trim();
    const suggestions = new Set<string>();

    for (const term of this.terms.values()) {
      // Check term name
      if (term.term.toLowerCase().startsWith(searchTerm)) {
        suggestions.add(term.term);
        if (suggestions.size >= limit) break;
      }

      // Check abbreviation
      if (term.abbreviation && term.abbreviation.toLowerCase().startsWith(searchTerm)) {
        suggestions.add(term.abbreviation);
        if (suggestions.size >= limit) break;
      }

      // Check synonyms
      if (term.synonyms) {
        for (const synonym of term.synonyms) {
          if (synonym.toLowerCase().startsWith(searchTerm)) {
            suggestions.add(synonym);
            if (suggestions.size >= limit) break;
          }
        }
      }
    }

    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * Get related terms for a given term ID
   * Returns terms connected via relatedTerms, seeAlso, or same category
   */
  getRelatedTerms(termId: string, limit: number = 5): GlossaryTerm[] {
    const term = this.getTerm(termId);
    if (!term) return [];

    const relatedIds = new Set<string>();
    const results: GlossaryTerm[] = [];

    // Add explicitly related terms
    if (term.relatedTerms) {
      for (const relatedId of term.relatedTerms) {
        relatedIds.add(relatedId);
      }
    }

    // Add seeAlso terms
    if (term.seeAlso) {
      for (const seeAlsoId of term.seeAlso) {
        relatedIds.add(seeAlsoId);
      }
    }

    // Add terms from same category (excluding self)
    const categoryTerms = this.getCategory(term.category);
    for (const categoryTerm of categoryTerms) {
      if (categoryTerm.id !== termId && !relatedIds.has(categoryTerm.id)) {
        relatedIds.add(categoryTerm.id);
      }
    }

    // Fetch and return related terms
    for (const id of relatedIds) {
      const relatedTerm = this.getTerm(id);
      if (relatedTerm) {
        results.push(relatedTerm);
        if (results.length >= limit) break;
      }
    }

    return results;
  }

  searchTerms(query: string): GlossaryTerm[] {
    return this.search(query);
  }

  getAllTerms(): GlossaryTerm[] {
    return Array.from(this.terms.values());
  }

  getCategory(category: TermCategory): GlossaryTerm[] {
    return this.termsByCategory.get(category) || [];
  }

  getTermsByCategory(category: TermCategory): GlossaryTerm[] {
    return this.getCategory(category);
  }

  getBetTypes(): GlossaryTerm[] {
    return this.getCategory('bet-types');
  }

  getCategories(): TermCategory[] {
    return Array.from(this.termsByCategory.keys());
  }

  getCategoryStats(): Record<TermCategory, number> {
    const stats: Record<string, number> = {};
    for (const [category, terms] of this.termsByCategory.entries()) {
      stats[category] = terms.length;
    }
    return stats as Record<TermCategory, number>;
  }
}

export function getGlossary(): {
  getTerm: (termId: string) => GlossaryTerm | null;
  search: (query: string) => GlossaryTerm[];
  getSuggestions: (query: string, limit?: number) => string[];
  getRelatedTerms: (termId: string, limit?: number) => GlossaryTerm[];
  getCategory: (category: string) => GlossaryTerm[];
  getAllTerms: () => GlossaryTerm[];
  getCategories: () => TermCategory[];
  getCategoryStats: () => Record<TermCategory, number>;
} {
  const registry = BettingGlossaryRegistry.getInstance();

  return {
    getTerm: (termId: string) => registry.getTerm(termId),
    search: (query: string) => registry.search(query),
    getSuggestions: (query: string, limit?: number) => registry.getSuggestions(query, limit),
    getRelatedTerms: (termId: string, limit?: number) => registry.getRelatedTerms(termId, limit),
    getCategory: (category: string) => registry.getCategory(category as TermCategory),
    getAllTerms: () => registry.getAllTerms(),
    getCategories: () => registry.getCategories(),
    getCategoryStats: () => registry.getCategoryStats(),
  };
}
