# User ID Implementation - Backend Complete ✅

## Overview
Added `userId` support to enable frontend-based user search history tracking. Users get a UUID stored in browser localStorage that is sent with each search request.

---

## Implementation Summary

### 1. ✅ Database Migration
**File:** `src/db/migrations/002_add_user_id_to_queries.sql`

```sql
-- Added user_id column (nullable, VARCHAR(255))
ALTER TABLE queries ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);

-- Indexes for performance
CREATE INDEX idx_queries_user_id ON queries(user_id);
CREATE INDEX idx_queries_user_created ON queries(user_id, created_at DESC);
```

**To Run Migration:**
```bash
npm run migrate
```

---

### 2. ✅ Repository Layer
**File:** `src/repositories/query.repository.js`

**Updated Methods:**
- `create(data)` - Now accepts optional `user_id` parameter
- `findOrCreate(data)` - Now accepts and updates `user_id`

**New Method:**
```javascript
findByUserId(userId, limit = 20, offset = 0)
```
Returns:
```json
{
  "queries": [...],
  "total": 45,
  "limit": 20,
  "offset": 0
}
```

---

### 3. ✅ Service Layer
**File:** `src/services/search.service.js`

**Updated:**
- `executeSearch(rawQuery, options)` - Now accepts `userId` in options
- `storeSearchResult()` - Now accepts and stores `userId` with queries

---

### 4. ✅ Controller Layer
**File:** `src/controllers/search.controller.js`

**Updated:**
- `search()` - Extracts `userId` from request body and passes to service

**New Endpoint:**
```javascript
getUserHistory(req, res, next)
```
Handles: `GET /api/users/:userId/searches?limit=20&offset=0`

---

### 5. ✅ Routes
**File:** `src/routes/search.routes.js`

**New Route:**
```javascript
GET /api/users/:userId/searches
```

Query parameters:
- `limit` (optional): 1-100, default 20
- `offset` (optional): default 0

---

### 6. ✅ Validation
**File:** `src/utils/validators.js`

**Updated Schema:**
```javascript
const searchRequestSchema = z.object({
  query: z.string().min(3).max(500).trim(),
  userId: z.string().regex(UUID_V4_REGEX).optional()
});
```

Validates that `userId` is a proper UUID v4 format.

---

## API Usage

### 1. Search with User ID

**POST /api/search**

```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "is lg c4 worth it",
    "userId": "550e8400-e29b-11d4-a716-446655440000"
  }'
```

**Response:** (Same as before, but query is now associated with user)

### 2. Get User Search History

**GET /api/users/:userId/searches**

```bash
curl http://localhost:3000/api/users/550e8400-e29b-11d4-a716-446655440000/searches?limit=20&offset=0
```

**Response:**
```json
{
  "userId": "550e8400-e29b-11d4-a716-446655440000",
  "searches": [
    {
      "id": 123,
      "original_query": "is lg c4 worth it",
      "normalized_query": "lg c4 worth it",
      "slug": "is-lg-c4-worth-it",
      "query_type": "product",
      "status": "completed",
      "created_at": "2026-05-17T10:30:00.000Z",
      "updated_at": "2026-05-17T10:30:00.000Z"
    },
    {
      "id": 122,
      "original_query": "best budget laptop 2026",
      "normalized_query": "best budget laptop 2026",
      "slug": "best-budget-laptop-2026",
      "query_type": "best",
      "status": "completed",
      "created_at": "2026-05-17T09:15:00.000Z",
      "updated_at": "2026-05-17T09:15:00.000Z"
    }
  ],
  "total": 45,
  "limit": 20,
  "offset": 0
}
```

---

## Frontend Implementation Guide

### Generate and Store User ID

```javascript
// utils/userId.js
export function getUserId() {
  let userId = localStorage.getItem('userId');
  
  if (!userId) {
    // Use crypto API for secure random UUID
    userId = crypto.randomUUID(); // Native browser API
    localStorage.setItem('userId', userId);
  }
  
  return userId;
}
```

### Make Search Request

```javascript
import { getUserId } from './utils/userId';

async function search(query) {
  const response = await fetch('/api/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      userId: getUserId()
    })
  });
  
  return response.json();
}
```

### Fetch User History

```javascript
import { getUserId } from './utils/userId';

async function getUserHistory(limit = 20, offset = 0) {
  const userId = getUserId();
  const response = await fetch(
    `/api/users/${userId}/searches?limit=${limit}&offset=${offset}`
  );
  
  return response.json();
}

// Usage
const history = await getUserHistory();
console.log(`You have ${history.total} searches`);
history.searches.forEach(search => {
  console.log(`- ${search.original_query} (${search.created_at})`);
});
```

---

## Testing

### 1. Run Migration
```bash
npm run migrate
```

### 2. Test Search with User ID
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "best budget headphones",
    "userId": "550e8400-e29b-11d4-a716-446655440000"
  }'
```

### 3. Test Get History
```bash
curl http://localhost:3000/api/users/550e8400-e29b-11d4-a716-446655440000/searches
```

### 4. Test Pagination
```bash
curl "http://localhost:3000/api/users/550e8400-e29b-11d4-a716-446655440000/searches?limit=5&offset=0"
```

---

## Key Features

✅ **Backward Compatible** - `userId` is optional, existing code works without changes
✅ **Privacy-Friendly** - No PII stored, just product search queries
✅ **Fast Queries** - Optimized with composite indexes
✅ **Pagination** - Supports large search histories
✅ **Validation** - UUID v4 format enforced
✅ **Clean API** - RESTful design

---

## Next Steps for Frontend

1. Implement UUID generation on first visit
2. Store UUID in localStorage
3. Send userId with all search requests
4. Build search history UI component
5. Add "Clear History" feature (optional)
6. Consider export history feature (optional)

---

## Performance Notes

- Indexes on `user_id` and `(user_id, created_at)` ensure fast lookups
- History queries return latest searches first (DESC order)
- Pagination prevents loading too much data at once
- No joins required - simple, fast queries

---

## Security Considerations

✅ **Low Risk** - Only product queries stored (not PII)
✅ **No Authentication Required** - Appropriate for this use case
✅ **UUID Validation** - Prevents injection attacks
✅ **Rate Limiting** - Consider adding in future if needed

---

**Implementation Date:** May 17, 2026
**Status:** ✅ Complete - Ready for Frontend Integration
