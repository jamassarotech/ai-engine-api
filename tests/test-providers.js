/**
 * Provider Test Script
 * Tests YouTube and Reddit providers independently
 * 
 * Usage: node tests/test-providers.js
 */

require('dotenv').config();
const youtubeProvider = require('../src/providers/youtube.provider');
const redditProvider = require('../src/providers/reddit.provider');
const logger = require('../src/utils/logger');

async function testYouTube() {
  console.log('\n=== Testing YouTube Provider ===\n');

  try {
    // Test connection
    console.log('1. Testing YouTube API connection...');
    const connected = await youtubeProvider.testConnection();
    console.log(`   ✓ Connection: ${connected ? 'SUCCESS' : 'FAILED'}\n`);

    if (!connected) {
      console.log('   ⚠ Check your YOUTUBE_API_KEY in .env file\n');
      return;
    }

    // Test search
    console.log('2. Testing YouTube search...');
    const query = 'MacBook Pro M4 review';
    const videos = await youtubeProvider.search(query, 3);
    console.log(`   ✓ Found ${videos.length} videos for "${query}"\n`);

    if (videos.length > 0) {
      console.log('   Sample video:');
      console.log(`   - Title: ${videos[0].title}`);
      console.log(`   - Author: ${videos[0].author}`);
      console.log(`   - URL: ${videos[0].url}`);
      console.log(`   - Views: ${videos[0].score.toLocaleString()}`);
      console.log(`   - Published: ${videos[0].published_at.toISOString()}`);
      console.log(`   - Description length: ${videos[0].text.length} chars\n`);
    }

    console.log('✓ YouTube provider tests passed!\n');
  } catch (error) {
    console.error('✗ YouTube provider test failed:', error.message);
    if (error.response) {
      console.error('  Response:', error.response.status, error.response.data);
    }
  }
}

async function testReddit() {
  console.log('\n=== Testing Reddit Provider ===\n');

  try {
    // Test connection
    console.log('1. Testing Reddit API connection...');
    const connected = await redditProvider.testConnection();
    console.log(`   ✓ Connection: ${connected ? 'SUCCESS' : 'FAILED'}\n`);

    // Test search
    console.log('2. Testing Reddit search...');
    const query = 'MacBook Pro M4 review';
    const posts = await redditProvider.searchPosts(query, 3);
    console.log(`   ✓ Found ${posts.length} posts for "${query}"\n`);

    if (posts.length > 0) {
      console.log('   Sample post:');
      console.log(`   - Title: ${posts[0].title}`);
      console.log(`   - Author: ${posts[0].author}`);
      console.log(`   - Subreddit: r/${posts[0].metadata.subreddit}`);
      console.log(`   - URL: ${posts[0].url}`);
      console.log(`   - Score: ${posts[0].score} upvotes`);
      console.log(`   - Comments: ${posts[0].metadata.numComments}`);
      console.log(`   - Published: ${posts[0].published_at.toISOString()}`);
      console.log(`   - Text length: ${posts[0].text.length} chars\n`);
    }

    // Test comments
    if (posts.length > 0 && posts[0].metadata.permalink) {
      console.log('3. Testing comment fetching...');
      const comments = await redditProvider.getPostComments(posts[0].metadata.permalink, 2);
      console.log(`   ✓ Found ${comments.length} comments\n`);

      if (comments.length > 0) {
        console.log('   Sample comment:');
        console.log(`   - Author: ${comments[0].author}`);
        console.log(`   - Score: ${comments[0].score} upvotes`);
        console.log(`   - Text: ${comments[0].text.substring(0, 100)}...\n`);
      }
    }

    console.log('✓ Reddit provider tests passed!\n');
  } catch (error) {
    console.error('✗ Reddit provider test failed:', error.message);
    if (error.response) {
      console.error('  Response:', error.response.status, error.response.data);
    }
  }
}

async function testBoth() {
  console.log('\n=== Testing Combined Search ===\n');

  try {
    const query = 'LG C4 OLED worth it';

    console.log(`Testing combined search for: "${query}"\n`);

    // Fetch from both providers in parallel
    const [youtubeVideos, redditPosts] = await Promise.all([
      youtubeProvider.search(query, 5),
      redditProvider.searchPosts(query, 5),
    ]);

    console.log(`Results:`);
    console.log(`  - YouTube: ${youtubeVideos.length} videos`);
    console.log(`  - Reddit: ${redditPosts.length} posts`);
    console.log(`  - Total: ${youtubeVideos.length + redditPosts.length} sources\n`);

    console.log('✓ Combined search test passed!\n');
  } catch (error) {
    console.error('✗ Combined search test failed:', error.message);
  }
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   Provider Integration Test Suite     ║');
  console.log('╚════════════════════════════════════════╝');

  try {
    await testYouTube();
    await testReddit();
    await testBoth();

    console.log('╔════════════════════════════════════════╗');
    console.log('║   ✓ All tests completed!              ║');
    console.log('╚════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\nFatal error:', error);
    process.exit(1);
  }
}

// Run tests
runTests();
