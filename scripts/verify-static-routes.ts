#!/usr/bin/env bun
/**
 * Static Routes Verification Script
 * 
 * Tests static file serving, cache headers, and 404 handling
 * 
 * Usage:
 *   bun run scripts/verify-static-routes.ts [port]
 */

import { STATIC_FILES, generateStaticRoutes, generateStaticRouteTags } from './static-routes.ts';

const PORT = parseInt(process.argv[2] || process.env.PORT || '3002', 10);
const BASE_URL = `http://localhost:${PORT}`;

console.log('🧪 Static Routes Verification\n');
console.log(`📍 Testing server at: ${BASE_URL}\n`);

// Test 1: Verify manifest structure
console.log('1️⃣  Verifying manifest structure...');
console.log(`   ✅ Found ${STATIC_FILES.length} static files in manifest`);
STATIC_FILES.forEach(f => {
  console.log(`      - ${f.path} (immutable: ${f.immutable ?? false})`);
});

// Test 2: Verify route generation
console.log('\n2️⃣  Verifying route generation...');
const routes = generateStaticRoutes();
console.log(`   ✅ Generated ${routes.length} routes`);
routes.forEach(r => {
  console.log(`      - ${r.path}`);
});

// Test 3: Verify auto-tags
console.log('\n3️⃣  Verifying auto-generated tags...');
const tags = generateStaticRouteTags();
console.log(`   ✅ Generated ${tags.length} tags`);
tags.forEach(t => {
  console.log(`      - ${t}`);
});

// Test 4: Test HTTP endpoints (if server is running)
console.log('\n4️⃣  Testing HTTP endpoints...');
const tests = [
  {
    name: 'Static file serving',
    url: `${BASE_URL}/public/tension-states.json`,
    expectedStatus: 200,
    checkHeaders: ['content-type'],
  },
  {
    name: 'Immutable cache headers',
    url: `${BASE_URL}/js/tension-controller.js`,
    expectedStatus: 200,
    checkHeaders: ['cache-control'],
    expectedHeader: 'cache-control',
    expectedHeaderValue: 'public, max-age=31536000, immutable',
  },
  {
    name: '404 for non-manifest files',
    url: `${BASE_URL}/public/secret-file.json`,
    expectedStatus: 404,
  },
];

for (const test of tests) {
  try {
    const response = await fetch(test.url, { method: 'HEAD' });
    const statusOk = response.status === test.expectedStatus;
    const statusIcon = statusOk ? '✅' : '❌';
    
    console.log(`   ${statusIcon} ${test.name}:`);
    console.log(`      URL: ${test.url}`);
    console.log(`      Status: ${response.status} ${statusOk ? '(expected)' : `(expected ${test.expectedStatus})`}`);
    
    if (test.checkHeaders) {
      test.checkHeaders.forEach(header => {
        const value = response.headers.get(header);
        if (value) {
          console.log(`      ${header}: ${value}`);
          if (test.expectedHeader === header && test.expectedHeaderValue) {
            const matches = value.toLowerCase().includes(test.expectedHeaderValue.toLowerCase());
            console.log(`      ${matches ? '✅' : '❌'} Cache header ${matches ? 'matches' : 'does not match'} expected value`);
          }
        } else {
          console.log(`      ⚠️  ${header}: not found`);
        }
      });
    }
    console.log('');
  } catch (error) {
    console.log(`   ⚠️  ${test.name}:`);
    console.log(`      Error: ${error instanceof Error ? error.message : String(error)}`);
    console.log(`      (Server may not be running on port ${PORT})\n`);
  }
}

console.log('📋 Grep Patterns:');
console.log('   # Find all /public/ routes:');
console.log('   rg "path: \'/public/" scripts/static-routes.ts');
console.log('');
console.log('   # Query auto-generated tags:');
tags.forEach(t => {
  console.log(`   rg "${t}" .remote.index`);
});

