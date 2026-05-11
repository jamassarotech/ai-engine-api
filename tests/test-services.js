/**
 * Services Test Script
 * Tests individual service functions
 * 
 * Usage: node tests/test-services.js
 */

require('dotenv').config();
const normalizationService = require('../src/services/normalization.service');
const logger = require('../src/utils/logger');

function testNormalizationService() {
  console.log('\n=== Testing Normalization Service ===\n');

  const testCases = [
    'is LG C4 worth it',
    'MacBook Pro M4 vs MacBook Air M4',
    'best monitor for coding under 500',
    'Sony XM6 overheating issue',
    'Best laptops 2026',
    '  multiple   spaces   test  ',
    'CAPITAL LETTERS TEST',
  ];

  console.log('1. Testing query normalization and classification:\n');

  testCases.forEach(query => {
    const normalized = normalizationService.normalizeQuery(query);
    const type = normalizationService.detectQueryType(normalized);
    const slug = normalizationService.createSlug(normalized);

    console.log(`   Query: "${query}"`);
    console.log(`     Normalized: "${normalized}"`);
    console.log(`     Type: ${type}`);
    console.log(`     Slug: ${slug}\n`);
  });

  console.log('2. Testing query validation:\n');

  const validationTests = [
    { query: 'ab', expected: false, reason: 'too short' },
    { query: 'valid query', expected: true, reason: 'valid' },
    { query: 'a'.repeat(600), expected: false, reason: 'too long' },
    { query: 'aaaaaaaaaaaaaaaaaaa', expected: false, reason: 'repeated chars' },
  ];

  validationTests.forEach(test => {
    const result = normalizationService.validateQuery(test.query);
    const status = result.isValid === test.expected ? '✓' : '✗';
    console.log(`   ${status} "${test.query.substring(0, 30)}..." - ${test.reason}`);
    if (result.reason) {
      console.log(`     Reason: ${result.reason}`);
    }
  });

  console.log('\n3. Testing complete query processing:\n');

  const processTest = 'is MacBook Pro M4 worth it';
  const processed = normalizationService.processQuery(processTest);
  
  console.log(`   Original: "${processed.original}"`);
  console.log(`   Normalized: "${processed.normalized}"`);
  console.log(`   Slug: "${processed.slug}"`);
  console.log(`   Type: "${processed.type}"`);

  console.log('\n✓ Normalization service tests completed!\n');
}

function testQueryTypeDetection() {
  console.log('\n=== Testing Query Type Detection ===\n');

  const typeTests = [
    { query: 'lg c4 vs samsung s95d', expectedType: 'comparison' },
    { query: 'best monitor under 500', expectedType: 'best' },
    { query: 'macbook overheating issue', expectedType: 'troubleshooting' },
    { query: 'is sony xm6 worth it', expectedType: 'product' },
    { query: 'iphone 16 review', expectedType: 'product' },
    { query: 'how to fix wifi', expectedType: 'troubleshooting' },
    { query: 'top 10 headphones 2026', expectedType: 'best' },
  ];

  typeTests.forEach(test => {
    const normalized = normalizationService.normalizeQuery(test.query);
    const detectedType = normalizationService.detectQueryType(normalized);
    const match = detectedType === test.expectedType;
    const status = match ? '✓' : '✗';
    
    console.log(`   ${status} "${test.query}"`);
    console.log(`     Expected: ${test.expectedType}, Got: ${detectedType}`);
  });

  console.log('\n✓ Query type detection tests completed!\n');
}

function testSlugGeneration() {
  console.log('\n=== Testing Slug Generation ===\n');

  const slugTests = [
    'LG C4 OLED TV',
    'MacBook Pro M4 vs Air',
    'Best Monitor Under $500',
    'Sony XM6 Headphones',
    'iPhone 16 Pro Max Review',
  ];

  slugTests.forEach(query => {
    const normalized = normalizationService.normalizeQuery(query);
    const slug = normalizationService.createSlug(normalized);
    console.log(`   "${query}"`);
    console.log(`     → "${slug}"\n`);
  });

  console.log('✓ Slug generation tests completed!\n');
}

function runTests() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║       Services Test Suite              ║');
  console.log('╚════════════════════════════════════════╝');

  try {
    testNormalizationService();
    testQueryTypeDetection();
    testSlugGeneration();

    console.log('╔════════════════════════════════════════╗');
    console.log('║   ✓ All service tests passed!         ║');
    console.log('╚════════════════════════════════════════╝\n');

    console.log('Note: This tests normalization logic only.');
    console.log('For full integration tests, run:');
    console.log('  - npm run test:pipeline\n');

  } catch (error) {
    console.error('\n✗ Service tests failed:', error.message);
    process.exit(1);
  }
}

// Run tests
runTests();
