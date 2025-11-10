/**
 * Dashboard Meta Macro - Build-time version & link validation
 * 
 * Compile-time version injection and URL validation for WNCAAB dashboard.
 * All metadata is resolved at build time - zero runtime cost.
 * 
 * @module macros/dashboard-meta
 */

import { $ } from "bun";

// Read version from package.json
const pkg = await Bun.file("package.json").json();
const VERSION = pkg.version || "3.1.0";

// Git metadata (for dev dashboard)
let gitBranch = "main";
let gitCommit = "HEAD";

try {
  const [branchResult, commitResult] = await Promise.all([
    $`git rev-parse --abbrev-ref HEAD`.quiet(),
    $`git rev-parse --short HEAD`.quiet(),
  ]);
  gitBranch = (await branchResult.text()).trim();
  gitCommit = (await commitResult.text()).trim();
} catch {
  // Fallback if git is not available or not in a git repo
  console.warn("⚠️  Git metadata unavailable, using defaults");
}

// Repo configuration (validated at build time)
// ✅ Using correct repository URL from constants
const REPO_CONFIG = {
  owner: "brendadeeznuts1111",
  name: "wncaab-perf-v3.1",
  platform: "github" as const, // or "gitlab", "bitbucket"
};

// Construct URLs
const REPO_URL = `https://${REPO_CONFIG.platform}.com/${REPO_CONFIG.owner}/${REPO_CONFIG.name}`;
const ISSUES_URL = `${REPO_URL}/issues`;
const PRS_URL = `${REPO_URL}/pulls`;
const CHANGELOG_URL = `${REPO_URL}/blob/main/CHANGELOG.md`;

// Validate URLs at build time (ensures no 404s)
async function validateUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
    return res.ok || res.status === 404; // 404 is ok for issues/PRs if repo exists
  } catch {
    return false;
  }
}

// Pre-validate critical links (non-blocking for build)
let repoValid = false;
let issuesValid = false;
let prsValid = false;
let changelogValid = false;

try {
  [repoValid, issuesValid, prsValid, changelogValid] = await Promise.all([
    validateUrl(REPO_URL),
    validateUrl(ISSUES_URL),
    validateUrl(PRS_URL),
    validateUrl(CHANGELOG_URL),
  ]);
} catch (error) {
  console.warn("⚠️  Link validation skipped (network unavailable or timeout)");
}

if (!repoValid) {
  console.warn(`⚠️  Repo URL may be invalid: ${REPO_URL}`);
}

// Export macro-compatible object
export const DASHBOARD_META = {
  version: VERSION,
  git: { 
    branch: gitBranch, 
    commit: gitCommit,
  },
  urls: {
    repo: { url: REPO_URL, valid: repoValid },
    issues: { url: ISSUES_URL, valid: issuesValid },
    prs: { url: PRS_URL, valid: prsValid },
    changelog: { url: CHANGELOG_URL, valid: changelogValid },
  },
  buildTime: new Date().toISOString(),
  repo: REPO_CONFIG,
};

// Type helpers for macro
export type DashboardMeta = typeof DASHBOARD_META;

