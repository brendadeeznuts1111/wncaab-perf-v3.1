#!/usr/bin/env bun
/// <reference types="bun-types" />
/**
 * Release Notes Generator
 * 
 * Generates markdown and JSON release notes for v3.1.0 stable release.
 * 
 * Usage: bun run scripts/generate-release-notes.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { $ } from 'bun';

const VERSION = '3.1.0';
const RELEASE_DATE = new Date().toISOString().split('T')[0];

interface ReleaseNotes {
  version: string;
  releaseDate: string;
  status: 'stable' | 'beta' | 'alpha';
  features: string[];
  enhancements: string[];
  fixes: string[];
  breakingChanges: string[];
  infrastructure: string[];
  documentation: string[];
}

async function getGitCommitsSinceBeta(): Promise<string[]> {
  try {
    // Get commits since last beta tag or from a specific point
    const result = await $`git log --oneline --since="2 weeks ago"`.quiet();
    const commits = result.stdout.toString().trim().split('\n').filter(Boolean);
    return commits.slice(0, 20); // Last 20 commits
  } catch {
    return [];
  }
}

function generateMarkdownNotes(notes: ReleaseNotes): string {
  let markdown = `# Release Notes - v${notes.version}\n\n`;
  markdown += `**Release Date**: ${notes.releaseDate}\n`;
  markdown += `**Status**: ${notes.status.toUpperCase()}\n\n`;
  markdown += `---\n\n`;

  if (notes.features.length > 0) {
    markdown += `## ✨ New Features\n\n`;
    notes.features.forEach(feature => {
      markdown += `- ${feature}\n`;
    });
    markdown += `\n`;
  }

  if (notes.enhancements.length > 0) {
    markdown += `## 🚀 Enhancements\n\n`;
    notes.enhancements.forEach(enhancement => {
      markdown += `- ${enhancement}\n`;
    });
    markdown += `\n`;
  }

  if (notes.fixes.length > 0) {
    markdown += `## 🐛 Bug Fixes\n\n`;
    notes.fixes.forEach(fix => {
      markdown += `- ${fix}\n`;
    });
    markdown += `\n`;
  }

  if (notes.infrastructure.length > 0) {
    markdown += `## 🏗️ Infrastructure\n\n`;
    notes.infrastructure.forEach(infra => {
      markdown += `- ${infra}\n`;
    });
    markdown += `\n`;
  }

  if (notes.documentation.length > 0) {
    markdown += `## 📚 Documentation\n\n`;
    notes.documentation.forEach(doc => {
      markdown += `- ${doc}\n`;
    });
    markdown += `\n`;
  }

  if (notes.breakingChanges.length > 0) {
    markdown += `## ⚠️ Breaking Changes\n\n`;
    notes.breakingChanges.forEach(change => {
      markdown += `- ${change}\n`;
    });
    markdown += `\n`;
  }

  markdown += `---\n\n`;
  markdown += `## 📦 Installation\n\n`;
  markdown += `\`\`\`bash\n`;
  markdown += `bun install\n`;
  markdown += `\`\`\`\n\n`;

  markdown += `## 🚀 Quick Start\n\n`;
  markdown += `\`\`\`bash\n`;
  markdown += `bun run dev\n`;
  markdown += `\`\`\`\n\n`;

  markdown += `## 📖 Documentation\n\n`;
  markdown += `- [Component Architecture](./docs/TENSION-VISUALIZER-COMPONENT-ARCHITECTURE.md)\n`;
  markdown += `- [Production Hardening](./docs/TENSION-VISUALIZER-PRODUCTION-HARDENING.md)\n`;
  markdown += `- [Node Graph Visualization](./docs/NODE-GRAPH-VISUALIZATION.md)\n`;
  markdown += `- [API Reference](./docs/api/)\n\n`;

  return markdown;
}

function generateJsonNotes(notes: ReleaseNotes): string {
  return JSON.stringify(notes, null, 2);
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('📝 Release Notes Generator - Phase 3');
  console.log('='.repeat(70) + '\n');

  const commits = await getGitCommitsSinceBeta();
  console.log(`📋 Found ${commits.length} recent commits\n`);

  // Define release notes based on v3.1.0-beta.5 features
  const releaseNotes: ReleaseNotes = {
    version: VERSION,
    releaseDate: RELEASE_DATE,
    status: 'stable',
    features: [
      'Tension Mapping Visualizer with real-time color generation',
      'Node Graph Visualization with DNA-like double helix structure',
      'Interactive node graph with zoom, pan, reset, and particle effects',
      'Socket addressing integration using Bun.connect() API',
      'Process API compatibility layer for Bun runtime',
      'Port conflict detection and resolution system',
      'Production hardening with TTY detection and kill-switch triggers',
    ],
    enhancements: [
      'Enhanced header component with semantic HTML5 and Bun-compliant CSS',
      'Improved typography using Inter font family',
      'Slider lock feature for preserving parameter values',
      'PWA manifest support with Web App Manifest specification',
      'Comprehensive component architecture documentation',
      'Production-ready CLI tension mapper with color output control',
      'Automated kill-switch trigger at T > 0.95 threshold',
      'Adaptive quanta scaling based on conflict levels',
      'Entropy precision truncation for production telemetry',
      'Share URL feature disabled in production environments',
      'Keyboard shortcuts with TTY detection',
      'Durable Object support for distributed state tracking',
    ],
    fixes: [
      'Fixed preset display to show whole numbers without trailing zeros',
      'Fixed graph controls not working when SVG elements not fully rendered',
      'Fixed manifest.json to adhere to Web App Manifest specification',
      'Fixed CSS conflicts in header component',
      'Fixed missing closing tags in controls section',
      'Fixed broken links and formatting in documentation',
      'Fixed code block language labels in markdown files',
    ],
    breakingChanges: [],
    infrastructure: [
      'Port configuration system with conflict detection',
      'Infrastructure health check scripts',
      'Comprehensive test suite orchestrator',
      'Release pipeline automation scripts',
      'Version management integration with Bun.semver',
      'Process compatibility layer initialization',
      'Graceful shutdown handlers with worker pool cleanup',
    ],
    documentation: [
      'Component architecture documentation with wire charts',
      'Production hardening guide',
      'Node Graph Visualization documentation',
      'Port configuration guide',
      'Process API compatibility documentation',
      'Release pipeline documentation',
    ],
  };

  // Generate markdown
  const markdownNotes = generateMarkdownNotes(releaseNotes);
  const markdownPath = join(process.cwd(), `RELEASE_NOTES_v${VERSION}.md`);
  writeFileSync(markdownPath, markdownNotes, 'utf-8');
  console.log(`✅ Generated markdown release notes: ${markdownPath}`);

  // Generate JSON
  const jsonNotes = generateJsonNotes(releaseNotes);
  const jsonPath = join(process.cwd(), `RELEASE_NOTES_v${VERSION}.json`);
  writeFileSync(jsonPath, jsonNotes, 'utf-8');
  console.log(`✅ Generated JSON release notes: ${jsonPath}`);

  console.log('\n' + '='.repeat(70));
  console.log('📊 Release Notes Summary');
  console.log('='.repeat(70));
  console.log(`   Features: ${releaseNotes.features.length}`);
  console.log(`   Enhancements: ${releaseNotes.enhancements.length}`);
  console.log(`   Fixes: ${releaseNotes.fixes.length}`);
  console.log(`   Infrastructure: ${releaseNotes.infrastructure.length}`);
  console.log(`   Documentation: ${releaseNotes.documentation.length}`);
  console.log(`   Breaking Changes: ${releaseNotes.breakingChanges.length}`);
  console.log('');
  console.log(`✅ Release notes generated successfully!`);
  console.log('='.repeat(70) + '\n');
}

if (import.meta.main) {
  main().catch(error => {
    console.error('❌ Release notes generation failed:', error);
    process.exit(1);
  });
}
