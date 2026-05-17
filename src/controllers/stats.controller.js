const costMonitorService = require("../services/cost-monitor.service");
const logRepository = require("../repositories/log.repository");
const logger = require("../utils/logger");

/**
 * Stats Controller
 * Handles requests for statistics and monitoring
 */

/**
 * Get comprehensive cost statistics
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getCostStats(req, res) {
  try {
    const stats = await costMonitorService.getCostStats();

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to get cost stats", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Failed to retrieve cost statistics",
      message: error.message,
    });
  }
}

/**
 * Get budget status
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getBudgetStatus(req, res) {
  try {
    const dailyBudget = await costMonitorService.checkBudget("daily");
    const monthlyBudget = await costMonitorService.checkBudget("monthly");

    res.json({
      success: true,
      data: {
        daily: dailyBudget,
        monthly: monthlyBudget,
        alert:
          dailyBudget.exceeded || monthlyBudget.exceeded
            ? "Budget limit exceeded"
            : dailyBudget.nearingLimit || monthlyBudget.nearingLimit
              ? "Approaching budget limit"
              : "Within budget",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to get budget status", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Failed to retrieve budget status",
      message: error.message,
    });
  }
}

/**
 * Get recent logs
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getRecentLogs(req, res) {
  try {
    const limit = parseInt(req.query.limit || "50", 10);
    const logs = await logRepository.getRecent(limit);

    res.json({
      success: true,
      data: logs,
      count: logs.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to get recent logs", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Failed to retrieve logs",
      message: error.message,
    });
  }
}

/**
 * Get top queries
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getTopQueries(req, res) {
  try {
    const limit = parseInt(req.query.limit || "10", 10);
    const queries = await logRepository.getTopQueries(limit);

    res.json({
      success: true,
      data: queries,
      count: queries.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to get top queries", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Failed to retrieve top queries",
      message: error.message,
    });
  }
}

/**
 * Get error logs
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getErrors(req, res) {
  try {
    const limit = parseInt(req.query.limit || "50", 10);
    const errors = await logRepository.getErrors(limit);

    res.json({
      success: true,
      data: errors,
      count: errors.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to get error logs", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Failed to retrieve error logs",
      message: error.message,
    });
  }
}

module.exports = {
  getCostStats,
  getBudgetStatus,
  getRecentLogs,
  getTopQueries,
  getErrors,
};
