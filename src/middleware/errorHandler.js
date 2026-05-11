const logger = require('../utils/logger');
const {
  AppError,
  ValidationError,
  RateLimitError,
  DatabaseError,
  CacheError,
  ProviderError,
  AIError,
  NotFoundError,
} = require('../utils/errors');

/**
 * Global Error Handler Middleware
 * Catches all errors and returns appropriate HTTP responses
 */
function errorHandler(err, req, res, next) {
  // Log error
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
  });

  // Default error response
  let statusCode = 500;
  let errorResponse = {
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
  };

  // Handle known error types
  if (err instanceof ValidationError) {
    statusCode = 400;
    errorResponse = {
      error: 'Bad Request',
      message: err.message,
    };
  } else if (err instanceof NotFoundError) {
    statusCode = 404;
    errorResponse = {
      error: 'Not Found',
      message: err.message,
    };
  } else if (err instanceof RateLimitError) {
    statusCode = 429;
    errorResponse = {
      error: 'Too Many Requests',
      message: err.message,
      provider: err.provider,
    };
  } else if (err instanceof DatabaseError || err instanceof CacheError) {
    statusCode = 500;
    errorResponse = {
      error: 'Internal Server Error',
      message: 'Database operation failed',
    };
  } else if (err instanceof ProviderError) {
    statusCode = 502;
    errorResponse = {
      error: 'Bad Gateway',
      message: err.message,
      provider: err.provider,
    };
  } else if (err instanceof AIError) {
    statusCode = 503;
    errorResponse = {
      error: 'Service Unavailable',
      message: err.message,
    };
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorResponse = {
      error: err.name,
      message: err.message,
    };
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    errorResponse.message = 'An unexpected error occurred';
  }

  // Add request ID if available
  if (req.id) {
    errorResponse.requestId = req.id;
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * 404 Not Found Handler
 * Catches all unmatched routes
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
