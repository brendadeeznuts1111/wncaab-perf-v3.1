/**
 * Color Type Definitions for Tension Mapping (v1.5.0)
 * 
 * Strict type definitions matching exact format requirements:
 * - hex: "#1a2b3c" (lowercase)
 * - HEX: "#1A2B3C" (uppercase, macro-compliant)
 * - hsl: "hsl(120, 50%, 50%)" (formatted string)
 */

/**
 * HSL color string format: "hsl(120, 50%, 50%)"
 * - Lowercase "hsl"
 * - Space after comma
 * - Percent signs for saturation and lightness
 */
export type HSLColorString = `hsl(${number}, ${number}%, ${number}%)`;

/**
 * Lowercase hex color format: "#1a2b3c"
 * - Lowercase letters
 * - Always 7 characters (# + 6 hex digits)
 */
export type HexColorString = `#${string}` & { readonly __brand: 'hex-lowercase' };

/**
 * Uppercase hex color format: "#1A2B3C"
 * - Uppercase letters
 * - Always 7 characters (# + 6 hex digits)
 * - Macro-compliant format
 */
export type HEXColorString = `#${string}` & { readonly __brand: 'hex-uppercase' };

/**
 * HSL color object
 */
export interface HSLColor {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

/**
 * RGB color object
 */
export interface RGBColor {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

/**
 * Complete color representation matching exact format requirements
 */
export interface ColorValue {
  /** Lowercase hex: "#1a2b3c" */
  hex: HexColorString;
  
  /** Uppercase hex: "#1A2B3C" (macro-compliant) */
  HEX: HEXColorString;
  
  /** HSL formatted string: "hsl(120, 50%, 50%)" */
  hsl: HSLColorString;
  
  /** HSL object for calculations */
  hslObject: HSLColor;
  
  /** RGB object for calculations */
  rgb: RGBColor;
}

/**
 * Precomputed tension state with typed colors
 */
export interface TensionState {
  /** Unique key: "c-e-t" where c,e,t are 0-10 */
  key: string;
  
  /** Color values in all formats (hex, HEX, hsl) */
  color: ColorValue;
  
  /** Visual properties */
  opacity: number; // 0.0-1.0
  width: number;   // 1-4
  
  /** Metadata */
  meta: {
    relation: 'temperate' | 'moderate' | 'intense' | 'extreme';
    conflict: number;  // 0.0-1.0
    entropy: number;   // 0.0-1.0
    tension: number;   // 0.0-1.0
    absorbedBy: string;
    visualNote: string;
  };
}

/**
 * Map of all precomputed states (key → state)
 */
export type TensionStateMap = Map<string, TensionState>;

