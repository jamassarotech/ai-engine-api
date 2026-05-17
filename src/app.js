const express = require("express");
const config = require("./config");
const logger = require("./utils/logger");
const requestLogger = require("./middleware/requestLogger");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const searchRoutes = require("./routes/search.routes");
const statsRoutes = require("./routes/stats.routes");

/**
 * Express App Setup
 */

// Create Express app
const app = express();

// Trust proxy (if behind reverse proxy)
app.set("trust proxy", 1);

// Body parser middleware
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Request logging
app.use(requestLogger);

// CORS (basic setup - adjust for production)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
  });
});

// API routes
app.use("/api", searchRoutes);
app.use("/api/stats", statsRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    name: "AI Engine API",
    version: "1.0.0",
    description: "AI-powered buying research search engine",
    endpoints: {
      health: "GET /health",
      search: "POST /api/search",
      searchBySlug: "GET /api/search/:slug",
      stats: {
        cost: "GET /api/stats/cost",
        budget: "GET /api/stats/budget",
        logs: "GET /api/stats/logs",
        topQueries: "GET /api/stats/queries",
        errors: "GET /api/stats/errors",
      },
    },
  });
});

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
