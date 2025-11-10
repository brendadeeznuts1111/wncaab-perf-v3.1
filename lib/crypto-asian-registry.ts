/**
 * Crypto Asian Registry - Stub Implementation
 * 
 * Minimal stub to allow dev-server.ts to compile.
 * TODO: Implement full crypto registry
 */

export const MONSTER_ASIAN_CONFIG: Record<string, any> = {};

export function getRegistry(): any {
  return {
    create: async (data: any) => data,
    findById: async (id: string) => null,
  };
}

