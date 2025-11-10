/**
 * Betting Glossary - Stub Implementation
 * 
 * Minimal stub to allow dev-server.ts to compile.
 * TODO: Implement full betting glossary
 */

export type TermCategory = 'bet-types' | 'markets' | 'odds' | 'general';

// Export TermCategory as a value for runtime use
export const TermCategory = {
  BET_TYPES: 'bet-types' as const,
  MARKETS: 'markets' as const,
  ODDS: 'odds' as const,
  GENERAL: 'general' as const,
  'bet-types': 'bet-types' as const,
  'markets': 'markets' as const,
  'odds': 'odds' as const,
  'general': 'general' as const,
};

export class BettingGlossaryRegistry {
  private static instance: BettingGlossaryRegistry;
  
  static getInstance(): BettingGlossaryRegistry {
    if (!BettingGlossaryRegistry.instance) {
      BettingGlossaryRegistry.instance = new BettingGlossaryRegistry();
    }
    return BettingGlossaryRegistry.instance;
  }
  
  getTerm(termId: string): any {
    return null;
  }
  
  search(query: string): any[] {
    return [];
  }
  
  searchTerms(query: string): any[] {
    return [];
  }
  
  getAllTerms(): any[] {
    return [];
  }
  
  getCategory(category: TermCategory): any[] {
    return [];
  }
  
  getTermsByCategory(category: TermCategory): any[] {
    return [];
  }
  
  getBetTypes(): any[] {
    return [];
  }
}

export function getGlossary(): any {
  return {
    getTerm: async (termId: string) => null,
    search: async (query: string) => [],
    getCategory: async (category: string) => [],
  };
}

