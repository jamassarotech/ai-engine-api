const { pool } = require('../db/connection');
const { DatabaseError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Log Repository
 * Handles all database operations for the 'search_logs' table
 */

/**
 * Create a search log entry
 * @param {Object} data - Log data
 * @param {string} data.query - Original query
 * @param {string} data.normalized_query - Normalized query
 * @param {boolean} data.cached - Whether result was cached
 * @param {number} [data.latency_ms] - Request latency in milliseconds
 * @param {number} [data.tokens_input] - AI input tokens
 * @param {number} [data.tokens_output] - AI output tokens
 * @param {number} [data.ai_cost] - AI cost
 * @param {string} [data.error_message] - Error message if request failed
 * @returns {Promise<Object>} Created log object
 */
async function create(data) {
  const {
    query,
    normalized_query,
    cached,
    latency_ms,
    tokens_input,
    tokens_output,
    ai_cost,
    error_message,
  } = data;

  try {
    const result = await pool.query(
      `INSERT INTO search_logs 
       (query, normalized_query, cached, latency_ms, tokens_input, tokens_output, ai_cost, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [query, normalized_query, cached, latency_ms, tokens_input, tokens_output, ai_cost, error_message]
    );

    logger.debug('Search log created', { cached, latency_ms });
    return result.rows[0];
  } catch (error) {
    // Don't throw error for logging failures - just log it
    logger.error('Failed to create search log', { error: error.message });
    return null;
  }
}

/**
 * Get recent search logs
 * @param {number} limit - Number of logs to fetch
 * @returns {Promise<Array>} Array of log objects
 */
async function getRecent(limit = 50) {
  try {
    const result = await pool.query(
      `SELECT * FROM search_logs ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );

    return result.rows;
  } catch (error) {
    logger.error('Failed to get recent logs', { error: error.message });
    throw new DatabaseError('Failed to get recent logs', error);
  }
}

/**
 * Get logs by date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Array of log objects
 */
async function getByDateRange(startDate, endDate) {
  try {
    const result = await pool.query(
      `SELECT * FROM search_logs 
       WHERE created_at >= $1 AND created_at <= $2 
       ORDER BY created_at DESC`,
      [startDate, endDate]
    );

    return result.rows;
  } catch (error) {
    logger.error('Failed to get logs by date range', { error: error.message });
    throw new DatabaseError('Failed to get logs by date range', error);
  }
}

/**
 * Get cache hit statistics
 * @param {Date} [since] - Optional start date
 * @returns {Promise<Object>} Cache statistics
 */
async function getCacheStats(since = null) {
  try {
    let query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN cached = true THEN 1 ELSE 0 END) as cache_hits,
        SUM(CASE WHEN cached = false THEN 1 ELSE 0 END) as cache_misses,
        ROUND(AVG(latency_ms), 2) as avg_latency_ms
      FROM search_logs
    `;
    const params = [];

    if (since) {
      query += ` WHERE created_at >= $1`;
      params.push(since);
    }

    const result = await pool.query(query, params);
    const stats = result.rows[0];

    return {
      total: parseInt(stats.total, 10),
      cacheHits: parseInt(stats.cache_hits, 10),
      cacheMisses: parseInt(stats.cache_misses, 10),
      cacheHitRate: stats.total > 0 ? ((stats.cache_hits / stats.total) * 100).toFixed(2) : 0,
      avgLatencyMs: parseFloat(stats.avg_latency_ms) || 0,
    };
  } catch (error) {
    logger.error('Failed to get cache stats', { error: error.message });
    throw new DatabaseError('Failed to get cache stats', error);
  }
}

/**
 * Get error logs
 * @param {number} limit - Number of logs to fetch
 * @returns {Promise<Array>} Array of error log objects
 */
async function getErrors(limit = 50) {
  try {
    const result = await pool.query(
      `SELECT * FROM search_logs 
       WHERE error_message IS NOT NULL 
       ORDER BY created_at DESC 
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  } catch (error) {
    logger.error('Failed to get error logs', { error: error.message });
    throw new DatabaseError('Failed to get error logs', error);
  }
}

/**
 * Get most searched queries
 * @param {number} limit - Number of queries to return
 * @param {Date} [since] - Optional start date
 * @returns {Promise<Array>} Array of query statistics
 */
async function getTopQueries(limit = 10, since = null) {
  try {
    let query = `
      SELECT 
        normalized_query,
        COUNT(*) as search_count,
        SUM(CASE WHEN cached = true THEN 1 ELSE 0 END) as cached_count,
        ROUND(AVG(latency_ms), 2) as avg_latency_ms
      FROM search_logs
    `;
    const params = [limit];

    if (since) {
      query += ` WHERE created_at >= $2`;
      params.push(since);
    }

    query += `
      GROUP BY normalized_query
      ORDER BY search_count DESC
      LIMIT $1
    `;

    const result = await pool.query(query, params);

    return result.rows.map((row) => ({
      query: row.normalized_query,
      searchCount: parseInt(row.search_count, 10),
      cachedCount: parseInt(row.cached_count, 10),
      avgLatencyMs: parseFloat(row.avg_latency_ms) || 0,
    }));
  } catch (error) {
    logger.error('Failed to get top queries', { error: error.message });
    throw new DatabaseError('Failed to get top queries', error);
  }
}

/**
 * Get AI usage statistics
 * @param {Date} [since] - Optional start date
 * @returns {Promise<Object>} AI usage statistics
 */
async function getAIStats(since = null) {
  try {
    let query = `
      SELECT 
        COUNT(*) as requests_with_ai,
        SUM(tokens_input) as total_tokens_input,
        SUM(tokens_output) as total_tokens_output,
        SUM(ai_cost) as total_cost,
        ROUND(AVG(tokens_input), 2) as avg_tokens_input,
        ROUND(AVG(tokens_output), 2) as avg_tokens_output
      FROM search_logs
      WHERE tokens_input IS NOT NULL
    `;
    const params = [];

    if (since) {
      query += ` AND created_at >= $1`;
      params.push(since);
    }

    const result = await pool.query(query, params);
    const stats = result.rows[0];

    return {
      requestsWithAI: parseInt(stats.requests_with_ai, 10) || 0,
      totalTokensInput: parseInt(stats.total_tokens_input, 10) || 0,
      totalTokensOutput: parseInt(stats.total_tokens_output, 10) || 0,
      totalCost: parseFloat(stats.total_cost) || 0,
      avgTokensInput: parseFloat(stats.avg_tokens_input) || 0,
      avgTokensOutput: parseFloat(stats.avg_tokens_output) || 0,
    };
  } catch (error) {
    logger.error('Failed to get AI stats', { error: error.message });
    throw new DatabaseError('Failed to get AI stats', error);
  }
}

module.exports = {
  create,
  getRecent,
  getByDateRange,
  getCacheStats,
  getErrors,
  getTopQueries,
  getAIStats,
};
