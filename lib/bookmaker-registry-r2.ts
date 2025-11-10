/**
 * Bookmaker Registry R2 - Stub Implementation
 * 
 * Minimal stub to allow dev-server.ts to compile.
 * TODO: Implement full R2 registry
 */

export class BookmakerRegistryR2 {
  constructor(options?: any) {
    // Stub constructor
  }
  
  create(data: any): Promise<any> {
    return Promise.resolve(data);
  }
  
  findById(id: string): Promise<any> {
    return Promise.resolve(null);
  }
  
  getR2RegistryUrls(): { profiles: string[]; manifests: string[] } {
    return { profiles: [], manifests: [] };
  }
  
  getRegistrySummary(): any {
    return {};
  }
  
  close(): void {
    // Stub - no-op
  }
}

export function getRegistry(): any {
  return {
    create: async (data: any) => data,
    findById: async (id: string) => null,
  };
}

