#!/usr/bin/env bun
/**
 * WNBATOR 5D Tensor Gauge - Women's Sports Betting Streams (v1.4.2)
 * 
 * 5-dimensional gauge that feeds the edge mapper with real-time betting data
 */

import { mapEdgeRelation } from '../macros/tension-map';

export interface WNBATOR_Tensor {
  oddsSkew: number;        // Moneyline asymmetry (0.0-1.0)
  volumeVelocity: number;  // $/second flow rate
  volatilityEntropy: number; // Spread oscillation amplitude
  timeDecay: number;       // Seconds-to-start pressure
  momentumCurvature: number; // 2nd derivative of line movement
}

export interface WNBATOR_GaugeResult {
  hex: string;
  opacity: number;
  width: number;
  gap: string;
  betSignal: string;
  tensor: {
    oddsSkew: number;
    volumeVelocity: number;
    volatilityEntropy: number;
    timeDecay: number;
    momentumCurvature: number;
  };
  conflict: number;
  entropy: number;
  tension: number;
}

/**
 * Gauge WNBATOR tensor and map to edge relation
 */
export function gaugeWNBATOR(tensor: WNBATOR_Tensor): WNBATOR_GaugeResult {
  // Normalize to [0,1]
  const normalized = {
    oddsSkew: Math.min(1, tensor.oddsSkew * 2),
    volumeVelocity: Math.min(1, tensor.volumeVelocity / 50000),
    volatilityEntropy: tensor.volatilityEntropy,
    timeDecay: Math.min(1, tensor.timeDecay / 3600),
    momentumCurvature: Math.min(1, Math.abs(tensor.momentumCurvature) * 10)
  };
  
  // Weighted parametric map
  const conflict = (normalized.oddsSkew * 0.35) + (normalized.volumeVelocity * 0.35);
  const entropy = normalized.volatilityEntropy;
  const tension = (normalized.timeDecay * 0.4) + (normalized.momentumCurvature * 0.6);
  
  // Edge + Gap (arbitrage detection)
  const edge = mapEdgeRelation(conflict, entropy, tension);
  const gapScore = Math.abs(normalized.momentumCurvature - normalized.volatilityEntropy);
  
  return {
    ...edge,
    gap: gapScore > 0.7 ? "🔥 ARBITRAGE-GAP" : "🟡 TIGHT",
    betSignal: gapScore > 0.7 && conflict > 0.8 ? "💎 HIGH-VALUE" : "⚪ MONITOR",
    tensor: normalized,
    conflict,
    entropy,
    tension
  };
}

/**
 * Format gauge result for display
 */
export function formatGaugeResult(result: WNBATOR_GaugeResult, gameInfo?: { sport: string; teams: string; score?: string; time?: string }): string {
  const lines: string[] = [];
  
  if (gameInfo) {
    lines.push(`┌─────────────────────────────────────────────────────────┐`);
    lines.push(`│ ${gameInfo.sport}: ${gameInfo.teams}${gameInfo.score ? ` | ${gameInfo.score}` : ''}${gameInfo.time ? ` | ${gameInfo.time}` : ''}                 │`);
    lines.push(`├─────────────────────────────────────────────────────────┤`);
  } else {
    lines.push(`┌─────────────────────────────────────────────────────────┐`);
    lines.push(`│ WNBATOR Tensor Gauge                                    │`);
    lines.push(`├─────────────────────────────────────────────────────────┤`);
  }
  
  // Tensor values with visual bars
  const bar = (value: number) => {
    const bars = Math.floor(value * 5);
    return '🔴'.repeat(bars) + '⚪'.repeat(5 - bars);
  };
  
  lines.push(`│ oddsSkew:        ${result.tensor.oddsSkew.toFixed(2)} ${bar(result.tensor.oddsSkew)}`);
  lines.push(`│ volumeVelocity:  ${(result.tensor.volumeVelocity * 50000).toFixed(0)}/s ${bar(result.tensor.volumeVelocity)}`);
  lines.push(`│ volatility:      ${result.tensor.volatilityEntropy.toFixed(2)} ${bar(result.tensor.volatilityEntropy)}`);
  lines.push(`│ timeDecay:       ${(result.tensor.timeDecay * 3600).toFixed(0)}s ${bar(result.tensor.timeDecay)}`);
  lines.push(`│ momentumCurve:   ${result.tensor.momentumCurvature.toFixed(2)} ${bar(result.tensor.momentumCurvature)}`);
  lines.push(`├─────────────────────────────────────────────────────────┤`);
  lines.push(`│ EDGE: ${result.hex} | Width:${result.width}px | Opacity:${(result.opacity * 100).toFixed(0)}%`);
  lines.push(`│ GAP: ${result.gap}`);
  lines.push(`│ SIGNAL: ${result.betSignal}`);
  lines.push(`└─────────────────────────────────────────────────────────┘`);
  
  return lines.join('\n');
}

// CLI interface
if (import.meta.main) {
  const args = Bun.argv.slice(2);
  
  // Parse tensor from args or use defaults
  const tensor: WNBATOR_Tensor = {
    oddsSkew: parseFloat(args.find(a => a.startsWith('--odds-skew='))?.split('=')[1] || '0.5'),
    volumeVelocity: parseFloat(args.find(a => a.startsWith('--volume='))?.split('=')[1] || '25000'),
    volatilityEntropy: parseFloat(args.find(a => a.startsWith('--volatility='))?.split('=')[1] || '0.5'),
    timeDecay: parseFloat(args.find(a => a.startsWith('--time-decay='))?.split('=')[1] || '1800'),
    momentumCurvature: parseFloat(args.find(a => a.startsWith('--momentum='))?.split('=')[1] || '0.5')
  };
  
  const result = gaugeWNBATOR(tensor);
  
  const gameInfo = args.find(a => a.startsWith('--game='))?.split('=')[1];
  const displayInfo = gameInfo ? {
    sport: args.find(a => a.startsWith('--sport='))?.split('=')[1] || 'WNBA',
    teams: gameInfo,
    score: args.find(a => a.startsWith('--score='))?.split('=')[1],
    time: args.find(a => a.startsWith('--time='))?.split('=')[1]
  } : undefined;
  
  console.log(formatGaugeResult(result, displayInfo));
  
  // Also output JSON for piping
  if (args.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  }
}

