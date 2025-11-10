/**
 * Color Utility Functions (v1.5.0) - Using Bun.color() Native API
 * 
 * Leverages Bun's native CSS parser (58,000 lines of Zig) for color conversion.
 * Matches exact format requirements: hex (lowercase), HEX (uppercase), hsl (formatted string).
 * 
 * Note: Bun.color() returns HSL in decimal format (0-1), we convert to percentage format (0-100%).
 */

import type { HSLColor, RGBColor, HexColorString, HEXColorString, HSLColorString, ColorValue } from '../types/tension-colors.ts';

/**
 * Parse Bun's HSL format to HSL object
 * Bun returns: "hsl(120, 1, 0.7509804)" (decimal values)
 * We convert to: { h: 120, s: 100, l: 75 } (percentage values)
 */
export function parseBunHSL(hslString: string): HSLColor {
  // Bun format: hsl(h, s, l) where s and l are 0-1 decimals
  const match = hslString.match(/^hsl\((\d+(?:\.\d+)?),\s*([\d.]+),\s*([\d.]+)\)$/);
  if (!match) {
    throw new Error(`Invalid Bun HSL string: ${hslString}`);
  }
  
  const h = Math.round(parseFloat(match[1]));
  const s = Math.round(parseFloat(match[2]) * 100); // Convert 0-1 to 0-100
  const l = Math.round(parseFloat(match[3]) * 100); // Convert 0-1 to 0-100
  
  return { h, s, l };
}

/**
 * Format HSL object to HSL string: "hsl(120, 50%, 50%)"
 * Matches exact format: lowercase "hsl", space after comma, percent signs
 */
export function formatHSL(hsl: HSLColor): HSLColorString {
  return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` as HSLColorString;
}

/**
 * Parse RGB string to RGB object
 * Input: "rgb(255, 99, 71)"
 * Output: { r: 255, g: 99, b: 71 }
 */
export function parseRGB(rgbString: string): RGBColor {
  const match = rgbString.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!match) {
    throw new Error(`Invalid RGB string: ${rgbString}`);
  }
  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10),
  };
}

/**
 * Create complete ColorValue using Bun.color() native API
 * 
 * Uses Bun's CSS parser for all conversions:
 * - hex: lowercase (#1a2b3c)
 * - HEX: uppercase (#1A2B3C)
 * - hsl: formatted string (hsl(120, 50%, 50%)) - converted from Bun's decimal format
 * 
 * @param input - Color input (hex string, RGB object, number, etc.)
 * @returns ColorValue with all formats precompiled
 */
export function createColorValue(input: string | { r: number; g: number; b: number } | number): ColorValue {
  // Use Bun.color() for all conversions (native CSS parser)
  const hex = Bun.color(input, "hex") as HexColorString;        // "#1a2b3c" (lowercase)
  const HEX = Bun.color(input, "HEX") as HEXColorString;        // "#1A2B3C" (uppercase)
  const bunHsl = Bun.color(input, "hsl");                       // "hsl(120, 1, 0.7509804)" (Bun's decimal format)
  const rgbString = Bun.color(input, "rgb");                    // "rgb(255, 99, 71)"
  
  // Parse Bun's HSL format (decimal) and convert to percentage format
  const hslObject = parseBunHSL(bunHsl);
  const hsl = formatHSL(hslObject);                              // "hsl(120, 100%, 75%)" (our required format)
  
  // Parse RGB string to object
  const rgb = parseRGB(rgbString);

  return {
    hex,      // "#1a2b3c" (lowercase)
    HEX,      // "#1A2B3C" (uppercase)
    hsl,      // "hsl(120, 50%, 50%)" (formatted string with percentages)
    hslObject,
    rgb,
  };
}
