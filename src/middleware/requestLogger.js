const logger = require('../utils/logger');

/**
 * Request Logger Middleware
 * Logs all incoming requests and responses
 */
function requestLogger(req, res, next) {
  // Generate unique request ID
  req.id = generateRequestId();

  // Start timer
  const startTime = Date.now();

  // Log request
  logger.info('Incoming request', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Capture original end function
  const originalEnd = res.end;

  // Override end to log response
  res.end = function (chunk, encoding) {
    // Restore original end
    res.end = originalEnd;

    // Calculate duration
    const duration = Date.now() - startTime;

    // Log response
    logger.info('Request completed', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
    });

    // Call original end
    res.end(chunk, encoding);
  };

  next();
}

/**
 * Generate unique request ID
 * @returns {string} Request ID
 */
function generateRequestId() {
  // Simple implementation - could use uuid for production
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = requestLogger;
