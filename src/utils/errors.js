/**
 * Base error class for application errors
 */
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 - Bad Request
 * Used for invalid input or validation errors
 */
class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 400);
  }
}

/**
 * 429 - Too Many Requests
 * Used when API rate limits are exceeded
 */
class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', provider = null) {
    super(message, 429);
    this.provider = provider;
  }
}

/**
 * 500 - Internal Server Error
 * Used for database operation failures
 */
class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', originalError = null) {
    super(message, 500);
    this.originalError = originalError;
  }
}

/**
 * 500 - Internal Server Error
 * Used for cache-related failures (non-critical)
 */
class CacheError extends AppError {
  constructor(message = 'Cache operation failed', originalError = null) {
    super(message, 500);
    this.originalError = originalError;
  }
}

/**
 * 502 - Bad Gateway
 * Used when external provider (YouTube/Reddit) fails
 */
class ProviderError extends AppError {
  constructor(message = 'External provider failed', provider = null, originalError = null) {
    super(message, 502);
    this.provider = provider;
    this.originalError = originalError;
  }
}

/**
 * 503 - Service Unavailable
 * Used when AI service (OpenAI) fails
 */
class AIError extends AppError {
  constructor(message = 'AI service unavailable', originalError = null) {
    super(message, 503);
    this.originalError = originalError;
  }
}

/**
 * 404 - Not Found
 * Used when a resource is not found
 */
class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

module.exports = {
  AppError,
  ValidationError,
  RateLimitError,
  DatabaseError,
  CacheError,
  ProviderError,
  AIError,
  NotFoundError,
};
