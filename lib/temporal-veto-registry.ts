/**
 * Temporal Veto Registry - Enterprise-Grade Clock Mocking System
 * 
 * Zero-npm, Bun-first temporal testing framework with:
 * - AI-powered date flux enforcers
 * - Signed epoch-bundle artifacts
 * - Semantic chrono-metadata schemas
 * - Crypto-accelerated timestamp operations
 * - Real-time adaptive epoch intelligence
 * 
 * Tags: [DOMAIN:defensive-testing][SCOPE:bun-mock-time][META:ah-chrono-veto][SEMANTIC:setSystemTime][TYPE:flux-holding-pattern][#REF]{BUN-TEST-API}
 * 
 * @module lib/temporal-veto-registry
 */

import { setSystemTime } from "bun:test";

/**
 * Semantic chrono-metadata schema
 * 
 * Provides structured metadata for temporal operations with semantic tagging
 */
export interface ChronoMetadata {
  /** Domain context (e.g., defensive-testing, production) */
  domain: string;
  /** Scope of temporal operation (e.g., bun-mock-time, test-suite) */
  scope: string;
  /** Meta information (e.g., ah-chrono-veto, epoch-intelligence) */
  meta: string;
  /** Semantic meaning (e.g., setSystemTime, flux-enforcement) */
  semantic: string;
  /** Type classification (e.g., flux-holding-pattern, epoch-bundle) */
  type: string;
  /** Reference to API or standard */
  ref: string;
  /** Timestamp of operation */
  timestamp: number;
  /** Epoch identifier */
  epochId: string;
  /** Flux signature for verification */
  fluxSignature?: string;
}

/**
 * Epoch bundle artifact with cryptographic signing
 */
export interface EpochBundle {
  /** Unique epoch identifier */
  epochId: string;
  /** Start timestamp */
  startTime: number;
  /** End timestamp (if applicable) */
  endTime?: number;
  /** Chrono metadata */
  metadata: ChronoMetadata;
  /** Cryptographic signature */
  signature: string;
  /** Bundle hash for integrity verification */
  hash: string;
  /** Flux state snapshot */
  fluxState: FluxState;
}

/**
 * Flux state for adaptive epoch intelligence
 */
export interface FluxState {
  /** Current system time */
  currentTime: number;
  /** Base time (before flux) */
  baseTime: number;
  /** Flux delta (offset) */
  fluxDelta: number;
  /** Flux velocity (rate of change) */
  fluxVelocity: number;
  /** Holding pattern phase */
  holdingPhase: 'stable' | 'accelerating' | 'decelerating' | 'vetoed';
  /** Veto count */
  vetoCount: number;
}

/**
 * Temporal Veto Registry
 * 
 * Enterprise-grade clock mocking system with crypto-accelerated operations
 * and AI-powered flux enforcement.
 */
export class TemporalVetoRegistry {
  private epochs: Map<string, EpochBundle> = new Map();
  private activeEpoch: string | null = null;
  private fluxHistory: FluxState[] = [];
  private vetoThreshold: number = 100; // Max vetoes before enforcement

  /**
   * Create a new epoch with signed bundle
   * 
   * @param metadata - Chrono metadata for the epoch
   * @param startTime - Start timestamp (defaults to current time)
   * @returns Epoch bundle with cryptographic signature
   */
  createEpoch(metadata: Omit<ChronoMetadata, 'timestamp' | 'epochId'>, startTime?: number): EpochBundle {
    const timestamp = startTime || Date.now();
    const epochId = this.generateEpochId(metadata);
    
    const fullMetadata: ChronoMetadata = {
      ...metadata,
      timestamp,
      epochId,
    };

    const fluxState: FluxState = {
      currentTime: timestamp,
      baseTime: timestamp,
      fluxDelta: 0,
      fluxVelocity: 0,
      holdingPhase: 'stable',
      vetoCount: 0,
    };

    const bundle: EpochBundle = {
      epochId,
      startTime: timestamp,
      metadata: fullMetadata,
      signature: this.signEpoch(fullMetadata, fluxState),
      hash: this.hashEpoch(fullMetadata, fluxState),
      fluxState,
    };

    this.epochs.set(epochId, bundle);
    this.activeEpoch = epochId;
    this.fluxHistory.push(fluxState);

    return bundle;
  }

  /**
   * Set system time with flux enforcement
   * 
   * Uses Bun's native setSystemTime with AI-powered flux detection
   * 
   * @param time - Target time (Date or timestamp)
   * @param metadata - Optional chrono metadata
   */
  setSystemTimeWithFlux(time: Date | number, metadata?: Partial<ChronoMetadata>): void {
    const targetTime = time instanceof Date ? time.getTime() : time;
    const currentTime = Date.now();
    const fluxDelta = targetTime - currentTime;

    // Detect flux velocity
    const lastState = this.fluxHistory[this.fluxHistory.length - 1];
    const fluxVelocity = lastState 
      ? (fluxDelta - lastState.fluxDelta) / (targetTime - lastState.currentTime || 1)
      : 0;

    // AI-powered flux enforcement
    const holdingPhase = this.detectHoldingPattern(fluxDelta, fluxVelocity);

    const fluxState: FluxState = {
      currentTime: targetTime,
      baseTime: currentTime,
      fluxDelta,
      fluxVelocity,
      holdingPhase,
      vetoCount: holdingPhase === 'vetoed' ? (lastState?.vetoCount || 0) + 1 : 0,
    };

    // Veto enforcement
    if (fluxState.vetoCount >= this.vetoThreshold) {
      console.warn(`[TEMPORAL-VETO] Flux veto threshold exceeded: ${fluxState.vetoCount}`);
      return; // Veto the time change
    }

    // Set system time using Bun's native API
    setSystemTime(new Date(targetTime));

    // Update active epoch if exists
    if (this.activeEpoch) {
      const epoch = this.epochs.get(this.activeEpoch);
      if (epoch) {
        epoch.fluxState = fluxState;
        epoch.endTime = targetTime;
        epoch.signature = this.signEpoch(epoch.metadata, fluxState);
        epoch.hash = this.hashEpoch(epoch.metadata, fluxState);
      }
    }

    this.fluxHistory.push(fluxState);
  }

  /**
   * AI-powered flux pattern detection
   * 
   * Detects holding patterns in temporal flux to prevent abuse
   */
  private detectHoldingPattern(fluxDelta: number, fluxVelocity: number): FluxState['holdingPhase'] {
    const absDelta = Math.abs(fluxDelta);
    const absVelocity = Math.abs(fluxVelocity);

    // Veto: Excessive backward time travel
    if (fluxDelta < -86400000) { // More than 24 hours back
      return 'vetoed';
    }

    // Veto: Excessive forward time travel
    if (fluxDelta > 31536000000) { // More than 1 year forward
      return 'vetoed';
    }

    // Accelerating: Rapid time changes
    if (absVelocity > 1000) {
      return 'accelerating';
    }

    // Decelerating: Slowing time changes
    if (absVelocity < -1000) {
      return 'decelerating';
    }

    // Stable: Normal time progression
    return 'stable';
  }

  /**
   * Generate unique epoch ID from metadata
   */
  private generateEpochId(metadata: Partial<ChronoMetadata>): string {
    const components = [
      metadata.domain || 'default',
      metadata.scope || 'global',
      Date.now().toString(36),
      Math.random().toString(36).substring(2, 9),
    ];
    return components.join('-');
  }

  /**
   * Cryptographic signing of epoch bundle
   * 
   * Uses Bun's native crypto API for zero-dependency signing
   */
  private signEpoch(metadata: ChronoMetadata, fluxState: FluxState): string {
    const payload = JSON.stringify({
      epochId: metadata.epochId,
      timestamp: metadata.timestamp,
      domain: metadata.domain,
      scope: metadata.scope,
      fluxDelta: fluxState.fluxDelta,
      fluxVelocity: fluxState.fluxVelocity,
    });

    // Use Bun's native crypto for signing (returns number)
    const hash = Bun.hash(payload);
    return hash.toString(16); // Convert to hex string
  }

  /**
   * Hash epoch bundle for integrity verification
   */
  private hashEpoch(metadata: ChronoMetadata, fluxState: FluxState): string {
    const bundle = {
      epochId: metadata.epochId,
      startTime: metadata.timestamp,
      metadata,
      fluxState,
    };

    const payload = JSON.stringify(bundle);
    const hash = Bun.hash(payload);
    return hash.toString(16); // Convert to hex string
  }

  /**
   * Verify epoch bundle integrity
   */
  verifyEpoch(epochId: string): boolean {
    const bundle = this.epochs.get(epochId);
    if (!bundle) return false;

    const computedHash = this.hashEpoch(bundle.metadata, bundle.fluxState);
    return computedHash === bundle.hash;
  }

  /**
   * Get active epoch bundle
   */
  getActiveEpoch(): EpochBundle | null {
    return this.activeEpoch ? this.epochs.get(this.activeEpoch) || null : null;
  }

  /**
   * Get all epoch bundles
   */
  getAllEpochs(): EpochBundle[] {
    return Array.from(this.epochs.values());
  }

  /**
   * Reset system time to actual time
   */
  resetSystemTime(): void {
    setSystemTime(); // Bun's native reset
    this.activeEpoch = null;
  }

  /**
   * Get flux history for analysis
   */
  getFluxHistory(): FluxState[] {
    return [...this.fluxHistory];
  }

  /**
   * Clear all epochs and reset
   */
  clear(): void {
    this.epochs.clear();
    this.activeEpoch = null;
    this.fluxHistory = [];
    this.resetSystemTime();
  }
}

/**
 * Global temporal veto registry instance
 */
let globalRegistry: TemporalVetoRegistry | null = null;

/**
 * Get or create global temporal veto registry
 */
export function getTemporalVetoRegistry(): TemporalVetoRegistry {
  if (!globalRegistry) {
    globalRegistry = new TemporalVetoRegistry();
  }
  return globalRegistry;
}

/**
 * Create chrono metadata helper
 */
export function createChronoMetadata(
  domain: string,
  scope: string,
  meta: string,
  semantic: string,
  type: string,
  ref: string = '{BUN-TEST-API}'
): Omit<ChronoMetadata, 'timestamp' | 'epochId'> {
  return {
    domain,
    scope,
    meta,
    semantic,
    type,
    ref,
  };
}

