# Cache Bug Fix - Duplicate Key Error

## Problem Identified

From the production logs:
```
[info]: Cache hit - queryId:6, sourceCount:55
[info]: Cache miss - fetching fresh data
[error]: duplicate key value violates unique constraint "queries_slug_key"
```

### Root Cause

1. **Cache exists but is expired** (older than 24 hours)
2. System finds the cached query: `Cache hit`
3. But `isCacheValid()` returns false due to age
4. System treats it as cache miss and re-fetches data (~18 seconds wasted)
5. Tries to INSERT new query with same slug
6. **💥 Database constraint violation: slug must be unique**

### Impact

- ❌ 500 errors for queries that already exist
- ⏱️ ~15-20 seconds wasted re-fetching data that's being refreshed
- 💰 Unnecessary API costs (YouTube, Reddit, OpenAI)
- 😞 Poor user experience

## Solution Implemented

### 1. Added `findOrCreate` Method to Query Repository

**File:** [src/repositories/query.repository.js](src/repositories/query.repository.js)

```javascript
/**
 * Find or create query (upsert) - returns existing query or creates new one
 */
async function findOrCreate(data) {
  // First, try to find by slug
  const existing = await findBySlug(slug);
  
  if (existing) {
    // Update the existing query
    // Returns { query, isNew: false }
  } else {
    // Create new query
    // Returns { query, isNew: true }
  }
}
```

**Benefits:**
- Gracefully handles duplicate slugs
- Updates existing queries instead of failing
- Returns flag indicating if query is new or updated

### 2. Updated `storeSearchResult` to Handle Updates

**File:** [src/services/search.service.js](src/services/search.service.js)

**Before:**
```javascript
// Always try to create new query
const query = await queryRepository.create({...}); // ❌ Fails on duplicate
```

**After:**
```javascript
// Find or create (upsert)
const { query, isNew } = await queryRepository.findOrCreate({...});

// If updating existing query, delete old data first
if (!isNew) {
  await Promise.all([
    sourceRepository.deleteByQueryId(query.id),
    resultRepository.deleteByQueryId(query.id),
  ]);
}

// Store new sources and result
```

**Benefits:**
- No more duplicate key errors
- Refreshes old cached data automatically
- Clean update: removes old sources/results before storing new ones

## How It Works Now

### Scenario 1: New Query (First Time)
```
1. Query: "best headphones 2024"
2. Cache check: Not found
3. Fetch fresh data (~15s)
4. findOrCreate: Creates new query (isNew=true)
5. Store sources and result
✅ Success!
```

### Scenario 2: Cached Query (Valid, < 24 hours)
```
1. Query: "best headphones 2024"
2. Cache check: Found, valid (< 24 hours)
3. Return cached data immediately (~50ms)
✅ Fast! No API calls needed
```

### Scenario 3: Expired Cache (> 24 hours) - THE BUG
```
BEFORE (Bug):
1. Query: "best headphones 2024"
2. Cache check: Found but expired
3. Fetch fresh data (~15s)
4. Try to INSERT with same slug
❌ Duplicate key error!

AFTER (Fixed):
1. Query: "best headphones 2024"  
2. Cache check: Found but expired
3. Fetch fresh data (~15s)
4. findOrCreate: Finds existing query (isNew=false)
5. Delete old sources and result
6. Store new sources and result
✅ Updated successfully!
```

## Database Behavior

### The UNIQUE Constraint
```sql
CREATE TABLE queries (
  slug VARCHAR(200) NOT NULL UNIQUE  -- This prevents duplicates
);
```

### What Happens on Update
```sql
-- Step 1: Find existing
SELECT * FROM queries WHERE slug = 'best-headphones-2024';
-- Returns: id=6, created_at=2024-04-10

-- Step 2: Update query metadata
UPDATE queries SET ... WHERE slug = 'best-headphones-2024';

-- Step 3: Delete old associations (CASCADE in schema handles this)
DELETE FROM sources WHERE query_id = 6;
DELETE FROM query_results WHERE query_id = 6;

-- Step 4: Insert fresh sources and result
INSERT INTO sources (query_id=6, ...) VALUES (...);
INSERT INTO query_results (query_id=6, ...) VALUES (...);
```

## Testing

### Manual Test
```bash
# First request - creates new query
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "best portable dishwasher 2024"}'
# ✅ Should succeed

# Wait 25 hours (or manually update created_at in DB to be > 24h ago)

# Second request - should update existing query
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "best portable dishwasher 2024"}'
# ✅ Should succeed (no duplicate error)
```

### Check Logs
Look for these messages:
```
[debug]: Query found by slug - queryId:6
[debug]: Updating existing query, deleting old data - queryId:6
[info]: Search result stored - queryId:6, resultId:X, isUpdate:true
```

## Additional Benefits

1. **Automatic Cache Refresh**
   - Old queries (> 24h) automatically get fresh data
   - No manual cache invalidation needed

2. **Idempotent Operations**
   - Running the same query multiple times is safe
   - No duplicate records

3. **Data Consistency**
   - Old sources are removed before new ones are added
   - No orphaned or conflicting data

## Files Modified

1. ✅ [src/repositories/query.repository.js](src/repositories/query.repository.js)
   - Added `findOrCreate()` method
   - Exported new method

2. ✅ [src/services/search.service.js](src/services/search.service.js)
   - Updated `storeSearchResult()` to use `findOrCreate()`
   - Added cleanup logic for existing queries

3. ℹ️ [src/repositories/source.repository.js](src/repositories/source.repository.js)
   - Already had `deleteByQueryId()` method (no changes needed)

4. ℹ️ [src/repositories/result.repository.js](src/repositories/result.repository.js)
   - Already had `deleteByQueryId()` method (no changes needed)

## No Migration Needed

✅ No database schema changes required
✅ Works with existing database structure
✅ Safe to deploy immediately

## Performance Impact

### Before (With Bug)
- New queries: ~15-20s ✅ Works
- Cached queries (< 24h): ~50ms ✅ Works
- Expired queries (> 24h): ❌ **500 Error**

### After (Fixed)
- New queries: ~15-20s ✅ Works
- Cached queries (< 24h): ~50ms ✅ Works
- Expired queries (> 24h): ~15-20s ✅ **Now Works!**

## Deployment

```bash
# Pull latest changes
git pull origin main

# Restart application
# (Method depends on your hosting - Railway, PM2, Docker, etc.)

# No database migrations needed
```

That's it! The bug is fixed. 🎉
