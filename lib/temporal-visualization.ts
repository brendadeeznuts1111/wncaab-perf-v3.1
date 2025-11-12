/**
 * Temporal Lifecycle Visualizations
 * 
 * Dark-mode-first lifecycle visualizations for temporal testing
 * 
 * Tags: [DOMAIN:defensive-testing][SCOPE:bun-mock-time][META:visualization][SEMANTIC:lifecycle-viz][TYPE:dark-mode-ui][#REF]{BUN-VIZ}
 */

import type { EpochBundle, FluxState } from './temporal-veto-registry.ts';
import type { TemporalRegistryConfig } from './temporal-config.ts';

/**
 * Lifecycle visualization data
 */
export interface LifecycleVisualization {
  /** Epoch timeline */
  epochs: EpochTimeline[];
  /** Flux state transitions */
  fluxTransitions: FluxTransition[];
  /** Veto events */
  vetoEvents: VetoEvent[];
  /** Performance metrics */
  metrics: VisualizationMetrics;
}

/**
 * Epoch timeline entry
 */
export interface EpochTimeline {
  epochId: string;
  startTime: number;
  endTime?: number;
  duration: number;
  metadata: {
    domain: string;
    scope: string;
    type: string;
  };
  fluxState: FluxState;
}

/**
 * Flux transition
 */
export interface FluxTransition {
  from: FluxState['holdingPhase'];
  to: FluxState['holdingPhase'];
  timestamp: number;
  fluxDelta: number;
  fluxVelocity: number;
}

/**
 * Veto event
 */
export interface VetoEvent {
  timestamp: number;
  reason: string;
  fluxDelta: number;
  epochId?: string;
}

/**
 * Visualization metrics
 */
export interface VisualizationMetrics {
  totalEpochs: number;
  totalVetoes: number;
  averageFluxDelta: number;
  maxFluxDelta: number;
  minFluxDelta: number;
  fluxVelocityRange: { min: number; max: number };
}

/**
 * Generate lifecycle visualization
 */
export function generateLifecycleVisualization(
  epochs: EpochBundle[],
  fluxHistory: FluxState[]
): LifecycleVisualization {
  const epochTimeline: EpochTimeline[] = epochs.map(epoch => ({
    epochId: epoch.epochId,
    startTime: epoch.startTime,
    endTime: epoch.endTime,
    duration: (epoch.endTime || Date.now()) - epoch.startTime,
    metadata: {
      domain: epoch.metadata.domain,
      scope: epoch.metadata.scope,
      type: epoch.metadata.type,
    },
    fluxState: epoch.fluxState,
  }));

  const fluxTransitions: FluxTransition[] = [];
  for (let i = 1; i < fluxHistory.length; i++) {
    const prev = fluxHistory[i - 1];
    const curr = fluxHistory[i];
    
    if (prev.holdingPhase !== curr.holdingPhase) {
      fluxTransitions.push({
        from: prev.holdingPhase,
        to: curr.holdingPhase,
        timestamp: curr.currentTime,
        fluxDelta: curr.fluxDelta,
        fluxVelocity: curr.fluxVelocity,
      });
    }
  }

  const vetoEvents: VetoEvent[] = fluxHistory
    .filter(state => state.holdingPhase === 'vetoed')
    .map(state => ({
      timestamp: state.currentTime,
      reason: `Flux veto threshold exceeded (${state.vetoCount})`,
      fluxDelta: state.fluxDelta,
    }));

  const fluxDeltas = fluxHistory.map(s => s.fluxDelta);
  const fluxVelocities = fluxHistory.map(s => s.fluxVelocity);

  const metrics: VisualizationMetrics = {
    totalEpochs: epochs.length,
    totalVetoes: vetoEvents.length,
    averageFluxDelta: fluxDeltas.length > 0 ? fluxDeltas.reduce((a, b) => a + b, 0) / fluxDeltas.length : 0,
    maxFluxDelta: fluxDeltas.length > 0 ? Math.max(...fluxDeltas) : 0,
    minFluxDelta: fluxDeltas.length > 0 ? Math.min(...fluxDeltas) : 0,
    fluxVelocityRange: {
      min: fluxVelocities.length > 0 ? Math.min(...fluxVelocities) : 0,
      max: fluxVelocities.length > 0 ? Math.max(...fluxVelocities) : 0,
    },
  };

  return {
    epochs: epochTimeline,
    fluxTransitions,
    vetoEvents,
    metrics,
  };
}

/**
 * Generate dark-mode HTML visualization
 */
export function generateDarkModeVisualization(viz: LifecycleVisualization, config: TemporalRegistryConfig): string {
  const darkMode = config.enableDarkMode;
  const bgColor = darkMode ? '#1a1a1a' : '#ffffff';
  const textColor = darkMode ? '#e0e0e0' : '#000000';
  const accentColor = darkMode ? '#4a9eff' : '#0066cc';
  const vetoColor = '#ff4444';
  const stableColor = '#44ff44';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Temporal Veto Registry - Lifecycle Visualization</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
      background: ${bgColor};
      color: ${textColor};
      padding: 2rem;
      line-height: 1.6;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { color: ${accentColor}; margin-bottom: 2rem; }
    h2 { color: ${accentColor}; margin-top: 2rem; margin-bottom: 1rem; }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .metric-card {
      background: ${darkMode ? '#2a2a2a' : '#f5f5f5'};
      padding: 1rem;
      border-radius: 8px;
      border-left: 4px solid ${accentColor};
    }
    .metric-label { font-size: 0.875rem; opacity: 0.7; }
    .metric-value { font-size: 1.5rem; font-weight: bold; color: ${accentColor}; }
    .epoch-timeline {
      margin-top: 2rem;
    }
    .epoch-item {
      background: ${darkMode ? '#2a2a2a' : '#f5f5f5'};
      padding: 1rem;
      margin-bottom: 1rem;
      border-radius: 8px;
      border-left: 4px solid ${accentColor};
    }
    .epoch-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .epoch-id { font-weight: bold; color: ${accentColor}; }
    .epoch-duration { font-size: 0.875rem; opacity: 0.7; }
    .flux-state {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
    .flux-stable { background: ${stableColor}33; color: ${stableColor}; }
    .flux-accelerating { background: #ffaa0033; color: #ffaa00; }
    .flux-decelerating { background: #ff660033; color: #ff6600; }
    .flux-vetoed { background: ${vetoColor}33; color: ${vetoColor}; }
    .veto-events {
      margin-top: 2rem;
    }
    .veto-item {
      background: ${vetoColor}33;
      padding: 1rem;
      margin-bottom: 0.5rem;
      border-radius: 8px;
      border-left: 4px solid ${vetoColor};
    }
    .timestamp { font-family: monospace; opacity: 0.7; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🕐 Temporal Veto Registry - Lifecycle Visualization</h1>
    
    <div class="metrics">
      <div class="metric-card">
        <div class="metric-label">Total Epochs</div>
        <div class="metric-value">${viz.metrics.totalEpochs}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Total Vetoes</div>
        <div class="metric-value" style="color: ${vetoColor}">${viz.metrics.totalVetoes}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Avg Flux Delta</div>
        <div class="metric-value">${viz.metrics.averageFluxDelta.toFixed(2)}ms</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Flux Range</div>
        <div class="metric-value">${viz.metrics.minFluxDelta.toFixed(0)} - ${viz.metrics.maxFluxDelta.toFixed(0)}ms</div>
      </div>
    </div>

    <h2>Epoch Timeline</h2>
    <div class="epoch-timeline">
      ${viz.epochs.map(epoch => `
        <div class="epoch-item">
          <div class="epoch-header">
            <span class="epoch-id">${epoch.epochId}</span>
            <span class="epoch-duration">${epoch.duration}ms</span>
          </div>
          <div class="timestamp">${new Date(epoch.startTime).toISOString()}</div>
          <div>
            <span class="flux-state flux-${epoch.fluxState.holdingPhase}">${epoch.fluxState.holdingPhase.toUpperCase()}</span>
            <span style="margin-left: 1rem; opacity: 0.7;">Δ: ${epoch.fluxState.fluxDelta}ms | V: ${epoch.fluxState.fluxVelocity.toFixed(2)}</span>
          </div>
          <div style="margin-top: 0.5rem; font-size: 0.875rem; opacity: 0.7;">
            ${epoch.metadata.domain} / ${epoch.metadata.scope} / ${epoch.metadata.type}
          </div>
        </div>
      `).join('')}
    </div>

    ${viz.vetoEvents.length > 0 ? `
      <h2>Veto Events</h2>
      <div class="veto-events">
        ${viz.vetoEvents.map(veto => `
          <div class="veto-item">
            <div>${veto.reason}</div>
            <div class="timestamp">${new Date(veto.timestamp).toISOString()}</div>
            <div style="margin-top: 0.5rem;">Flux Delta: ${veto.fluxDelta}ms</div>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <h2>Flux Transitions</h2>
    <div class="epoch-timeline">
      ${viz.fluxTransitions.map(transition => `
        <div class="epoch-item">
          <div class="epoch-header">
            <span>${transition.from} → ${transition.to}</span>
            <span class="timestamp">${new Date(transition.timestamp).toISOString()}</span>
          </div>
          <div style="margin-top: 0.5rem;">
            Δ: ${transition.fluxDelta}ms | V: ${transition.fluxVelocity.toFixed(2)}
          </div>
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>`;
}

