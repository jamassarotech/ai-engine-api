const searchService = require('../services/search.service');
const queryRepository = require('../repositories/query.repository');
const { searchRequestSchema } = require('../utils/validators');
const logger = require('../utils/logger');
const { ValidationError } = require('../utils/errors');

/**
 * Search Controller
 * Handles HTTP requests for search endpoint
 */

/**
 * POST /api/search
 * Execute a search query
 */
async function search(req, res, next) {
  try {
    // Validate request body
    const validation = searchRequestSchema.safeParse(req.body);

    if (!validation.success) {
      const errorMessage = validation.error.issues
        .map(issue => issue.message)
        .join(', ');
      throw new ValidationError(errorMessage);
    }

    const { query, userId } = validation.data;

    // Execute search
    const result = await searchService.executeSearch(query, { userId });

    // Return success response
    res.status(200).json(result);

  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/search/:slug
 * Get search result by slug (for SEO-friendly URLs)
 */
async function getBySlug(req, res, next) {
  try {
    const { slug } = req.params;

    const result = await searchService.getSearchBySlug(slug);

    if (!result) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Search result not found',
      });
    }

    res.status(200).json(result);

  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/users/:userId/searches
 * Get user's search history
 */
async function getUserHistory(req, res, next) {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    // Validate pagination parameters
    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }

    if (offset < 0) {
      throw new ValidationError('Offset must be non-negative');
    }

    // Fetch user's search history
    const result = await queryRepository.findByUserId(userId, limit, offset);

    res.status(200).json({
      userId,
      searches: result.queries,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    });

  } catch (error) {
    next(error);
  }
}

module.exports = {
  search,
  getBySlug,
  getUserHistory,
};
