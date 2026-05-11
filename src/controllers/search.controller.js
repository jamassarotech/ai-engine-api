const searchService = require('../services/search.service');
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

    const { query } = validation.data;

    // Execute search
    const result = await searchService.executeSearch(query);

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

module.exports = {
  search,
  getBySlug,
};
