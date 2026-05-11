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

module.exports = router;
