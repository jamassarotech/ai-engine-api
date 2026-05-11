const slugify = require('slugify');

/**
 * Generate a URL-friendly slug from a query string
 * @param {string} query - The search query
 * @returns {string} - URL-friendly slug
 */
function generateSlug(query) {
  return slugify(query, {
    lower: true,
    strict: true,
    trim: true,
  });
}

module.exports = {
  generateSlug,
};
