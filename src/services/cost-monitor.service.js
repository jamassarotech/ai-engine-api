const logRepository = require("../repositories/log.repository");
const logger = require("../utils/logger");
const config = require("../config");

/**
 * Cost Monitor Service
 * Monitors and enforces budget limits for OpenAI API usage
 */

/**
 * Check if budget limit is exceeded
 * @param {string} period - 'daily' or 'monthly'
 * @returns {Promise<Object>} Budget status
 */
async function checkBudget(period = "daily") {
  if (!config.enableCostLimits) {
    return {
      exceeded: false,
      withinLimit: true,
      message: "Cost limits disabled",
    };
  }

  try {
    const now = new Date();
    let since;
    let budgetLimit;

    if (period === "daily") {
      // Start of today (midnight)
      since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      budgetLimit = config.dailyBudgetUSD;
    } else if (period === "monthly") {
      // Start of this month
      since = new Date(now.getFullYear(), now.getMonth(), 1);
      budgetLimit = config.monthlyBudgetUSD;
    } else {
      throw new Error('Invalid period. Use "daily" or "monthly"');
    }

    // Get AI usage stats for the period
    const stats = await logRepository.getAIStats(since);
    const currentCost = stats.totalCost || 0;
    const percentUsed = (currentCost / budgetLimit) * 100;
    const remaining = budgetLimit - currentCost;

    const exceeded = currentCost >= budgetLimit;
    const withinLimit = currentCost < budgetLimit;
    const nearingLimit = percentUsed >= config.costAlertThreshold * 100;

    // Log warnings
    if (exceeded) {
      logger.warn("Budget exceeded!", {
        period,
        currentCost: currentCost.toFixed(4),
        budgetLimit: budgetLimit.toFixed(2),
        percentUsed: percentUsed.toFixed(1),
      });
    } else if (nearingLimit) {
      logger.warn("Approaching budget limit", {
        period,
        currentCost: currentCost.toFixed(4),
        budgetLimit: budgetLimit.toFixed(2),
        percentUsed: percentUsed.toFixed(1),
        remaining: remaining.toFixed(4),
      });
    }

    return {
      period,
      currentCost,
      budgetLimit,
      remaining,
      percentUsed,
      exceeded,
      withinLimit,
      nearingLimit,
      message: exceeded
        ? `${period.charAt(0).toUpperCase() + period.slice(1)} budget exceeded`
        : withinLimit
          ? `Within ${period} budget`
          : "Unknown status",
    };
  } catch (error) {
    logger.error("Failed to check budget", { error: error.message, period });
    // On error, allow requests but log the issue
    return { exceeded: false, withinLimit: true, error: error.message };
  }
}

/**
 * Check if a new request should be allowed based on budget
 * @returns {Promise<Object>} Authorization result
 */
async function authorizeRequest() {
  if (!config.enableCostLimits) {
    return { authorized: true, message: "Cost limits disabled" };
  }

  try {
    // Check daily budget first (more restrictive)
    const dailyBudget = await checkBudget("daily");

    if (dailyBudget.exceeded) {
      return {
        authorized: false,
        reason: "daily_budget_exceeded",
        message: "Daily AI budget limit exceeded. Please try again tomorrow.",
        budgetInfo: dailyBudget,
      };
    }

    // Check monthly budget
    const monthlyBudget = await checkBudget("monthly");

    if (monthlyBudget.exceeded) {
      return {
        authorized: false,
        reason: "monthly_budget_exceeded",
        message: "Monthly AI budget limit exceeded. Please contact support.",
        budgetInfo: monthlyBudget,
      };
    }

    // Log warnings if nearing limits
    if (dailyBudget.nearingLimit || monthlyBudget.nearingLimit) {
      logger.warn("Request authorized but nearing budget limits", {
        dailyPercent: dailyBudget.percentUsed.toFixed(1),
        monthlyPercent: monthlyBudget.percentUsed.toFixed(1),
      });
    }

    return {
      authorized: true,
      message: "Within budget limits",
      budgetInfo: {
        daily: dailyBudget,
        monthly: monthlyBudget,
      },
    };
  } catch (error) {
    logger.error("Failed to authorize request", { error: error.message });
    // On error, allow the request but log it
    return { authorized: true, error: error.message };
  }
}

/**
 * Get comprehensive cost statistics
 * @returns {Promise<Object>} Cost statistics
 */
async function getCostStats() {
  try {
    const now = new Date();

    // Today
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const todayStats = await logRepository.getAIStats(todayStart);

    // This month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStats = await logRepository.getAIStats(monthStart);

    // All time
    const allTimeStats = await logRepository.getAIStats();

    // Cache stats
    const cacheStats = await logRepository.getCacheStats(todayStart);

    return {
      today: {
        cost: todayStats.totalCost,
        budget: config.dailyBudgetUSD,
        remaining: config.dailyBudgetUSD - todayStats.totalCost,
        percentUsed: (todayStats.totalCost / config.dailyBudgetUSD) * 100,
        requests: todayStats.requestsWithAI,
        tokensInput: todayStats.totalTokensInput,
        tokensOutput: todayStats.totalTokensOutput,
      },
      thisMonth: {
        cost: monthStats.totalCost,
        budget: config.monthlyBudgetUSD,
        remaining: config.monthlyBudgetUSD - monthStats.totalCost,
        percentUsed: (monthStats.totalCost / config.monthlyBudgetUSD) * 100,
        requests: monthStats.requestsWithAI,
        tokensInput: monthStats.totalTokensInput,
        tokensOutput: monthStats.totalTokensOutput,
      },
      allTime: {
        cost: allTimeStats.totalCost,
        requests: allTimeStats.requestsWithAI,
        tokensInput: allTimeStats.totalTokensInput,
        tokensOutput: allTimeStats.totalTokensOutput,
        avgCostPerRequest:
          allTimeStats.requestsWithAI > 0
            ? allTimeStats.totalCost / allTimeStats.requestsWithAI
            : 0,
      },
      cache: {
        hitRate: parseFloat(cacheStats.cacheHitRate),
        totalRequests: cacheStats.total,
        hits: cacheStats.cacheHits,
        misses: cacheStats.cacheMisses,
      },
      config: {
        dailyBudget: config.dailyBudgetUSD,
        monthlyBudget: config.monthlyBudgetUSD,
        alertThreshold: config.costAlertThreshold,
        limitsEnabled: config.enableCostLimits,
      },
    };
  } catch (error) {
    logger.error("Failed to get cost stats", { error: error.message });
    throw error;
  }
}

/**
 * Log cost alert
 * @param {string} level - 'warning' or 'critical'
 * @param {Object} details - Alert details
 */
function logCostAlert(level, details) {
  const message = `Cost Alert [${level.toUpperCase()}]: ${details.message}`;

  if (level === "critical") {
    logger.error(message, details);
  } else {
    logger.warn(message, details);
  }

  // In production, you could also:
  // - Send email alerts
  // - Post to Slack/Discord webhook
  // - Trigger PagerDuty alert
  // - Send SMS via Twilio
}

module.exports = {
  checkBudget,
  authorizeRequest,
  getCostStats,
  logCostAlert,
};
