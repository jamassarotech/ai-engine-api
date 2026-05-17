const express = require("express");
const router = express.Router();
const statsController = require("../controllers/stats.controller");

/**
 * Stats Routes
 * Endpoints for monitoring and statistics
 */

// GET /api/stats/cost - Get comprehensive cost statistics
router.get("/cost", statsController.getCostStats);

// GET /api/stats/budget - Get budget status
router.get("/budget", statsController.getBudgetStatus);

// GET /api/stats/logs - Get recent logs
router.get("/logs", statsController.getRecentLogs);

// GET /api/stats/queries - Get top queries
router.get("/queries", statsController.getTopQueries);

// GET /api/stats/errors - Get error logs
router.get("/errors", statsController.getErrors);

module.exports = router;
