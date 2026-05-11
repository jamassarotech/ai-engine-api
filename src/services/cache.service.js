const queryRepository = require('../repositories/query.repository');
const resultRepository = require('../repositories/result.repository');
const sourceRepository = require('../repositories/source.repository');
const logger = require('../utils/logger');
const { CacheError } = require('../utils/errors');

/**
 * Cache Service
 * Handles cache lookup and result retrieval from database
 */

/**
 * Check if a query result is cached and return it
 * @param {string} normalizedQuery - Normalized query string
 * @returns {Promise<Object|null>} Cached result or null
 */
async function getCachedResult(normalizedQuery) {
  try {
    logger.debug('Checking cache', { normalizedQuery });

    // Find query by normalized string
    const query = await queryRepository.findByNormalizedQuery(normalizedQuery);

    if (!query) {
      logger.debug('Cache miss - query not found', { normalizedQuery });
      return null;
    }

    // Check if query is completed
    if (query.status !== 'completed') {
      logger.debug('Query exists but not completed', { queryId: query.id, status: query.status });
      return null;
    }

    // Get result
    const result = await resultRepository.findByQueryId(query.id);

    if (!result) {
      logger.warn('Query exists but no result found', { queryId: query.id });
      return null;
    }

    // Get sources
    const sources = await sourceRepository.findByQueryId(query.id);

    logger.info('Cache hit', {
      queryId: query.id,
      normalized: normalizedQuery,
      sourceCount: sources.length,
    });

    return {
      query,
      result,
      sources,
      cached: true,
    };
  } catch (error) {
    logger.error('Cache lookup failed', { error: error.message, normalizedQuery });
    // Don't throw - allow fallback to fresh fetch
    // throw new CacheError('Failed to check cache', error);
    return null;
  }
}

/**
 * Get cached result by slug
 * @param {string} slug - URL slug
 * @returns {Promise<Object|null>} Cached result or null
 */
async function getCachedResultBySlug(slug) {
  try {
    logger.debug('Checking cache by slug', { slug });

    const query = await queryRepository.findBySlug(slug);

    if (!query) {
      logger.debug('Cache miss - slug not found', { slug });
      return null;
    }

    if (query.status !== 'completed') {
      logger.debug('Query exists but not completed', { queryId: query.id, status: query.status });
      return null;
    }

    const result = await resultRepository.findByQueryId(query.id);
    const sources = await sourceRepository.findByQueryId(query.id);

    if (!result) {
      return null;
    }

    logger.info('Cache hit by slug', { queryId: query.id, slug });

    return {
      query,
      result,
      sources,
      cached: true,
    };
  } catch (error) {
    logger.error('Cache lookup by slug failed', { error: error.message, slug });
    return null;
  }
}

/**
 * Check if cache should be invalidated (age-based)
 * @param {Object} cachedResult - Cached result object
 * @param {number} maxAgeHours - Maximum age in hours (default: 24)
 * @returns {boolean} True if cache is still valid
 */
function isCacheValid(cachedResult, maxAgeHours = 24) {
  if (!cachedResult || !cachedResult.query) {
    return false;
  }

  const createdAt = new Date(cachedResult.query.created_at);
  const now = new Date();
  const ageHours = (now - createdAt) / (1000 * 60 * 60);

  const isValid = ageHours < maxAgeHours;

  logger.debug('Cache validity check', {
    queryId: cachedResult.query.id,
    ageHours: ageHours.toFixed(2),
    maxAgeHours,
    isValid,
  });

  return isValid;
}

/**
 * Get cache statistics for a query
 * @param {string} normalizedQuery - Normalized query
 * @returns {Promise<Object>} Cache statistics
 */
async function getCacheStats(normalizedQuery) {
  try {
    const query = await queryRepository.findByNormalizedQuery(normalizedQuery);

    if (!query) {
      return {
        exists: false,
        hitCount: 0,
        lastAccessed: null,
      };
    }

    return {
      exists: true,
      hitCount: 1, // TODO: Track actual hit count if needed
      lastAccessed: query.created_at,
      status: query.status,
    };
  } catch (error) {
    logger.error('Failed to get cache stats', { error: error.message });
    return null;
  }
}

module.exports = {
  getCachedResult,
  getCachedResultBySlug,
  isCacheValid,
  getCacheStats,
};
