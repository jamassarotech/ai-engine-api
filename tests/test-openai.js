/**
 * OpenAI Provider Test Script
 * Tests AI analysis generation with real or mock sources
 * 
 * Usage: node tests/test-openai.js
 */

require('dotenv').config();
const openaiProvider = require('../src/providers/openai.provider');
const youtubeProvider = require('../src/providers/youtube.provider');
const redditProvider = require('../src/providers/reddit.provider');
const logger = require('../src/utils/logger');

// Mock sources for quick testing without external API calls
const mockSources = [
  {
    source_type: 'youtube',
    title: 'LG C4 OLED Review - The BEST TV of 2024?',
    url: 'https://youtube.com/watch?v=example1',
    author: 'Tech Review Channel',
    published_at: new Date('2024-10-15'),
    text: 'The LG C4 OLED is an excellent TV for gaming and movies. The picture quality is outstanding with perfect blacks and vibrant colors. Gaming at 120Hz is buttery smooth. However, it can get very bright in dark rooms, which might be uncomfortable. The price is also quite high at $2000+.',
    score: 150000,
  },
  {
    source_type: 'reddit',
    title: 'Just got the LG C4 - my honest review',
    url: 'https://reddit.com/r/hometheater/example',
    author: 'u/hometheater_fan',
    published_at: new Date('2024-11-20'),
    text: 'Been using the C4 for 2 months now. The picture quality is incredible, but I noticed some burn-in concerns if you watch a lot of news channels with static logos. Also, the built-in speakers are mediocre - definitely invest in a soundbar. For gaming, this is hands down the best TV I\'ve ever used.',
    score: 432,
  },
  {
    source_type: 'youtube',
    title: 'LG C4 vs Samsung S95D - Which Should You Buy?',
    url: 'https://youtube.com/watch?v=example2',
    author: 'Display Expert',
    published_at: new Date('2024-09-30'),
    text: 'Comparing the LG C4 and Samsung S95D. The C4 has better gaming features with 4 HDMI 2.1 ports. Samsung is brighter for daytime viewing. For pure picture quality in movies, LG wins with better motion handling and color accuracy. Samsung has better HDR peak brightness though.',
    score: 89000,
  },
  {
    source_type: 'reddit',
    title: 'PSA: C4 burn-in after 6 months of use',
    url: 'https://reddit.com/r/OLED/example',
    author: 'u/oled_watcher',
    published_at: new Date('2024-12-01'),
    text: 'Just a warning for potential buyers - I got visible burn-in after 6 months of heavy gaming (8+ hours daily). LG replaced it under warranty but be aware this is a real risk if you play the same game with static HUD elements. Use the pixel shift and screen saver features!',
    score: 823,
  },
  {
    source_type: 'youtube',
    title: 'LG C4 - 1 Year Later Review',
    url: 'https://youtube.com/watch?v=example3',
    author: 'Long Term Tech',
    published_at: new Date('2025-01-10'),
    text: 'After a year of daily use, the C4 is still performing excellently. No burn-in issues with normal mixed content use. The firmware updates have improved gaming features. At current prices ($1600), this is the best value in premium TVs. Highly recommended for home theater enthusiasts.',
    score: 67000,
  },
];

async function testBasicCompletion() {
  console.log('\n=== Testing Basic OpenAI Connection ===\n');

  try {
    const result = await openaiProvider.testCompletion('Say hello in one word');
    
    if (result.success) {
      console.log('✓ OpenAI connection successful');
      console.log(`  Response: ${result.response}\n`);
      return true;
    } else {
      console.log('✗ OpenAI connection failed');
      console.log(`  Error: ${result.error}\n`);
      return false;
    }
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    return false;
  }
}

async function testAnalysisWithMockSources() {
  console.log('\n=== Testing AI Analysis with Mock Sources ===\n');

  try {
    const query = 'LG C4 OLED worth it';
    
    console.log(`Query: "${query}"`);
    console.log(`Sources: ${mockSources.length} mock sources\n`);
    console.log('Generating analysis (this may take 10-30 seconds)...\n');

    const result = await openaiProvider.generateAnalysis(query, mockSources);

    console.log('✓ Analysis generated successfully!\n');
    console.log('=== RESULTS ===\n');

    // Summary
    console.log('📊 SUMMARY:');
    console.log(`  Title: ${result.analysis.summary.title}`);
    console.log(`  Verdict: ${result.analysis.summary.verdict}\n`);

    // Pros
    console.log(`✅ PROS (${result.analysis.pros.length}):`);
    result.analysis.pros.forEach((pro, i) => {
      console.log(`  ${i + 1}. ${pro.point}`);
      console.log(`     Sources: ${pro.sources.length} reference(s)`);
    });
    console.log('');

    // Cons
    console.log(`❌ CONS (${result.analysis.cons.length}):`);
    result.analysis.cons.forEach((con, i) => {
      console.log(`  ${i + 1}. ${con.point}`);
      console.log(`     Sources: ${con.sources.length} reference(s)`);
    });
    console.log('');

    // Warnings
    if (result.analysis.warnings.length > 0) {
      console.log(`⚠️  WARNINGS (${result.analysis.warnings.length}):`);
      result.analysis.warnings.forEach((warning, i) => {
        console.log(`  ${i + 1}. [${warning.severity.toUpperCase()}] ${warning.warning}`);
      });
      console.log('');
    }

    // Quotes
    if (result.analysis.quotes.length > 0) {
      console.log(`💬 NOTABLE QUOTES (${result.analysis.quotes.length}):`);
      result.analysis.quotes.slice(0, 3).forEach((quote, i) => {
        console.log(`  ${i + 1}. "${quote.text.substring(0, 80)}..."`);
        console.log(`     — ${quote.author} (${quote.source})`);
      });
      console.log('');
    }

    // Metadata
    console.log('📈 METADATA:');
    console.log(`  Confidence: ${result.analysis.confidence.toUpperCase()}`);
    console.log(`  Model: ${result.metadata.model}`);
    console.log(`  Tokens: ${result.metadata.tokens_input} in, ${result.metadata.tokens_output} out`);
    console.log(`  Cost: $${result.metadata.ai_cost.toFixed(4)}`);
    console.log(`  Latency: ${result.metadata.latency_ms}ms\n`);

    console.log('✓ AI analysis test passed!\n');
    return true;
  } catch (error) {
    console.error('✗ AI analysis test failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    return false;
  }
}

async function testAnalysisWithRealSources() {
  console.log('\n=== Testing AI Analysis with Real Sources ===\n');

  try {
    const query = 'MacBook Pro M4 worth it';
    
    console.log(`Query: "${query}"`);
    console.log('Fetching real sources from YouTube and Reddit...\n');

    // Fetch real sources
    const [youtubeVideos, redditPosts] = await Promise.all([
      youtubeProvider.search(query, 3),
      redditProvider.searchPosts(query, 3),
    ]);

    const allSources = [...youtubeVideos, ...redditPosts];

    if (allSources.length === 0) {
      console.log('⚠️  No sources found. Skipping real source test.\n');
      return true;
    }

    console.log(`Found ${allSources.length} sources:`);
    console.log(`  - YouTube: ${youtubeVideos.length} videos`);
    console.log(`  - Reddit: ${redditPosts.length} posts\n`);
    console.log('Generating analysis (this may take 10-30 seconds)...\n');

    const result = await openaiProvider.generateAnalysis(query, allSources);

    console.log('✓ Real source analysis completed!\n');
    console.log(`Summary: ${result.analysis.summary.title}`);
    console.log(`Verdict: ${result.analysis.summary.verdict}`);
    console.log(`Confidence: ${result.analysis.confidence}`);
    console.log(`Cost: $${result.metadata.ai_cost.toFixed(4)}\n`);

    console.log('✓ Real source test passed!\n');
    return true;
  } catch (error) {
    console.error('✗ Real source test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   OpenAI Provider Test Suite          ║');
  console.log('╚════════════════════════════════════════╝');

  let allPassed = true;

  // Test 1: Basic connection
  const connectionTest = await testBasicCompletion();
  if (!connectionTest) {
    console.log('\n⚠️  OpenAI connection failed. Check your OPENAI_API_KEY in .env');
    console.log('Skipping remaining tests.\n');
    process.exit(1);
  }

  // Test 2: Mock sources (fast, no external API calls)
  const mockTest = await testAnalysisWithMockSources();
  allPassed = allPassed && mockTest;

  // Test 3: Real sources (optional, only if APIs are configured)
  const hasYouTubeKey = process.env.YOUTUBE_API_KEY;
  if (hasYouTubeKey) {
    console.log('YouTube API key found - testing with real sources...');
    const realTest = await testAnalysisWithRealSources();
    allPassed = allPassed && realTest;
  } else {
    console.log('⚠️  No YouTube API key - skipping real source test\n');
  }

  // Summary
  console.log('╔════════════════════════════════════════╗');
  if (allPassed) {
    console.log('║   ✓ All tests passed!                 ║');
  } else {
    console.log('║   ✗ Some tests failed                 ║');
  }
  console.log('╚════════════════════════════════════════╝\n');

  process.exit(allPassed ? 0 : 1);
}

// Run tests
runTests();
