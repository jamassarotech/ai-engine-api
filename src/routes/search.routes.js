const express = require('express');
const searchController = require('../controllers/search.controller');

const router = express.Router();

/**
 * POST /api/search
 * Execute a search query
 * 
 * Request body:
 * {
 *   "query": "is lg c4 worth it"
 * }
 * 
 * Response:
 * {
 *   "query": "is lg c4 worth it",
 *   "metadata": { ... },
 *   "summary": { ... },
 *   "pros": [ ... ],
 *   "cons": [ ... ],
 *   "warnings": [ ... ],
 *   "quotes": [ ... ],
 *   "sources": { ... }
 * }
 */
router.post('/search', searchController.search);

/**
 * GET /api/search/:slug
 * Get cached search result by slug
 * 
 * Example: GET /api/search/is-lg-c4-worth-it
 */
router.get('/search/:slug', searchController.getBySlug);

/**
 * GET /api/users/:userId/searches
 * Get user's search history
 * 
 * Query params:
 * - limit: Number of results (1-100, default: 20)
 * - offset: Pagination offset (default: 0)
 * 
 * Example: GET /api/users/550e8400-e29b-11d4-a716-446655440000/searches?limit=20&offset=0
 * 
 * Response:
 * {
 *   "userId": "550e8400-e29b-11d4-a716-446655440000",
 *   "searches": [
 *     {
 *       "id": 123,
 *       "original_query": "is lg c4 worth it",
 *       "slug": "is-lg-c4-worth-it",
 *       "query_type": "product",
 *       "created_at": "2026-05-17T10:30:00Z"
 *     }
 *   ],
 *   "total": 45,
 *   "limit": 20,
 *   "offset": 0
 * }
 */
router.get('/users/:userId/searches', searchController.getUserHistory);

module.exports = router;
