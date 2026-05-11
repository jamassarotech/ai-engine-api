const { pool } = require('../db/connection');
const { DatabaseError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Source Repository
 * Handles all database operations for the 'sources' table
 */

/**
 * Create a single source
 * @param {Object} data - Source data
 * @param {number} data.query_id - Associated query ID
 * @param {string} data.source_type - Type (youtube, reddit)
 * @param {string} data.title - Source title
 * @param {string} data.url - Source URL
 * @param {string} [data.author] - Author/channel name
 * @param {Date} [data.published_at] - Publication date
 * @param {string} [data.text] - Source text content
 * @param {number} [data.score] - Score (views, upvotes)
 * @returns {Promise<Object>} Created source object
 */
async function create(data) {
  const { query_id, source_type, title, url, author, published_at, text, score } = data;

  try {
    const result = await pool.query(
      `INSERT INTO sources (query_id, source_type, title, url, author, published_at, text, score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [query_id, source_type, title, url, author, published_at, text, score]
    );

    logger.debug('Source created', { queryId: query_id, sourceType: source_type });
    return result.rows[0];
  } catch (error) {
    logger.error('Failed to create source', { error: error.message, query_id });
    throw new DatabaseError('Failed to create source', error);
  }
}

/**
 * Create multiple sources in bulk
 * @param {Array<Object>} sources - Array of source objects
 * @returns {Promise<Array>} Array of created source objects
 */
async function bulkCreate(sources) {
  if (!sources || sources.length === 0) {
    return [];
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const createdSources = [];

    for (const source of sources) {
      const { query_id, source_type, title, url, author, published_at, text, score } = source;

      const result = await client.query(
        `INSERT INTO sources (query_id, source_type, title, url, author, published_at, text, score)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [query_id, source_type, title, url, author, published_at, text, score]
      );

      createdSources.push(result.rows[0]);
    }

    await client.query('COMMIT');

    logger.debug('Bulk sources created', { count: createdSources.length, queryId: sources[0]?.query_id });
    return createdSources;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to bulk create sources', { error: error.message });
    throw new DatabaseError('Failed to bulk create sources', error);
  } finally {
    client.release();
  }
}

/**
 * Find all sources by query ID
 * @param {number} queryId - Query ID
 * @returns {Promise<Array>} Array of source objects
 */
async function findByQueryId(queryId) {
  try {
    const result = await pool.query(
      `SELECT * FROM sources WHERE query_id = $1 ORDER BY created_at DESC`,
      [queryId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Failed to find sources by query ID', { error: error.message, queryId });
    throw new DatabaseError('Failed to find sources', error);
  }
}

/**
 * Find sources by query ID and type
 * @param {number} queryId - Query ID
 * @param {string} sourceType - Source type (youtube, reddit)
 * @returns {Promise<Array>} Array of source objects
 */
async function findByQueryIdAndType(queryId, sourceType) {
  try {
    const result = await pool.query(
      `SELECT * FROM sources WHERE query_id = $1 AND source_type = $2 ORDER BY score DESC`,
      [queryId, sourceType]
    );

    return result.rows;
  } catch (error) {
    logger.error('Failed to find sources by type', { error: error.message, queryId, sourceType });
    throw new DatabaseError('Failed to find sources', error);
  }
}

/**
 * Find source by ID
 * @param {number} id - Source ID
 * @returns {Promise<Object|null>} Source object or null
 */
async function findById(id) {
  try {
    const result = await pool.query(
      `SELECT * FROM sources WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error('Failed to find source by ID', { error: error.message, id });
    throw new DatabaseError('Failed to find source', error);
  }
}

/**
 * Count sources by query ID
 * @param {number} queryId - Query ID
 * @returns {Promise<number>} Source count
 */
async function countByQueryId(queryId) {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM sources WHERE query_id = $1`,
      [queryId]
    );

    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    logger.error('Failed to count sources', { error: error.message, queryId });
    throw new DatabaseError('Failed to count sources', error);
  }
}

/**
 * Delete all sources for a query
 * @param {number} queryId - Query ID
 * @returns {Promise<boolean>} True if deleted
 */
async function deleteByQueryId(queryId) {
  try {
    await pool.query(
      `DELETE FROM sources WHERE query_id = $1`,
      [queryId]
    );

    logger.debug('Sources deleted', { queryId });
    return true;
  } catch (error) {
    logger.error('Failed to delete sources', { error: error.message, queryId });
    throw new DatabaseError('Failed to delete sources', error);
  }
}

/**
 * Get top sources by score
 * @param {number} queryId - Query ID
 * @param {number} limit - Number of sources to fetch
 * @returns {Promise<Array>} Array of top source objects
 */
async function getTopByScore(queryId, limit = 5) {
  try {
    const result = await pool.query(
      `SELECT * FROM sources WHERE query_id = $1 ORDER BY score DESC NULLS LAST LIMIT $2`,
      [queryId, limit]
    );

    return result.rows;
  } catch (error) {
    logger.error('Failed to get top sources', { error: error.message, queryId });
    throw new DatabaseError('Failed to get top sources', error);
  }
}

module.exports = {
  create,
  bulkCreate,
  findByQueryId,
  findByQueryIdAndType,
  findById,
  countByQueryId,
  deleteByQueryId,
  getTopByScore,
};
