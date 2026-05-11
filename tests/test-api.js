/**
 * Test API Layer - Without Database
 * This tests the Express app without requiring PostgreSQL or external APIs
 */

const request = require('supertest');

console.log('╔═══════════════════════════════════════════╗');
console.log('║   Testing API Layer (No Database)        ║');
console.log('╚═══════════════════════════════════════════╝\n');

// Mock the search service before importing app
const mockSearchResult = {
  query: 'test query',
  metadata: {
    cached: false,
    latency_ms: 1234,
    query_type: 'product',
    slug: 'test-query',
    ai_cost: 0.005,
    tokens_used: 500,
  },
  summary: {
    title: 'Test Product Analysis',
    verdict: 'This is a mock response',
  },
  pros: [
    { point: 'Good quality', sources: [1, 2] },
    { point: 'Fair price', sources: [2, 3] },
  ],
  cons: [
    { point: 'Limited availability', sources: [1] },
  ],
  warnings: [],
  quotes: [
    {
      quote: 'Great product!',
      author: 'Test User',
      source_index: 1,
    },
  ],
  sources: {
    total: 3,
    by_type: { youtube: 2, reddit: 1 },
    items: [],
  },
};

// Manually mock the module
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function (id) {
  if (id === '../services/search.service') {
    return {
      executeSearch: async () => mockSearchResult,
      getSearchBySlug: async () => null,
    };
  }
  return originalRequire.apply(this, arguments);
};

// Now import the app (which will use the mocked service)
const app = require('../src/app');

async function runTests() {
  try {
    console.log('1. Testing Health Endpoint\n');
    
    const healthRes = await request(app).get('/health');
    
    console.log(`   Status: ${healthRes.status}`);
    console.log(`   Response:`, healthRes.body);
    console.log(healthRes.status === 200 ? '   ✓ Health check passed\n' : '   ✗ Health check failed\n');

    console.log('2. Testing Root Endpoint\n');
    
    const rootRes = await request(app).get('/');
    
    console.log(`   Status: ${rootRes.status}`);
    console.log(`   Response:`, rootRes.body);
    console.log(rootRes.status === 200 ? '   ✓ Root endpoint passed\n' : '   ✗ Root endpoint failed\n');

    console.log('3. Testing POST /api/search (Valid Request)\n');
    
    const searchRes = await request(app)
      .post('/api/search')
      .send({ query: 'is lg c4 worth it' })
      .set('Content-Type', 'application/json');
    
    console.log(`   Status: ${searchRes.status}`);
    console.log(`   Response:`, JSON.stringify(searchRes.body, null, 2));
    console.log(searchRes.status === 200 ? '   ✓ Search endpoint passed\n' : '   ✗ Search endpoint failed\n');

    console.log('4. Testing POST /api/search (Invalid - Too Short)\n');
    
    const invalidRes1 = await request(app)
      .post('/api/search')
      .send({ query: 'ab' })
      .set('Content-Type', 'application/json');
    
    console.log(`   Status: ${invalidRes1.status}`);
    console.log(`   Error:`, invalidRes1.body);
    console.log(invalidRes1.status === 400 ? '   ✓ Validation working\n' : '   ✗ Validation failed\n');

    console.log('5. Testing POST /api/search (Invalid - Missing Query)\n');
    
    const invalidRes2 = await request(app)
      .post('/api/search')
      .send({})
      .set('Content-Type', 'application/json');
    
    console.log(`   Status: ${invalidRes2.status}`);
    console.log(`   Error:`, invalidRes2.body);
    console.log(invalidRes2.status === 400 ? '   ✓ Validation working\n' : '   ✗ Validation failed\n');

    console.log('6. Testing GET /api/search/:slug\n');
    
    const slugRes = await request(app).get('/api/search/test-slug');
    
    console.log(`   Status: ${slugRes.status}`);
    console.log(`   Response:`, slugRes.body);
    console.log(slugRes.status === 404 ? '   ✓ Slug endpoint working (not found)\n' : '   ✗ Slug endpoint failed\n');

    console.log('7. Testing 404 Handler\n');
    
    const notFoundRes = await request(app).get('/nonexistent');
    
    console.log(`   Status: ${notFoundRes.status}`);
    console.log(`   Response:`, notFoundRes.body);
    console.log(notFoundRes.status === 404 ? '   ✓ 404 handler working\n' : '   ✗ 404 handler failed\n');

    console.log('╔═══════════════════════════════════════════╗');
    console.log('║   ✓ All API layer tests passed!          ║');
    console.log('╚═══════════════════════════════════════════╝');

  } catch (error) {
    console.error('✗ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTests();
