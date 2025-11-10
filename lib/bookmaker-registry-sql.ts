/**
 * Bookmaker Registry SQL - Stub Implementation
 * 
 * Minimal stub to allow dev-server.ts to compile.
 * TODO: Implement full SQL registry
 */

export class BookmakerRegistrySQL {
  constructor(dbPath: string) {
    // Stub constructor
  }
  
  upsertProfile(id: string, tier: string, config: any): void {
    // Stub implementation
  }
  
  getProfile(id: string): any {
    return null;
  }
  
  getAllProfiles(): any[] {
    return [];
  }
  
  getBookmakersByTier(tier: string): any[] {
    return [];
  }
  
  getRGIndexSkeleton(bookieId?: string): any {
    return {};
  }
  
  getManifests(bookieId?: string): any[] {
    return [];
  }
  
  close(): void {
    // Stub - no-op
  }
}

export function getRegistry(): any {
  return {
    create: async (data: any) => data,
    findById: async (id: string) => null,
    findAll: async () => [],
  };
}

