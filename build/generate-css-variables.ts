#!/usr/bin/env bun
/**
 * Generate CSS Variables - Build script for theme variables
 * 
 * Generates CSS variables file for runtime theme switching.
 * Run this as part of your build process.
 * 
 * @module build/generate-css-variables
 */

import { generateCssVariables } from "../macros/color-macro.ts";

const cssVariables = generateCssVariables();

// Write to public directory for serving
await Bun.write("public/wncaab-variables.css", cssVariables);

console.log("✅ Generated CSS variables:");
console.log("   📄 public/wncaab-variables.css");
console.log("\n💡 Usage in HTML:");
console.log('   <link rel="stylesheet" href="/wncaab-variables.css">');
console.log("\n💡 Runtime theme switching:");
console.log('   document.documentElement.style.setProperty("--wn-primary", "#FF0000");');

