/**
 * Tension Mapping Macro - Edge Relation Tempering (v1.5.0)
 * 
 * Maps conflict/entropy/tension parameters to visual edge properties:
 * - ColorValue with hex (lowercase), HEX (uppercase), hsl (formatted string)
 * - Opacity (0.0-1.0)
 * - Width (1-4px)
 * 
 * Macro-inlined for zero runtime drift, optimized for sub-millisecond execution.
 */

import type { ColorValue } from '../types/tension-colors.ts';
import { createColorValue } from '../lib/color-utils.ts';

export interface EdgeRelation {
  /** Complete color representation with hex, HEX, hsl formats */
  color: ColorValue;
  
  opacity: number;
  width: number;
  meta: {
    relation: 'temperate' | 'moderate' | 'intense' | 'extreme';
    conflict: number;
    entropy: number;
    tension: number;
    absorbedBy: string;
    visualNote: string;
  };
}

/**
 * Map edge relation from conflict/entropy/tension parameters
 * 
 * @param conflict - Conflict level (0.0-1.0): Higher = more visible opacity
 * @param entropy - Entropy level (0.0-1.0): Higher = thicker width
 * @param tension - Tension level (0.0-1.0): Higher = redder, lower = greener
 * @returns EdgeRelation with ColorValue (hex, HEX, hsl), opacity, width, and metadata
 */
export function mapEdgeRelation(
  conflict: number = 0.0,
  entropy: number = 0.0,
  tension: number = 0.0
): EdgeRelation {
  // Clamp inputs to [0.0, 1.0]
  conflict = Math.max(0.0, Math.min(1.0, conflict));
  entropy = Math.max(0.0, Math.min(1.0, entropy));
  tension = Math.max(0.0, Math.min(1.0, tension));

  // Opacity: High conflict = high opacity (0.3 base + 0.7 * conflict)
  const opacity = 0.3 + (conflict * 0.7);
  
  // Width: High entropy = thick edges (1px base + 3px * entropy)
  const width = Math.round(1 + (entropy * 3));
  
  // Color: Low tension = green (#80FF80), high tension = red (#FF0000)
  // Interpolate between green (0.0) and red (1.0)
  const r = Math.round(128 + (tension * 127)); // 128 -> 255
  const g = Math.round(255 - (tension * 175)); // 255 -> 80
  const b = Math.round(128 - (tension * 128)); // 128 -> 0
  
  // Create hex string (will be normalized in createColorValue)
  const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  
  // Create complete ColorValue with all formats
  const color = createColorValue(hex);
  
  // Determine relation type (prioritize tension for color classification)
  let relation: 'temperate' | 'moderate' | 'intense' | 'extreme';
  // Low tension = temperate (green), high tension = extreme (red)
  // Conflict/entropy affect intensity but tension drives the base relation
  if (tension < 0.25) relation = 'temperate';
  else if (tension < 0.5) relation = 'moderate';
  else if (tension < 0.75) relation = 'intense';
  else relation = 'extreme';
  
  // Generate visual note
  const visualNote = `${relation === 'temperate' ? 'Green' : relation === 'extreme' ? 'Red' : 'Orange'} ${width === 1 ? 'thin' : width === 4 ? 'thick' : 'medium'} edges - ${conflict >= 0.7 ? 'maximal' : conflict >= 0.4 ? 'moderate' : 'minimal'} conflict visibility, ${entropy >= 0.7 ? 'high' : entropy >= 0.4 ? 'moderate' : 'zero'} entropy dispersion`;
  
  return {
    color, // ColorValue with hex, HEX, hsl formats
    opacity,
    width,
    meta: {
      relation,
      conflict,
      entropy,
      tension,
      absorbedBy: 'cli-mapper',
      visualNote,
    },
  };
}

// Macro export for inlining
export default mapEdgeRelation;
