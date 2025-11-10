/**
 * Combined Registry - Stub Implementation
 * 
 * Minimal stub to allow dev-server.ts to compile.
 * TODO: Implement full combined registry
 */

export function getAllBookmakers(): string[] {
  return [];
}

export function getTotalBookmakerCount(): number {
  return 0;
}

export function getRegistry(): any {
  return {
    create: async (data: any) => data,
    findById: async (id: string) => null,
  };
}

