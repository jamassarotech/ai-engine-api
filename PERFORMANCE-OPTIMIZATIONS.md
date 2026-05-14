# Performance Optimizations

## Overview
This document outlines the performance optimizations implemented to reduce query response times from ~40 seconds to under 10 seconds.

## Major Bottlenecks Identified

### 1. Reddit Provider Sequential API Calls (~20-25 seconds)
**Problem:**
- 15 subreddits searched sequentially with 1-second delays = 15+ seconds
- 5 comment fetches sequential with delays = 5+ seconds
- Total: ~20-25 seconds just from Reddit API delays

**Solution:**
- ✅ Parallelized subreddit searches with controlled concurrency (batch size: 5)
- ✅ Parallelized comment fetching using `Promise.allSettled`
- ✅ Reduced number of subreddits from 15 to 10 (configurable)
- ✅ Reduced comment fetches from 5 posts to 3 posts
- ✅ Reduced delay between batches from 1000ms to 500ms

### 2. Database Bulk Insert Inefficiency
**Problem:**
- `bulkCreate` was using a loop with individual INSERTs inside a transaction
- Each source required a separate query execution

**Solution:**
- ✅ Optimized to use single INSERT with multiple value sets
- ✅ Reduced database round trips from N queries to 1 query

### 3. Large OpenAI Prompts
**Problem:**
- Source content truncated at 1000 chars per source
- With 20+ sources, this creates very large prompts

**Solution:**
- ✅ Reduced content length from 1000 to 800 chars (configurable)
- ✅ Reduced default sources: YouTube 10→8, Reddit 20→15

### 4. Configuration Optimizations
**Problem:**
- Request timeout was 30 seconds (too long)
- No control over concurrent API requests
- Database connection timeout too short (2s)

**Solution:**
- ✅ Reduced request timeout from 30s to 10s
- ✅ Added configurable batch sizes for parallel requests
- ✅ Increased database connection timeout to 5s
- ✅ Added minimum connection pool size

## New Configuration Options

Add these to your `.env` file to fine-tune performance:

```bash
# Performance Settings
REQUEST_TIMEOUT=10000                    # API request timeout (ms) - default: 10000
REDDIT_BATCH_SIZE=5                      # Parallel Reddit requests - default: 5
REDDIT_MAX_SUBREDDITS=10                 # Max subreddits to search - default: 10
MAX_YOUTUBE_RESULTS=8                    # Max YouTube results - default: 8
MAX_REDDIT_RESULTS=15                    # Max Reddit results - default: 15
SOURCE_CONTENT_MAX_LENGTH=800            # Max content chars per source - default: 800

# Database Performance
DB_MAX_CONNECTIONS=20                    # Connection pool size - default: 20
DB_IDLE_TIMEOUT=30000                    # Idle connection timeout (ms) - default: 30000
DB_CONNECTION_TIMEOUT=5000               # Connection timeout (ms) - default: 5000
```

## Expected Performance Improvements

### Before Optimizations
- Reddit Provider: ~20-25 seconds
- YouTube Provider: ~3-5 seconds
- OpenAI Analysis: ~8-12 seconds
- Database Operations: ~1-2 seconds
- **Total: ~35-45 seconds**

### After Optimizations
- Reddit Provider: ~3-5 seconds (parallelized, reduced sources)
- YouTube Provider: ~2-3 seconds (reduced results)
- OpenAI Analysis: ~6-8 seconds (smaller prompts, fewer sources)
- Database Operations: ~0.5-1 second (optimized bulk insert)
- **Total: ~12-17 seconds** ⚡

### Aggressive Settings (Optional)
For even faster responses, use these settings (may reduce quality slightly):

```bash
REQUEST_TIMEOUT=8000
REDDIT_BATCH_SIZE=8
REDDIT_MAX_SUBREDDITS=8
MAX_YOUTUBE_RESULTS=6
MAX_REDDIT_RESULTS=12
SOURCE_CONTENT_MAX_LENGTH=600
```

**Expected time: ~8-12 seconds** ⚡⚡

## Implementation Details

### 1. Parallel Reddit Searches
```javascript
// Before: Sequential with delays
for (const subreddit of subreddits) {
  await delay(1000);
  const result = await searchSubreddit(query, subreddit);
}

// After: Parallel with batching
const batches = chunk(subreddits, batchSize);
for (const batch of batches) {
  const results = await Promise.allSettled(
    batch.map(sub => searchSubreddit(query, sub))
  );
}
```

### 2. Parallel Comment Fetching
```javascript
// Before: Sequential with delays
for (const post of topPosts) {
  await delay(1000);
  const comments = await getPostComments(post.permalink);
}

// After: Parallel
const commentPromises = topPosts.map(post => 
  getPostComments(post.permalink)
);
const results = await Promise.allSettled(commentPromises);
```

### 3. Optimized Database Insert
```javascript
// Before: Loop with individual INSERTs
for (const source of sources) {
  await client.query(
    'INSERT INTO sources (...) VALUES ($1, $2, ...)',
    [source.field1, source.field2, ...]
  );
}

// After: Single INSERT with multiple value sets
const query = `
  INSERT INTO sources (...)
  VALUES ($1, $2, ...), ($9, $10, ...), ...
`;
await pool.query(query, flattenedValues);
```

## Monitoring Performance

### Check Query Logs
```sql
-- Average latency by cache status
SELECT 
  cached,
  COUNT(*) as queries,
  AVG(latency_ms) as avg_latency_ms,
  MAX(latency_ms) as max_latency_ms
FROM search_logs
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY cached;

-- Slowest queries
SELECT 
  query,
  latency_ms,
  cached,
  created_at
FROM search_logs
WHERE cached = false
ORDER BY latency_ms DESC
LIMIT 10;
```

### Application Logs
Look for these log messages with timing info:
- `Reddit parallel search completed` - Shows Reddit fetch time
- `YouTube search completed` - Shows YouTube fetch time
- `AI analysis completed` - Shows OpenAI processing time
- `Search completed successfully` - Shows total request time

## Trade-offs

### Reduced Sources
- **Benefit:** Faster queries, lower costs
- **Trade-off:** Slightly less comprehensive analysis
- **Mitigation:** Focus on most relevant subreddits and high-quality sources

### Parallel API Requests
- **Benefit:** Dramatically faster execution
- **Trade-off:** Higher instantaneous load on Reddit API
- **Mitigation:** Batch size limit (5 concurrent) and delays between batches

### Shorter Content Length
- **Benefit:** Smaller OpenAI prompts = faster + cheaper
- **Trade-off:** Less context per source
- **Mitigation:** 800 chars is usually sufficient for key insights

## Further Optimizations (Future)

1. **Caching Layer**
   - Add Redis cache for frequently accessed queries
   - Cache provider responses for common searches

2. **Background Processing**
   - Queue popular queries for pre-computation
   - Warm cache during low-traffic periods

3. **CDN for Static Content**
   - Cache formatted responses at edge locations

4. **Database Optimizations**
   - Add composite indexes for common query patterns
   - Consider read replicas for high traffic

5. **API Rate Limiting Intelligence**
   - Implement adaptive batch sizes based on API response times
   - Add circuit breakers for failing providers

## Testing Performance

```bash
# Test with curl and time
time curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "best wireless headphones 2024"}'

# Run multiple tests
npm run test -- tests/test-full-pipeline.js
```

## Rollback Plan

If you experience issues, you can revert to safer settings:

```bash
REQUEST_TIMEOUT=30000
REDDIT_BATCH_SIZE=3
REDDIT_MAX_SUBREDDITS=15
MAX_YOUTUBE_RESULTS=10
MAX_REDDIT_RESULTS=20
SOURCE_CONTENT_MAX_LENGTH=1000
```

## Summary

The optimizations focus on three key areas:
1. **Parallelization** - Run independent API calls concurrently
2. **Reduction** - Fetch fewer sources but maintain quality
3. **Efficiency** - Optimize database operations and API usage

These changes should reduce typical query times from 40 seconds to 12-17 seconds, with aggressive settings achieving 8-12 seconds.
