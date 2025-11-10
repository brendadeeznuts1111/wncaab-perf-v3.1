/**
 * Feature Flags - Stub Implementation
 * 
 * Minimal stub to allow dev-server.ts to compile.
 * TODO: Implement full feature flags
 */

export function getFeatureFlags(): any {
  return {
    isEnabled: (flag: string) => false,
    getValue: (flag: string) => null,
  };
}

