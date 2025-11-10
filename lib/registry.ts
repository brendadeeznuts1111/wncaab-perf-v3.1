/**
 * Registry - Stub Implementation
 * 
 * Minimal stub to allow dev-server.ts to compile.
 * TODO: Implement full registry functionality
 */

export function getRegistry(): any {
  return {
    create: async (data: any) => data,
    findById: async (id: string) => null,
    findAll: async () => [],
    update: async (id: string, data: any) => data,
    delete: async (id: string) => true,
  };
}

