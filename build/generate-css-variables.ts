#!/usr/bin/env bun
/**
 * Generate CSS Variables - Build script for theme variables
 * 
 * Generates CSS variables file for runtime theme switching.
 * Also generates color palette visualizer HTML.
 * Run this as part of your build process.
 * 
 * @module build/generate-css-variables
 */

import { generateCssVariables, WNCAAB_COLORS, getContrastColor, generateColorReport } from "../macros/color-macro.ts";

// Generate CSS variables
const cssVariables = generateCssVariables();

// Write to public directory for serving
await Bun.write("public/wncaab-variables.css", cssVariables);

console.log("✅ Generated CSS variables:");
console.log("   📄 public/wncaab-variables.css");

// Generate color palette visualizer HTML
const colors = Object.entries(WNCAAB_COLORS);

const paletteHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WNCAAB Color Palette</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
      min-height: 100vh;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      padding: 2rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 {
      color: #333;
      margin-bottom: 0.5rem;
      font-size: 2.5em;
    }
    .subtitle {
      color: #666;
      margin-bottom: 2rem;
      font-size: 1.1em;
    }
    .color-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-top: 2rem;
    }
    .color-box {
      width: 100%;
      height: 150px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 1rem;
      color: white;
      text-shadow: 0 1px 3px rgba(0,0,0,0.5);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;
    }
    .color-box:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.25);
    }
    .color-name {
      font-weight: 700;
      font-size: 1.1em;
      margin-bottom: 0.25rem;
    }
    .color-hex {
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
      opacity: 0.95;
    }
    .info-section {
      margin-top: 3rem;
      padding: 1.5rem;
      background: #f8f9fa;
      border-radius: 12px;
      border-left: 4px solid #80FF80;
    }
    .info-section h2 {
      color: #333;
      margin-bottom: 1rem;
    }
    .info-section code {
      background: #e9ecef;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎨 WNCAAB Color Palette</h1>
    <p class="subtitle">Build-time validated colors with WCAG AAA contrast compliance</p>
    
    <div class="color-grid">
      ${colors.map(([name, hex]) => {
        const contrast = getContrastColor(hex);
        return `
          <div class="color-box" style="background: ${hex}; color: ${contrast};" onclick="navigator.clipboard.writeText('${hex}').then(() => alert('Copied: ${hex}'))">
            <div class="color-name">${name}</div>
            <div class="color-hex">${hex}</div>
          </div>
        `;
      }).join('')}
    </div>
    
    <div class="info-section">
      <h2>📋 Usage</h2>
      <p><strong>TypeScript:</strong></p>
      <pre><code>import { WNCAAB_COLORS, getColor } from './macros/color-macro.ts';
const primary = getColor('primary'); // Type-safe!</code></pre>
      
      <p style="margin-top: 1rem;"><strong>CSS Variables:</strong></p>
      <pre><code>background: var(--wn-primary);
color: var(--wn-text-primary);</code></pre>
      
      <p style="margin-top: 1rem;"><strong>Runtime Theme Switching:</strong></p>
      <pre><code>document.documentElement.style.setProperty('--wn-primary', '#FF0000');</code></pre>
    </div>
  </div>
</body>
</html>`;

await Bun.write("public/color-palette.html", paletteHtml);

console.log("✅ Generated color palette visualizer:");
console.log("   📄 public/color-palette.html");

// Generate and display usage report
const usageReport = generateColorReport();
console.log("\n📊 Color Usage Report:");
console.log(`   Total colors: ${usageReport.total}`);
console.log(`   Used colors: ${usageReport.used.length}`);
console.log(`   Unused colors: ${usageReport.unusedCount}`);

if (usageReport.unused.length > 0) {
  console.log(`   Unused: ${usageReport.unused.join(', ')}`);
} else {
  console.log("   ✅ All colors are actively used!");
}

console.log("\n💡 Usage:");
console.log('   <link rel="stylesheet" href="/wncaab-variables.css">');
console.log('   <a href="/color-palette.html">View Color Palette</a>');
console.log("\n💡 Runtime theme switching:");
console.log('   document.documentElement.style.setProperty("--wn-primary", "#FF0000");');
console.log("\n🌙 Dark mode:");
console.log('   Automatically respects prefers-color-scheme: dark');

