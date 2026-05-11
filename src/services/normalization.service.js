const { generateSlug } = require('../utils/slug');
const logger = require('../utils/logger');

/**
 * Normalization Service
 * Handles query normalization, classification, and slug generation
 */

/**
 * Normalize a search query
 * @param {string} query - Raw search query
 * @returns {string} Normalized query
 */
function normalizeQuery(query) {
  if (!query || typeof query !== 'string') {
    return '';
  }

  return query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[^\w\s\-]/g, '') // Remove special characters except hyphens
    .substring(0, 500); // Limit length
}

/**
 * Detect query type based on keywords and patterns
 * @param {string} query - Normalized query
 * @returns {string} Query type (product, comparison, best, troubleshooting, general)
 */
function detectQueryType(query) {
  const lowerQuery = query.toLowerCase();

  // Comparison queries (vs, or, versus, compared to)
  if (/\s(vs|versus|or)\s/.test(lowerQuery) || /compared to/.test(lowerQuery)) {
    return 'comparison';
  }

  // Best/recommendation queries
  if (/^best\s/.test(lowerQuery) || /\sbest\s/.test(lowerQuery) || /top\s\d+/.test(lowerQuery)) {
    return 'best';
  }

  // Troubleshooting/problem queries
  if (/(not working|broken|issue|problem|error|fix|troubleshoot|overheating|crash)/.test(lowerQuery)) {
    return 'troubleshooting';
  }

  // Worth it / should I buy queries  
  if (/(worth it|should i buy|is it good|recommended)/.test(lowerQuery)) {
    return 'product';
  }

  // Review queries
  if (/(review|opinion|thoughts on)/.test(lowerQuery)) {
    return 'product';
  }

  // Default
  return 'general';
}

/**
 * Generate a URL-friendly slug from query
 * @param {string} query - Normalized query
 * @returns {string} URL slug
 */
function createSlug(query) {
  return generateSlug(query);
}

/**
 * Process a raw query into normalized form with metadata
 * @param {string} rawQuery - Raw search query from user
 * @returns {Object} Processed query object
 */
function processQuery(rawQuery) {
  const normalized = normalizeQuery(rawQuery);
  const slug = createSlug(normalized);
  const queryType = detectQueryType(normalized);

  logger.debug('Query processed', {
    original: rawQuery,
    normalized,
    slug,
    type: queryType,
  });

  return {
    original: rawQuery,
    normalized,
    slug,
    type: queryType,
  };
}

/**
 * Extract product names/brands from query
 * @param {string} query - Normalized query
 * @returns {Array<string>} Array of detected product/brand names
 */
function extractProducts(query) {
  // Simple extraction based on capitalization and common patterns
  // This is basic - could be enhanced with NLP or product database
  const words = query.split(/\s+/);
  const products = [];

  // Look for brand patterns (2-3 consecutive capitalized/alphanumeric words)
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    // Check for model numbers or brand names
    if (/^[A-Z0-9]/.test(word) && word.length > 1) {
      // Check if next 1-2 words are also part of product name
      let productName = word;
      if (i + 1 < words.length && /^[A-Z0-9]/.test(words[i + 1])) {
        productName += ' ' + words[i + 1];
        if (i + 2 < words.length && /^[A-Z0-9]/.test(words[i + 2])) {
          productName += ' ' + words[i + 2];
        }
      }
      products.push(productName);
    }
  }

  return [...new Set(products)]; // Remove duplicates
}

/**
 * Validate if query is suitable for buying research
 * @param {string} query - Normalized query
 * @returns {Object} Validation result with isValid and reason
 */
function validateQuery(query) {
  const minLength = 3;
  const maxLength = 500;

  if (!query || query.length < minLength) {
    return {
      isValid: false,
      reason: `Query must be at least ${minLength} characters`,
    };
  }

  if (query.length > maxLength) {
    return {
      isValid: false,
      reason: `Query must not exceed ${maxLength} characters`,
    };
  }

  // Check for spam/invalid patterns
  if (/(.)\1{10,}/.test(query)) {
    return {
      isValid: false,
      reason: 'Query contains invalid repeated characters',
    };
  }

  return {
    isValid: true,
    reason: null,
  };
}

module.exports = {
  normalizeQuery,
  detectQueryType,
  createSlug,
  processQuery,
  extractProducts,
  validateQuery,
};
