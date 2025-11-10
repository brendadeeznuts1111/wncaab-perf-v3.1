#!/usr/bin/env bun
/// <reference types="bun-types" />
/**
 * API Smoke Test - Test all API endpoints with standardized headers
 * 
 * Tests all API endpoints and verifies standardized headers are present:
 * - X-API-Domain: API domain (dev, tension, gauge, ai, validate, system)
 * - X-API-Scope: API scope/concern
 * - X-API-Version: API version
 * - X-Request-ID: Unique request identifier
 * - X-Response-Time: Response time (if timing enabled)
 * - X-Server: Server identifier
 * - CORS headers
 * 
 * Usage: bun run scripts/smoke-test-api.ts
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3002';

interface TestCase {
  name: string;
  path: string;
  method?: string;
  expectedDomain: string;
  expectedScope: string;
  expectedVersion?: string;
  expectedStatus?: number;
}

const testCases: TestCase[] = [
  {
    name: 'Tension Mapping API (JSON)',
    path: '/api/tension/map?conflict=1.0&entropy=0.0&tension=0.0',
    expectedDomain: 'tension',
    expectedScope: 'mapping',
    expectedVersion: 'v1.6',
    expectedStatus: 200,
  },
  {
    name: 'Tension Mapping API (CSV)',
    path: '/api/tension/map?conflict=0.5&entropy=0.3&tension=0.7&format=csv',
    expectedDomain: 'tension',
    expectedScope: 'mapping',
    expectedVersion: 'v1.6',
    expectedStatus: 200,
  },
  {
    name: 'Tension Mapping API (Table)',
    path: '/api/tension/map?conflict=0.5&entropy=0.3&tension=0.7&format=table',
    expectedDomain: 'tension',
    expectedScope: 'mapping',
    expectedVersion: 'v1.6',
    expectedStatus: 200,
  },
  {
    name: 'Tension Health Check',
    path: '/api/tension/health',
    expectedDomain: 'tension',
    expectedScope: 'health',
    expectedVersion: 'v1.6',
    expectedStatus: 200,
  },
  {
    name: 'Tension Help',
    path: '/api/tension/help',
    expectedDomain: 'tension',
    expectedScope: 'help',
    expectedVersion: 'v1.6',
    expectedStatus: 200,
  },
  {
    name: 'Dev Endpoints',
    path: '/api/dev/endpoints',
    expectedDomain: 'dev',
    expectedScope: 'endpoints',
    expectedVersion: 'v2.1',
    expectedStatus: 200,
  },
  {
    name: 'Dev Metrics',
    path: '/api/dev/metrics',
    expectedDomain: 'dev',
    expectedScope: 'metrics',
    expectedVersion: 'v2.1',
    expectedStatus: 200,
  },
  {
    name: 'Dev Configs',
    path: '/api/dev/configs',
    expectedDomain: 'dev',
    expectedScope: 'configs',
    expectedVersion: 'v2.1',
    expectedStatus: 200,
  },
  {
    name: 'Dev Workers',
    path: '/api/dev/workers',
    expectedDomain: 'dev',
    expectedScope: 'workers',
    expectedVersion: 'v2.1',
    expectedStatus: 200,
  },
  {
    name: 'Dev Status',
    path: '/api/dev/status',
    expectedDomain: 'dev',
    expectedScope: 'status',
    expectedVersion: 'v2.1',
    expectedStatus: 200,
  },
  {
    name: 'WNBATOR Gauge',
    path: '/api/gauge/womens-sports?oddsSkew=0.92&volumeVelocity=47000&volatilityEntropy=0.41&timeDecay=323&momentumCurvature=0.89',
    expectedDomain: 'gauge',
    expectedScope: 'womens-sports',
    expectedVersion: 'v1.4.2',
    expectedStatus: 200,
  },
  {
    name: 'AI Maparse',
    path: '/api/ai/maparse?prices=100,102,105,110,118',
    expectedDomain: 'ai',
    expectedScope: 'maparse',
    expectedVersion: 'v1.4.2',
    expectedStatus: 200,
  },
  {
    name: 'Threshold Validator',
    path: '/api/validate/threshold?threshold=0.7-.0012',
    expectedDomain: 'validate',
    expectedScope: 'threshold',
    expectedVersion: 'v1.4.2',
    expectedStatus: 200,
  },
  {
    name: 'API Version',
    path: '/api/version',
    expectedDomain: 'system',
    expectedScope: 'version',
    expectedVersion: 'v2.1',
    expectedStatus: 200,
  },
];

interface TestResult {
  name: string;
  passed: boolean;
  status: number;
  headers: Record<string, string>;
  errors: string[];
  responseTime?: number;
}

async function testEndpoint(testCase: TestCase): Promise<TestResult> {
  const startTime = performance.now();
  const errors: string[] = [];
  let response: Response;
  let headers: Record<string, string> = {};
  
  try {
    response = await fetch(`${BASE_URL}${testCase.path}`, {
      method: testCase.method || 'GET',
    });
    
    const responseTime = performance.now() - startTime;
    
    // Extract headers
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    
    // Check status code
    if (testCase.expectedStatus && response.status !== testCase.expectedStatus) {
      errors.push(`Expected status ${testCase.expectedStatus}, got ${response.status}`);
    }
    
    // Check required headers
    const requiredHeaders = [
      'X-API-Domain',
      'X-API-Scope',
      'X-API-Version',
      'X-Request-ID',
      'X-Server',
      'Access-Control-Allow-Origin',
    ];
    
    for (const header of requiredHeaders) {
      if (!headers[header]) {
        errors.push(`Missing required header: ${header}`);
      }
    }
    
    // Check domain
    if (headers['X-API-Domain'] !== testCase.expectedDomain) {
      errors.push(`Expected X-API-Domain: ${testCase.expectedDomain}, got: ${headers['X-API-Domain']}`);
    }
    
    // Check scope
    if (headers['X-API-Scope'] !== testCase.expectedScope) {
      errors.push(`Expected X-API-Scope: ${testCase.expectedScope}, got: ${headers['X-API-Scope']}`);
    }
    
    // Check version (if specified)
    if (testCase.expectedVersion && headers['X-API-Version'] !== testCase.expectedVersion) {
      errors.push(`Expected X-API-Version: ${testCase.expectedVersion}, got: ${headers['X-API-Version']}`);
    }
    
    // Check response time header (should be present for most endpoints)
    if (!headers['X-Response-Time'] && testCase.expectedStatus === 200) {
      // Warning, not error - some endpoints might not have timing
      console.warn(`⚠️  ${testCase.name}: Missing X-Response-Time header`);
    }
    
    return {
      name: testCase.name,
      passed: errors.length === 0,
      status: response.status,
      headers,
      errors,
      responseTime,
    };
  } catch (error) {
    return {
      name: testCase.name,
      passed: false,
      status: 0,
      headers,
      errors: [`Request failed: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

async function runSmokeTest() {
  console.log(`\n🧪 API Smoke Test - Testing ${testCases.length} endpoints\n`);
  console.log(`📍 Base URL: ${BASE_URL}\n`);
  
  const results: TestResult[] = [];
  
  for (const testCase of testCases) {
    const result = await testEndpoint(testCase);
    results.push(result);
    
    const icon = result.passed ? '✅' : '❌';
    const statusIcon = result.status === 200 ? '🟢' : result.status >= 400 ? '🔴' : '🟡';
    
    console.log(`${icon} ${statusIcon} ${result.name}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Domain: ${result.headers['X-API-Domain'] || 'MISSING'}`);
    console.log(`   Scope: ${result.headers['X-API-Scope'] || 'MISSING'}`);
    console.log(`   Version: ${result.headers['X-API-Version'] || 'MISSING'}`);
    console.log(`   Request ID: ${result.headers['X-Request-ID']?.substring(0, 8) || 'MISSING'}...`);
    if (result.headers['X-Response-Time']) {
      console.log(`   Response Time: ${result.headers['X-Response-Time']}`);
    }
    if (result.responseTime) {
      console.log(`   Actual Time: ${result.responseTime.toFixed(2)}ms`);
    }
    
    if (result.errors.length > 0) {
      console.log(`   ❌ Errors:`);
      result.errors.forEach(error => console.log(`      - ${error}`));
    }
    console.log('');
  }
  
  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  
  // Header coverage report
  console.log('\n📋 Header Coverage:');
  const headerStats: Record<string, number> = {};
  results.forEach(result => {
    Object.keys(result.headers).forEach(header => {
      if (header.startsWith('X-')) {
        headerStats[header] = (headerStats[header] || 0) + 1;
      }
    });
  });
  
  Object.entries(headerStats)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([header, count]) => {
      const percentage = ((count / results.length) * 100).toFixed(1);
      console.log(`   ${header}: ${count}/${results.length} (${percentage}%)`);
    });
  
  // Domain/Scope breakdown
  console.log('\n🏷️  Domain/Scope Breakdown:');
  const domainScopeMap: Record<string, Set<string>> = {};
  results.forEach(result => {
    const domain = result.headers['X-API-Domain'];
    const scope = result.headers['X-API-Scope'];
    if (domain && scope) {
      if (!domainScopeMap[domain]) {
        domainScopeMap[domain] = new Set();
      }
      domainScopeMap[domain].add(scope);
    }
  });
  
  Object.entries(domainScopeMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([domain, scopes]) => {
      console.log(`   ${domain}: ${Array.from(scopes).join(', ')}`);
    });
  
  console.log('\n' + '='.repeat(60));
  
  if (failed > 0) {
    console.log('\n❌ Some tests failed. Check errors above.');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

if (import.meta.main) {
  runSmokeTest().catch(error => {
    console.error('❌ Smoke test failed:', error);
    process.exit(1);
  });
}

