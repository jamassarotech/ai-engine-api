/**
 * Amazon Utility
 * Generate Amazon search URLs from product names
 */

/**
 * Generate Amazon search URL from product name
 * @param {string} productName - Product name to search for
 * @returns {string} Amazon search URL
 *
 * @example
 * generateAmazonUrl('Sony WH-1000XM5')
 * // => 'https://www.amazon.com/s?k=Sony%20WH-1000XM5'
 */
function generateAmazonUrl(productName) {
  if (!productName || typeof productName !== "string") {
    throw new Error("Product name must be a non-empty string");
  }

  const trimmed = productName.trim();
  if (trimmed.length === 0) {
    throw new Error("Product name must not be empty");
  }

  // Encode the product name for URL
  const encoded = encodeURIComponent(trimmed);

  return `https://www.amazon.com/s?k=${encoded}`;
}

/**
 * Enrich recommendations with Amazon URLs
 * @param {Array} recommendations - Array of recommendation objects
 * @returns {Array} Recommendations with amazonUrl added
 *
 * @example
 * enrichRecommendations([{name: 'Sony WH-1000XM5', summary: '...', score: 95}])
 * // => [{name: 'Sony WH-1000XM5', summary: '...', score: 95, amazonUrl: '...'}]
 */
function enrichRecommendations(recommendations) {
  if (!Array.isArray(recommendations)) {
    return [];
  }

  return recommendations.map((rec) => {
    try {
      return {
        ...rec,
        amazonUrl: generateAmazonUrl(rec.name),
      };
    } catch (error) {
      // If URL generation fails, return recommendation without amazonUrl
      return rec;
    }
  });
}

module.exports = {
  generateAmazonUrl,
  enrichRecommendations,
};
