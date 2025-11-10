#!/usr/bin/env bun
/**
 * Weekly Color System Audit
 * Generates detailed usage report and bundle impact analysis
 * 
 * @module scripts/color-audit
 */

import { generateColorReport } from '../macros/color-macro.ts';

console.log("📊 Weekly Color System Audit");
console.log("================================");

const report = generateColorReport();

console.log(`\n📈 Usage Statistics:`);
console.log(`   Total colors defined: ${report.total}`);
console.log(`   Actively used: ${report.used.length}`);
console.log(`   Unused: ${report.unusedCount}`);

if (report.unusedCount > 0) {
  console.log(`\n🚨 Unused Colors (Bundle Bloat):`);
  report.unused.forEach(color => {
    console.log(`   - ${color} (remove to save ~50 bytes)`);
  });
  
  // Estimate bundle size impact
  const bloatEstimate = report.unusedCount * 50; // ~50 bytes per color
  console.log(`\n💾 Estimated bundle bloat: ${bloatEstimate} bytes`);
  console.log(`   Removing unused colors would reduce CSS by ${bloatEstimate} bytes`);
} else {
  console.log("\n✅ Perfect! No bundle bloat detected");
}

console.log(`\n🔍 Most Used Colors:`);
const usageCounts = report.used.reduce((acc, color) => {
  acc[color] = (acc[color] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

const sortedUsage = Object.entries(usageCounts)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 5);

if (sortedUsage.length > 0) {
  sortedUsage.forEach(([color, count]) => {
    console.log(`   ${color}: ${count} uses`);
  });
} else {
  console.log(`   (Usage tracking requires getColor() calls)`);
}

console.log(`\n📋 Recommendations:`);
if (report.unusedCount > 0) {
  console.log(`   1. Remove unused colors: ${report.unused.join(', ')}`);
  console.log(`   2. Run: bun run build:css-variables`);
  console.log(`   3. Commit the updated CSS`);
} else {
  console.log(`   1. ✅ Color system is perfectly optimized`);
  console.log(`   2. All colors are actively used`);
  console.log(`   3. No bundle bloat detected`);
}

console.log(`\n🚀 Bundle Impact: ${report.total * 50} bytes total`);
console.log(`   (Each color ~50 bytes in CSS variables)`);

// Exit with error code if unused colors found (for CI/CD)
if (report.unusedCount > 0) {
  process.exit(1);
}

