const { pool } = require('../db/connection');
const { DatabaseError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Query Repository
 * Handles all database operations for the 'queries' table
 */

/**
 * Create a new query
 * @param {Object} data - Query data
 * @param {string} data.original_query - Original search query
 * @param {string} data.normalized_query - Normalized query
 * @param {string} data.slug - URL-friendly slug
 * @param {string} data.query_type - Type of query (product, comparison, etc.)
 * @param {string} [data.status='completed'] - Query status
 * @param {string} [data.user_id] - User ID from frontend localStorage
 * @returns {Promise<Object>} Created query object
 */
async function create(data) {
  const { original_query, normalized_query, slug, query_type, status = 'completed', user_id } = data;

  try {
    const result = await pool.query(
      `INSERT INTO queries (original_query, normalized_query, slug, query_type, status, user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [original_query, normalized_query, slug, query_type, status, user_id]
    );

    logger.debug('Query created', { queryId: result.rows[0].id, slug });
    return result.rows[0];
  } catch (error) {
    logger.error('Failed to create query', { error: error.message });
    throw new DatabaseError('Failed to create query', error);
  }
}

/**
 * Find or create query (upsert) - returns existing query or creates new one
 * @param {Object} data - Query data
 * @returns {Promise<Object>} Query object with isNew flag
 */
async function findOrCreate(data) {
  const { original_query, normalized_query, slug, query_type, status = 'completed', user_id } = data;

  try {
    // First, try to find by slug
    const existing = await findBySlug(slug);
    
    if (existing) {
      logger.debug('Query found by slug', { queryId: existing.id, slug });
      // Update the existing query with new data
      const result = await pool.query(
        `UPDATE queries 
         SET original_query = $1, 
             normalized_query = $2, 
             query_type = $3, 
             status = $4,
             user_id = $5,
             updated_at = NOW()
         WHERE slug = $6
         RETURNING *`,
        [original_query, normalized_query, query_type, status, user_id, slug]
      );
      
      return {
        query: result.rows[0],
        isNew: false,
      };
    }

    // If not found, create new
    const result = await pool.query(
      `INSERT INTO queries (original_query, normalized_query, slug, query_type, status, user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [original_query, normalized_query, slug, query_type, status, user_id]
    );

    logger.debug('Query created', { queryId: result.rows[0].id, slug });
    return {
      query: result.rows[0],
      isNew: true,
    };
  } catch (error) {
    logger.error('Failed to find or create query', { error: error.message, slug });
    throw new DatabaseError('Failed to find or create query', error);
  }
}

/**
 * Find query by normalized query string
 * @param {string} normalizedQuery - Normalized query string
 * @returns {Promise<Object|null>} Query object or null
 */
async function findByNormalizedQuery(normalizedQuery) {
  try {
    const result = await pool.query(
      `SELECT * FROM queries WHERE normalized_query = $1 ORDER BY created_at DESC LIMIT 1`,
      [normalizedQuery]
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error('Failed to find query by normalized query', { error: error.message });
    throw new DatabaseError('Failed to find query', error);
  }
}

/**
 * Find query by slug
 * @param {string} slug - URL slug
 * @returns {Promise<Object|null>} Query object or null
 */
async function findBySlug(slug) {
  try {
    const result = await pool.query(
      `SELECT * FROM queries WHERE slug = $1`,
      [slug]
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error('Failed to find query by slug', { error: error.message });
    throw new DatabaseError('Failed to find query', error);
  }
}

/**
 * Find query by ID
 * @param {number} id - Query ID
 * @returns {Promise<Object|null>} Query object or null
 */
async function findById(id) {
  try {
    const result = await pool.query(
      `SELECT * FROM queries WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error('Failed to find query by ID', { error: error.message, id });
    throw new DatabaseError('Failed to find query', error);
  }
}

/**
 * Update query status
 * @param {number} id - Query ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated query object
 */
async function updateStatus(id, status) {
  try {
    const result = await pool.query(
      `UPDATE queries SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );

    logger.debug('Query status updated', { queryId: id, status });
    return result.rows[0];
  } catch (error) {
    logger.error('Failed to update query status', { error: error.message, id });
    throw new DatabaseError('Failed to update query status', error);
  }
}

/**
 * Get recent queries
 * @param {number} limit - Number of queries to fetch
 * @returns {Promise<Array>} Array of query objects
 */
async function getRecent(limit = 10) {
  try {
    const result = await pool.query(
      `SELECT * FROM queries ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );

    return result.rows;
  } catch (error) {
    logger.error('Failed to get recent queries', { error: error.message });
    throw new DatabaseError('Failed to get recent queries', error);
  }
}

/**
 * Get queries by type
 * @param {string} queryType - Query type
 * @param {number} limit - Number of queries to fetch
 * @returns {Promise<Array>} Array of query objects
 */
async function getByType(queryType, limit = 10) {
  try {
    const result = await pool.query(
      `SELECT * FROM queries WHERE query_type = $1 ORDER BY created_at DESC LIMIT $2`,
      [queryType, limit]
    );

    return result.rows;
  } catch (error) {
    logger.error('Failed to get queries by type', { error: error.message, queryType });
    throw new DatabaseError('Failed to get queries by type', error);
  }
}

/**
 * Get queries by user ID (for user search history)
 * @param {string} userId - User ID from frontend localStorage
 * @param {number} limit - Number of queries to fetch (default: 20)
 * @param {number} offset - Pagination offset (default: 0)
 * @returns {Promise<Object>} Object with queries array and total count
 */
async function findByUserId(userId, limit = 20, offset = 0) {
  try {
    // Get total count for pagination
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM queries WHERE user_id = $1`,
      [userId]
    );

    // Get paginated queries
    const queriesResult = await pool.query(
      `SELECT id, original_query, normalized_query, slug, query_type, status, created_at, updated_at
       FROM queries 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    logger.debug('Queries fetched for user', { 
      userId, 
      count: queriesResult.rows.length,
      total: countResult.rows[0].total 
    });

    return {
      queries: queriesResult.rows,
      total: parseInt(countResult.rows[0].total, 10),
      limit,
      offset,
    };
  } catch (error) {
    logger.error('Failed to get queries by user ID', { error: error.message, userId });
    throw new DatabaseError('Failed to get queries by user ID', error);
  }
}

module.exports = {
  create,
  findOrCreate,
  findByNormalizedQuery,
  findBySlug,
  findById,
  updateStatus,
  getRecent,
  getByType,
  findByUserId,
};
