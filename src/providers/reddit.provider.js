const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const { ProviderError, RateLimitError } = require('../utils/errors');

/**
 * Reddit Provider
 * Integrates with Reddit JSON API (no auth) to fetch posts and comments
 */

const REDDIT_API_BASE = 'https://www.reddit.com';
const USER_AGENT = 'ai-engine-api/1.0';
const MAX_RESULTS = 20;
const REQUEST_DELAY = 1000; // 1 second between requests to respect rate limits

// Relevant subreddits for buying research
const BUYING_SUBREDDITS = [
  'BuyItForLife',
  'reviews',
  'ProductReviews',
  'headphones',
  'monitors',
  'laptops',
  'buildapc',
  'hometheater',
];

/**
 * Search Reddit for posts and comments related to the query
 * @param {string} query - Search query
 * @param {number} maxResults - Maximum number of results (default: 20)
 * @returns {Promise<Array>} Array of normalized post/comment objects
 */
async function search(query, maxResults = MAX_RESULTS) {
  try {
    logger.info('Searching Reddit', { query, maxResults });

    // Search across all of Reddit
    const posts = await searchPosts(query, maxResults);

    // For each top post, fetch top-level comments
    const allSources = [...posts];

    // Get comments for top 5 posts
    const topPosts = posts.slice(0, 5);
    for (const post of topPosts) {
      await delay(REQUEST_DELAY);
      const comments = await getPostComments(post.metadata.permalink, 5);
      allSources.push(...comments);
    }

    logger.info('Reddit search completed', { query, sources: allSources.length });
    return allSources;
  } catch (error) {
    return handleRedditError(error, query);
  }
}

/**
 * Search for Reddit posts
 * @param {string} query - Search query
 * @param {number} limit - Maximum results
 * @returns {Promise<Array>} Array of normalized post objects
 */
async function searchPosts(query, limit = 20) {
  try {
    const response = await axios.get(`${REDDIT_API_BASE}/search.json`, {
      params: {
        q: query,
        sort: 'relevance',
        limit,
        t: 'all', // all time
      },
      headers: {
        'User-Agent': USER_AGENT,
      },
      timeout: config.requestTimeout,
    });

    const posts = response.data.data.children
      .filter((child) => child.kind === 't3') // t3 = post
      .map((child) => normalizePostData(child.data));

    return posts;
  } catch (error) {
    logger.error('Failed to search Reddit posts', { error: error.message, query });
    return [];
  }
}

/**
 * Search specific subreddits
 * @param {string} query - Search query
 * @param {Array<string>} subreddits - Subreddit names
 * @param {number} limitPerSubreddit - Results per subreddit
 * @returns {Promise<Array>} Array of normalized post objects
 */
async function searchInSubreddits(query, subreddits = BUYING_SUBREDDITS, limitPerSubreddit = 5) {
  try {
    const allPosts = [];

    for (const subreddit of subreddits) {
      await delay(REQUEST_DELAY);

      const response = await axios.get(`${REDDIT_API_BASE}/r/${subreddit}/search.json`, {
        params: {
          q: query,
          restrict_sr: 'true', // restrict to this subreddit
          sort: 'relevance',
          limit: limitPerSubreddit,
          t: 'all',
        },
        headers: {
          'User-Agent': USER_AGENT,
        },
        timeout: config.requestTimeout,
      });

      const posts = response.data.data.children
        .filter((child) => child.kind === 't3')
        .map((child) => normalizePostData(child.data));

      allPosts.push(...posts);
    }

    logger.info('Reddit subreddit search completed', { query, count: allPosts.length });
    return allPosts;
  } catch (error) {
    return handleRedditError(error, query);
  }
}

/**
 * Get comments from a specific post
 * @param {string} permalink - Post permalink (e.g., /r/subreddit/comments/id/title/)
 * @param {number} limit - Maximum comments to fetch
 * @returns {Promise<Array>} Array of normalized comment objects
 */
async function getPostComments(permalink, limit = 10) {
  try {
    const response = await axios.get(`${REDDIT_API_BASE}${permalink}.json`, {
      params: {
        limit,
        depth: 1, // Only top-level comments
        sort: 'top',
      },
      headers: {
        'User-Agent': USER_AGENT,
      },
      timeout: config.requestTimeout,
    });

    // Reddit returns [post_listing, comments_listing]
    if (!response.data || response.data.length < 2) {
      return [];
    }

    const commentsListing = response.data[1];
    const comments = commentsListing.data.children
      .filter((child) => child.kind === 't1' && child.data.body) // t1 = comment
      .map((child) => normalizeCommentData(child.data))
      .slice(0, limit);

    return comments;
  } catch (error) {
    logger.error('Failed to get Reddit comments', { error: error.message, permalink });
    return [];
  }
}

/**
 * Normalize Reddit post data to standard format
 * @param {Object} post - Raw Reddit post object
 * @returns {Object} Normalized post object
 */
function normalizePostData(post) {
  return {
    source_type: 'reddit',
    title: post.title,
    url: `${REDDIT_API_BASE}${post.permalink}`,
    author: post.author === '[deleted]' ? null : `u/${post.author}`,
    published_at: new Date(post.created_utc * 1000),
    text: post.selftext || '',
    score: post.score || 0,
    metadata: {
      postId: post.id,
      subreddit: post.subreddit,
      permalink: post.permalink,
      numComments: post.num_comments || 0,
      upvoteRatio: post.upvote_ratio,
      isVideo: post.is_video || false,
      isSelf: post.is_self || false,
    },
  };
}

/**
 * Normalize Reddit comment data to standard format
 * @param {Object} comment - Raw Reddit comment object
 * @returns {Object} Normalized comment object
 */
function normalizeCommentData(comment) {
  return {
    source_type: 'reddit',
    title: `Comment by ${comment.author}`,
    url: `${REDDIT_API_BASE}${comment.permalink}`,
    author: comment.author === '[deleted]' ? null : `u/${comment.author}`,
    published_at: new Date(comment.created_utc * 1000),
    text: comment.body || '',
    score: comment.score || 0,
    metadata: {
      commentId: comment.id,
      subreddit: comment.subreddit,
      permalink: comment.permalink,
      parentId: comment.parent_id,
      depth: comment.depth || 0,
      isSubmitter: comment.is_submitter || false,
    },
  };
}

/**
 * Get hot posts from specific subreddit
 * @param {string} subreddit - Subreddit name
 * @param {number} limit - Number of posts
 * @returns {Promise<Array>} Array of normalized post objects
 */
async function getHotPosts(subreddit, limit = 10) {
  try {
    const response = await axios.get(`${REDDIT_API_BASE}/r/${subreddit}/hot.json`, {
      params: { limit },
      headers: {
        'User-Agent': USER_AGENT,
      },
      timeout: config.requestTimeout,
    });

    const posts = response.data.data.children
      .filter((child) => child.kind === 't3')
      .map((child) => normalizePostData(child.data));

    return posts;
  } catch (error) {
    logger.error('Failed to get hot posts', { error: error.message, subreddit });
    return [];
  }
}

/**
 * Handle Reddit API errors
 * @param {Error} error - Error object
 * @param {string} context - Context (query or permalink)
 * @returns {Array} Empty array for graceful degradation
 * @throws {ProviderError|RateLimitError} For critical errors
 */
function handleRedditError(error, context) {
  if (error.response) {
    const { status } = error.response;

    // Rate limit exceeded
    if (status === 429) {
      logger.error('Reddit API rate limit exceeded', { context });
      throw new RateLimitError('Reddit API rate limit exceeded', 'reddit');
    }

    // Too many requests
    if (status === 503) {
      logger.error('Reddit service unavailable', { context });
      throw new ProviderError('Reddit service unavailable', 'reddit', error);
    }

    // Not found
    if (status === 404) {
      logger.warn('Reddit resource not found', { context });
      return [];
    }

    // Other errors - log and return empty
    logger.error('Reddit API error', { status, context });
  } else if (error.code === 'ECONNABORTED') {
    logger.error('Reddit API request timeout', { context });
  } else {
    logger.error('Reddit provider error', { error: error.message, context });
  }

  // Return empty array for graceful degradation
  return [];
}

/**
 * Delay helper for rate limiting
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Test Reddit API connectivity
 * @returns {Promise<boolean>} True if API is accessible
 */
async function testConnection() {
  try {
    const response = await axios.get(`${REDDIT_API_BASE}/r/AskReddit/hot.json`, {
      params: { limit: 1 },
      headers: {
        'User-Agent': USER_AGENT,
      },
      timeout: 5000,
    });

    logger.info('Reddit API connection test successful');
    return response.status === 200;
  } catch (error) {
    logger.error('Reddit API connection test failed', { error: error.message });
    return false;
  }
}

module.exports = {
  search,
  searchPosts,
  searchInSubreddits,
  getPostComments,
  getHotPosts,
  testConnection,
};
