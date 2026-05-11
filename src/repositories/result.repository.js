const { pool } = require('../db/connection');
const { DatabaseError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Result Repository
 * Handles all database operations for the 'query_results' table
 */

/**
 * Create a new query result
 * @param {Object} data - Result data
 * @param {number} data.query_id - Associated query ID
 * @param {Object} data.summary - Summary object {title, verdict}
 * @param {Array} data.pros - Array of pros
 * @param {Array} data.cons - Array of cons
 * @param {Array} data.warnings - Array of warnings
 * @param {Array} data.quotes - Array of quotes
 * @param {string} data.confidence - Confidence level (high, medium, low)
 * @param {string} data.ai_model - AI model used
 * @param {number} data.tokens_input - Input tokens
 * @param {number} data.tokens_output - Output tokens
 * @param {number} data.ai_cost - AI cost
 * @returns {Promise<Object>} Created result object
 */
async function create(data) {
  const {
    query_id,
    summary,
    pros = [],
    cons = [],
    warnings = [],
    quotes = [],
    confidence,
    ai_model,
    tokens_input,
    tokens_output,
    ai_cost,
  } = data;

  try {
    const result = await pool.query(
      `INSERT INTO query_results 
       (query_id, summary, pros_json, cons_json, warnings_json, quotes_json, 
        confidence, ai_model, tokens_input, tokens_output, ai_cost)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        query_id,
        JSON.stringify(summary),
        JSON.stringify(pros),
        JSON.stringify(cons),
        JSON.stringify(warnings),
        JSON.stringify(quotes),
        confidence,
        ai_model,
        tokens_input,
        tokens_output,
        ai_cost,
      ]
    );

    logger.debug('Query result created', { queryId: query_id, resultId: result.rows[0].id });
    return result.rows[0];
  } catch (error) {
    logger.error('Failed to create query result', { error: error.message, query_id });
    throw new DatabaseError('Failed to create query result', error);
  }
}

/**
 * Find result by query ID
 * @param {number} queryId - Query ID
 * @returns {Promise<Object|null>} Result object or null
 */
async function findByQueryId(queryId) {
  try {
    const result = await pool.query(
      `SELECT * FROM query_results WHERE query_id = $1`,
      [queryId]
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error('Failed to find result by query ID', { error: error.message, queryId });
    throw new DatabaseError('Failed to find result', error);
  }
}

/**
 * Find result by ID
 * @param {number} id - Result ID
 * @returns {Promise<Object|null>} Result object or null
 */
async function findById(id) {
  try {
    const result = await pool.query(
      `SELECT * FROM query_results WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error('Failed to find result by ID', { error: error.message, id });
    throw new DatabaseError('Failed to find result', error);
  }
}

/**
 * Update a query result
 * @param {number} queryId - Query ID
 * @param {Object} data - Updated result data
 * @returns {Promise<Object>} Updated result object
 */
async function update(queryId, data) {
  const {
    summary,
    pros,
    cons,
    warnings,
    quotes,
    confidence,
    ai_model,
    tokens_input,
    tokens_output,
    ai_cost,
  } = data;

  try {
    const result = await pool.query(
      `UPDATE query_results 
       SET summary = $1, pros_json = $2, cons_json = $3, warnings_json = $4, 
           quotes_json = $5, confidence = $6, ai_model = $7, 
           tokens_input = $8, tokens_output = $9, ai_cost = $10, generated_at = NOW()
       WHERE query_id = $11
       RETURNING *`,
      [
        JSON.stringify(summary),
        JSON.stringify(pros),
        JSON.stringify(cons),
        JSON.stringify(warnings),
        JSON.stringify(quotes),
        confidence,
        ai_model,
        tokens_input,
        tokens_output,
        ai_cost,
        queryId,
      ]
    );

    logger.debug('Query result updated', { queryId });
    return result.rows[0];
  } catch (error) {
    logger.error('Failed to update query result', { error: error.message, queryId });
    throw new DatabaseError('Failed to update query result', error);
  }
}

/**
 * Delete result by query ID
 * @param {number} queryId - Query ID
 * @returns {Promise<boolean>} True if deleted
 */
async function deleteByQueryId(queryId) {
  try {
    await pool.query(
      `DELETE FROM query_results WHERE query_id = $1`,
      [queryId]
    );

    logger.debug('Query result deleted', { queryId });
    return true;
  } catch (error) {
    logger.error('Failed to delete query result', { error: error.message, queryId });
    throw new DatabaseError('Failed to delete query result', error);
  }
}

/**
 * Get results by confidence level
 * @param {string} confidence - Confidence level (high, medium, low)
 * @param {number} limit - Number of results to fetch
 * @returns {Promise<Array>} Array of result objects
 */
async function getByConfidence(confidence, limit = 10) {
  try {
    const result = await pool.query(
      `SELECT * FROM query_results WHERE confidence = $1 ORDER BY generated_at DESC LIMIT $2`,
      [confidence, limit]
    );

    return result.rows;
  } catch (error) {
    logger.error('Failed to get results by confidence', { error: error.message, confidence });
    throw new DatabaseError('Failed to get results by confidence', error);
  }
}

module.exports = {
  create,
  findByQueryId,
  findById,
  update,
  deleteByQueryId,
  getByConfidence,
};
