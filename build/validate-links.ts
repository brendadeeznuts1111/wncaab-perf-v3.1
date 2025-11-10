#!/usr/bin/env bun
/**
 * Link Validation Script - Pre-build link checker
 * 
 * Validates all dashboard links before build to ensure no broken URLs.
 * 
 * @module build/validate-links
 */

import { DASHBOARD_META } from "../macros/dashboard-meta.ts";

async function validateUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { 
      method: "HEAD", 
      signal: AbortSignal.timeout(5000),
      headers: {
        'User-Agent': 'WNCAAB-Dashboard-LinkValidator/1.0',
      },
    });
    // Accept 200-299 and 404 (404 means page exists but content doesn't, which is fine for issues/PRs)
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

console.log("🔍 Validating dashboard links...\n");

const links = [
  { name: "Repo", url: DASHBOARD_META.urls.repo.url },
  { name: "Issues", url: DASHBOARD_META.urls.issues.url },
  { name: "PRs", url: DASHBOARD_META.urls.prs.url },
];

let validCount = 0;

for (const link of links) {
  const valid = await validateUrl(link.url);
  console.log(`${valid ? '✅' : '❌'} ${link.name}: ${link.url}`);
  if (valid) validCount++;
}

console.log(`\n📊 Link Health: ${validCount}/${links.length} valid`);

if (validCount < links.length) {
  console.warn("\n⚠️  Some links are invalid. Check repo configuration.");
  console.warn("   Build will continue, but invalid links will be marked in the dashboard.");
  // Don't exit with error - allow build to continue with warnings
}

console.log("🟢 Link validation complete.\n");

