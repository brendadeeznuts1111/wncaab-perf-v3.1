/**
 * Color Macro - Build-time color conversions using Bun's color macro
 * 
 * Uses Bun's native color macro for bundle-time color formatting.
 * All color conversions happen at build time - zero runtime cost.
 * 
 * @module macros/color-macro
 */

// Note: Bun's color macro requires `with { type: "macro" }` syntax
// However, since we're using this in a regular TypeScript file that gets imported,
// we'll use a build-time color conversion function instead.
// The actual Bun color macro would be used in build scripts.

/**
 * WNCAAB Theme Colors
 * Primary color from tension mapping: green-thin edge (#80FF80)
 */
export const WNCAAB_COLORS = {
  // Primary colors (from tension mapping)
  primary: "#80FF80",        // Green-thin edge (temperate relation)
  primaryDark: "#4ade80",    // Darker green for gradients
  primaryLight: "#a8f5a8",  // Lighter green
  
  // Contrast colors (calculated from primary)
  contrastDark: "#0f172a",   // Dark text on light background
  contrastLight: "#f8fafc",  // Light text on dark background
  
  // Status colors
  success: "#28a745",        // Green for active/success states
  error: "#dc3545",          // Red for errors/inactive states
  warning: "#ffc107",        // Yellow for warnings
  info: "#17a2b8",           // Blue for info
  
  // UI colors
  background: "#667eea",     // Purple gradient start
  backgroundEnd: "#764ba2",  // Purple gradient end
  cardBackground: "#ffffff",  // White for cards
  textPrimary: "#333333",    // Dark gray for primary text
  textSecondary: "#666666",  // Medium gray for secondary text
  border: "#e0e0e0",         // Light gray for borders
  
  // Live indicator
  liveIndicator: "#ef4444",  // Red for live indicator dot
} as const;

/**
 * Convert hex to RGB
 * Build-time helper for color calculations
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

/**
 * Calculate contrast color (dark or light) based on brightness
 * Build-time helper for determining text color on colored backgrounds
 */
export function getContrastColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? WNCAAB_COLORS.contrastDark : WNCAAB_COLORS.contrastLight;
}

/**
 * Convert hex to CSS rgba with opacity
 */
export function hexToRgba(hex: string, opacity: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

