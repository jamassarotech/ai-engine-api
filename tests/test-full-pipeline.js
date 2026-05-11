/**
 * Full Pipeline Test
 * Tests the complete flow: YouTube → Reddit → OpenAI → Analysis
 * 
 * Usage: node tests/test-full-pipeline.js [query]
 * Example: node tests/test-full-pipeline.js "is lg c4 worth it"
 */

require('dotenv').config();
const youtubeProvider = require('../src/providers/youtube.provider');
const redditProvider = require('../src/providers/reddit.provider');
const openaiProvider = require('../src/providers/openai.provider');
const logger = require('../src/utils/logger');

async function testFullPipeline(query) {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║   Full Pipeline Test: Search → Analyze            ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  console.log(`🔍 Query: "${query}"\n`);

  const startTime = Date.now();

  try {
    // Step 1: Fetch sources
    console.log('📥 Step 1: Fetching sources...\n');

    const fetchStart = Date.now();
    const [youtubeVideos, redditSources] = await Promise.all([
      youtubeProvider.search(query, 5).catch(err => {
        console.log(`   ⚠️  YouTube fetch failed: ${err.message}`);
        return [];
      }),
      redditProvider.search(query, 10).catch(err => {
        console.log(`   ⚠️  Reddit fetch failed: ${err.message}`);
        return [];
      }),
    ]);
    const fetchTime = Date.now() - fetchStart;

    console.log(`   ✓ YouTube: ${youtubeVideos.length} videos (${youtubeVideos.reduce((sum, v) => sum + v.score, 0).toLocaleString()} total views)`);
    console.log(`   ✓ Reddit: ${redditSources.length} sources (posts + comments)`);
    console.log(`   ⏱️  Fetch time: ${fetchTime}ms\n`);

    const allSources = [...youtubeVideos, ...redditSources];

    if (allSources.length === 0) {
      console.log('❌ No sources found. Cannot proceed with analysis.\n');
      process.exit(1);
    }

    // Step 2: Generate AI analysis
    console.log(`🤖 Step 2: Generating AI analysis from ${allSources.length} sources...\n`);

    const analysisStart = Date.now();
    const result = await openaiProvider.generateAnalysis(query, allSources);
    const analysisTime = Date.now() - analysisStart;

    console.log(`   ✓ Analysis generated`);
    console.log(`   ⏱️  AI time: ${analysisTime}ms\n`);

    // Step 3: Display results
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║                    RESULTS                         ║');
    console.log('╚════════════════════════════════════════════════════╝\n');

    // Summary
    console.log('📊 SUMMARY\n');
    console.log(`   ${result.analysis.summary.title}\n`);
    console.log(`   ${result.analysis.summary.verdict}\n`);

    // Pros
    console.log(`✅ PROS (${result.analysis.pros.length})\n`);
    result.analysis.pros.forEach((pro, i) => {
      console.log(`   ${i + 1}. ${pro.point}`);
    });
    console.log('');

    // Cons
    console.log(`❌ CONS (${result.analysis.cons.length})\n`);
    result.analysis.cons.forEach((con, i) => {
      console.log(`   ${i + 1}. ${con.point}`);
    });
    console.log('');

    // Warnings
    if (result.analysis.warnings.length > 0) {
      console.log(`⚠️  WARNINGS (${result.analysis.warnings.length})\n`);
      result.analysis.warnings.forEach((warning, i) => {
        const emoji = warning.severity === 'high' ? '🔴' : warning.severity === 'medium' ? '🟡' : '🟢';
        console.log(`   ${emoji} ${warning.warning}`);
      });
      console.log('');
    }

    // Quotes
    if (result.analysis.quotes.length > 0) {
      console.log(`💬 NOTABLE QUOTES\n`);
      result.analysis.quotes.slice(0, 3).forEach((quote, i) => {
        console.log(`   "${quote.text}"`);
        console.log(`   — ${quote.author}\n`);
      });
    }

    // Metadata
    const totalTime = Date.now() - startTime;
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║                   METADATA                         ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
    console.log(`   Sources: ${allSources.length} (${youtubeVideos.length} YouTube, ${redditSources.length} Reddit)`);
    console.log(`   Confidence: ${result.analysis.confidence.toUpperCase()}`);
    console.log(`   AI Model: ${result.metadata.model}`);
    console.log(`   Tokens: ${result.metadata.tokens_input} in → ${result.metadata.tokens_output} out`);
    console.log(`   AI Cost: $${result.metadata.ai_cost.toFixed(4)}`);
    console.log(`   Total Time: ${totalTime}ms`);
    console.log(`     - Fetch: ${fetchTime}ms (${((fetchTime/totalTime)*100).toFixed(1)}%)`);
    console.log(`     - AI: ${analysisTime}ms (${((analysisTime/totalTime)*100).toFixed(1)}%)\n`);

    console.log('✅ Full pipeline test completed successfully!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Pipeline test failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Get query from command line or use default
const query = process.argv[2] || 'MacBook Pro M4 worth it';

testFullPipeline(query);
