#!/usr/bin/env bun
/**
 * TES-NGWS-001.12c: TOML Validation Test
 * Tests that malformed .secrets.toml files are caught
 */

import { readFileSync } from 'fs';
import { parse } from '@iarna/toml';

const testFile = '.secrets.toml.test';

console.log('🔍 Testing TOML validation for security...\n');

try {
  const content = readFileSync(testFile, 'utf-8');
  console.log('📄 File content:');
  console.log('─'.repeat(50));
  console.log(content);
  console.log('─'.repeat(50));
  console.log('');

  // Try to parse the TOML
  const parsed = parse(content);
  
  console.log('❌ ERROR: TOML validation should have failed!');
  console.log('   Missing closing quote was NOT detected!');
  console.log('   Parsed result:', parsed);
  process.exit(1);
} catch (error) {
  if (error instanceof Error) {
    console.log('✅ TOML validation correctly caught error:');
    console.log(`   ${error.message}`);
    console.log('');
    console.log('✅ Security validation working correctly!');
    process.exit(0);
  } else {
    console.log('⚠️  Unexpected error:', error);
    process.exit(1);
  }
}

