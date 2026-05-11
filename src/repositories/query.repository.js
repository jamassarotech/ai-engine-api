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
 * @returns {Promise<Object>} Created query object
 */
async function create(data) {
  const { original_query, normalized_query, slug, query_type, status = 'completed' } = data;

  try {
    const result = await pool.query(
      `INSERT INTO queries (original_query, normalized_query, slug, query_type, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [original_query, normalized_query, slug, query_type, status]
    );

    logger.debug('Query created', { queryId: result.rows[0].id, slug });
    return result.rows[0];
  } catch (error) {
    logger.error('Failed to create query', { error: error.message });
    throw new DatabaseError('Failed to create query', error);
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

module.exports = {
  create,
  findByNormalizedQuery,
  findBySlug,
  findById,
  updateStatus,
  getRecent,
  getByType,
};
