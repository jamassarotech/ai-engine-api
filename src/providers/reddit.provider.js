const axios = require("axios");
const config = require("../config");
const logger = require("../utils/logger");
const { ProviderError, RateLimitError } = require("../utils/errors");

/**
 * Reddit Provider
 * Integrates with Reddit JSON API (no auth) to fetch posts and comments
 */

const REDDIT_API_BASE = "https://www.reddit.com";
const USER_AGENT = "ai-engine-api/1.0";
const MAX_RESULTS = 20;
const REQUEST_DELAY = 1000; // 1 second between requests to respect rate limits

// Relevant subreddits for buying research (organized by category)
const BUYING_SUBREDDITS = [
  // General buying advice
  "BuyItForLife",
  "reviews",
  "ProductReviews",

  // Food & Dining
  "AskNYC",
  "FoodNYC",
  "food",
  "Cooking",
  "AskCulinary",
  "foodhacks",

  // Home & Kitchen
  "HomeImprovement",
  "Appliances",
  "homeautomation",
  "smarthome",
  "InteriorDesign",
  "ApartmentLiving",

  // Electronics & Tech
  "headphones",
  "monitors",
  "laptops",
  "buildapc",

  // Entertainment
  "hometheater",
  "4kTV",
  "Televisions",
  "GamingLaptops",
  "BudgetAudiophile",
];

/**
 * Select relevant subreddits based on query keywords
 * @param {string} query - Search query
 * @param {number} maxSubreddits - Maximum subreddits to return
 * @returns {Array<string>} Relevant subreddit names
 */
function selectRelevantSubreddits(query, maxSubreddits = 10) {
  const queryLower = query.toLowerCase();
  const relevantSubs = new Set();

  // Always include general buying advice subreddits
  relevantSubs.add("BuyItForLife");
  relevantSubs.add("reviews");
  relevantSubs.add("ProductReviews");

  // Food & Restaurant keywords
  if (
    queryLower.match(
      /\b(restaurant|food|dining|eat|meal|cafe|bar|pizza|burger|sushi|chinese|italian|mexican|thai|indian|brunch|lunch|dinner|chef|menu|cuisine)\b/i,
    )
  ) {
    relevantSubs.add("AskNYC");
    relevantSubs.add("FoodNYC");
    relevantSubs.add("food");
    relevantSubs.add("AskCulinary");
  }

  // Cooking & Recipe keywords
  if (
    queryLower.match(
      /\b(cook|recipe|bake|ingredient|culinary|cookware|pan|pot|knife)\b/i,
    )
  ) {
    relevantSubs.add("Cooking");
    relevantSubs.add("AskCulinary");
    relevantSubs.add("foodhacks");
  }

  // Home & Kitchen Appliance keywords
  if (
    queryLower.match(
      /\b(dishwasher|refrigerator|fridge|oven|stove|microwave|kitchen|appliance|washer|dryer|blender|mixer|toaster|coffee maker)\b/i,
    )
  ) {
    relevantSubs.add("HomeImprovement");
    relevantSubs.add("Appliances");
    relevantSubs.add("ApartmentLiving");
  }

  // Smart home keywords
  if (
    queryLower.match(
      /\b(smart|automation|alexa|google home|homekit|hub|iot)\b/i,
    )
  ) {
    relevantSubs.add("homeautomation");
    relevantSubs.add("smarthome");
  }

  // Audio keywords
  if (
    queryLower.match(
      /\b(headphone|earphone|speaker|audio|sound|music|amp|dac|audiophile)\b/i,
    )
  ) {
    relevantSubs.add("headphones");
    relevantSubs.add("BudgetAudiophile");
  }

  // Display keywords
  if (
    queryLower.match(
      /\b(monitor|display|screen|panel|curved|ultrawide|gaming monitor)\b/i,
    )
  ) {
    relevantSubs.add("monitors");
  }

  // Computer keywords
  if (
    queryLower.match(
      /\b(laptop|computer|pc|desktop|build|gaming pc|workstation)\b/i,
    )
  ) {
    relevantSubs.add("laptops");
    relevantSubs.add("buildapc");
  }

  // Gaming laptop specific
  if (
    queryLower.match(/\b(gaming laptop|gaming notebook|rtx|legion|rog|msi)\b/i)
  ) {
    relevantSubs.add("GamingLaptops");
  }

  // TV keywords
  if (
    queryLower.match(/\b(tv|television|4k|oled|qled|home theater|projector)\b/i)
  ) {
    relevantSubs.add("hometheater");
    relevantSubs.add("4kTV");
    relevantSubs.add("Televisions");
  }

  // Interior design
  if (
    queryLower.match(
      /\b(furniture|decor|design|interior|room|bedroom|living room)\b/i,
    )
  ) {
    relevantSubs.add("InteriorDesign");
  }

  // Location-specific subreddits (for city-specific queries)
  const cityMapping = {
    "nyc|new york|manhattan|brooklyn|queens|bronx": [
      "AskNYC",
      "FoodNYC",
      "nyc",
    ],
    "los angeles|la|hollywood|beverly hills": ["LosAngeles", "FoodLosAngeles"],
    "san francisco|sf|bay area": ["sanfrancisco", "AskSF"],
    chicago: ["chicago", "chicagofood"],
    boston: ["boston", "BostonFood"],
    seattle: ["Seattle", "SeattleWA"],
    portland: ["Portland", "askportland"],
    austin: ["Austin"],
    miami: ["Miami"],
    "philadelphia|philly": ["philadelphia"],
    "washington dc|dc": ["washingtondc"],
  };

  for (const [pattern, subs] of Object.entries(cityMapping)) {
    if (new RegExp(pattern, "i").test(queryLower)) {
      subs.forEach((sub) => relevantSubs.add(sub));
      logger.debug("Matched city pattern", { pattern, addedSubs: subs });
      break; // Only match one city
    }
  }

  const selected = Array.from(relevantSubs);

  // If we didn't match enough specific subs, add some general ones
  if (selected.length < 5) {
    const fallbackSubs = ["AskNYC", "food", "HomeImprovement", "Appliances"];
    for (const sub of fallbackSubs) {
      if (!relevantSubs.has(sub) && selected.length < maxSubreddits) {
        selected.push(sub);
      }
    }
  }

  logger.debug("Selected relevant subreddits", {
    query: query.substring(0, 50),
    selected: selected.slice(0, maxSubreddits),
    count: Math.min(selected.length, maxSubreddits),
  });

  return selected.slice(0, maxSubreddits);
}

/**
 * Search Reddit for posts and comments related to the query
 * @param {string} query - Search query
 * @param {number} maxResults - Maximum number of results (default: from config)
 * @returns {Promise<Array>} Array of normalized post objects
 */
async function search(query, maxResults = null) {
  try {
    // Use config value if not specified (default to 10 for quality)
    const limit = maxResults || config.maxRedditResults || 10;

    logger.info("Searching Reddit", { query, maxResults: limit });

    // Select relevant subreddits based on query content (smart filtering)
    const maxSubreddits = config.redditMaxSubreddits || 10;
    const subredditsToSearch = selectRelevantSubreddits(query, maxSubreddits);
    const batchSize = config.redditBatchSize || 5;

    // Search in relevant subreddits only (parallelized)
    const postsPerSubreddit = Math.ceil(limit / subredditsToSearch.length);
    const posts = await searchInSubredditsParallel(
      query,
      subredditsToSearch,
      postsPerSubreddit,
      batchSize,
    );

    // Return only posts (no comments - they're often low quality)
    // Sort by score and take top results
    const topPosts = posts.sort((a, b) => b.score - a.score).slice(0, limit);

    logger.info("Reddit search completed", {
      query,
      totalPosts: posts.length,
      returnedPosts: topPosts.length,
    });

    return topPosts;
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
        sort: "relevance",
        limit,
        t: "all", // all time
        type: "link", // Only return posts, not comments
      },
      headers: {
        "User-Agent": USER_AGENT,
      },
      timeout: config.requestTimeout,
    });

    const posts = response.data.data.children
      .filter((child) => child.kind === "t3") // t3 = post (double-check filter)
      .filter(
        (child) =>
          child.data.selftext !== "[removed]" &&
          child.data.selftext !== "[deleted]",
      ) // Skip removed content
      .map((child) => normalizePostData(child.data));

    return posts;
  } catch (error) {
    logger.error("Failed to search Reddit posts", {
      error: error.message,
      query,
    });
    return [];
  }
}

/**
 * Search specific subreddits (legacy sequential version - kept for backward compatibility)
 * @param {string} query - Search query
 * @param {Array<string>} subreddits - Subreddit names
 * @param {number} limitPerSubreddit - Results per subreddit
 * @returns {Promise<Array>} Array of normalized post objects
 */
async function searchInSubreddits(
  query,
  subreddits = BUYING_SUBREDDITS,
  limitPerSubreddit = 5,
) {
  try {
    const allPosts = [];

    for (const subreddit of subreddits) {
      await delay(REQUEST_DELAY);

      const response = await axios.get(
        `${REDDIT_API_BASE}/r/${subreddit}/search.json`,
        {
          params: {
            q: query,
            restrict_sr: "true", // restrict to this subreddit
            sort: "relevance",
            limit: limitPerSubreddit,
            t: "all",
          },
          headers: {
            "User-Agent": USER_AGENT,
          },
          timeout: config.requestTimeout,
        },
      );

      const posts = response.data.data.children
        .filter((child) => child.kind === "t3")
        .map((child) => normalizePostData(child.data));

      allPosts.push(...posts);
    }

    logger.info("Reddit subreddit search completed", {
      query,
      count: allPosts.length,
    });
    return allPosts;
  } catch (error) {
    return handleRedditError(error, query);
  }
}

/**
 * Search specific subreddits in parallel with controlled concurrency
 * @param {string} query - Search query
 * @param {Array<string>} subreddits - Subreddit names
 * @param {number} limitPerSubreddit - Results per subreddit
 * @param {number} batchSize - Number of parallel requests (default: 5)
 * @returns {Promise<Array>} Array of normalized post objects
 */
async function searchInSubredditsParallel(
  query,
  subreddits = BUYING_SUBREDDITS,
  limitPerSubreddit = 5,
  batchSize = 5,
) {
  try {
    logger.info("Starting parallel Reddit search", {
      query,
      subredditCount: subreddits.length,
      batchSize,
    });

    const allPosts = [];

    // Process subreddits in batches to avoid overwhelming the API
    for (let i = 0; i < subreddits.length; i += batchSize) {
      const batch = subreddits.slice(i, i + batchSize);

      // Small delay between batches to be respectful to Reddit API
      if (i > 0) {
        await delay(500);
      }

      const batchPromises = batch.map((subreddit) =>
        searchSubreddit(query, subreddit, limitPerSubreddit),
      );

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          allPosts.push(...result.value);
        } else {
          logger.warn("Failed to search subreddit", {
            subreddit: batch[index],
            error: result.reason?.message,
          });
        }
      });
    }

    logger.info("Reddit parallel search completed", {
      query,
      count: allPosts.length,
    });
    return allPosts;
  } catch (error) {
    logger.error("Reddit parallel search failed", { error: error.message });
    return handleRedditError(error, query);
  }
}

/**
 * Search a single subreddit
 * @param {string} query - Search query
 * @param {string} subreddit - Subreddit name
 * @param {number} limit - Maximum results
 * @returns {Promise<Array>} Array of normalized post objects
 */
async function searchSubreddit(query, subreddit, limit = 5) {
  try {
    const response = await axios.get(
      `${REDDIT_API_BASE}/r/${subreddit}/search.json`,
      {
        params: {
          q: query,
          restrict_sr: "true",
          sort: "relevance",
          limit,
          t: "all",
          type: "link", // Only return posts, not comments
        },
        headers: {
          "User-Agent": USER_AGENT,
        },
        timeout: config.requestTimeout || 5000,
      },
    );

    const posts = response.data.data.children
      .filter((child) => child.kind === "t3") // Only posts
      .filter(
        (child) =>
          child.data.selftext !== "[removed]" &&
          child.data.selftext !== "[deleted]",
      ) // Skip removed content
      .map((child) => normalizePostData(child.data));

    return posts;
  } catch (error) {
    // Log but don't throw - let Promise.allSettled handle it
    logger.debug("Subreddit search failed", {
      subreddit,
      error: error.message,
    });
    return [];
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
        sort: "top",
      },
      headers: {
        "User-Agent": USER_AGENT,
      },
      timeout: config.requestTimeout,
    });

    // Reddit returns [post_listing, comments_listing]
    if (!response.data || response.data.length < 2) {
      return [];
    }

    const commentsListing = response.data[1];
    const comments = commentsListing.data.children
      .filter((child) => child.kind === "t1" && child.data.body) // t1 = comment
      .map((child) => normalizeCommentData(child.data))
      .slice(0, limit);

    return comments;
  } catch (error) {
    logger.error("Failed to get Reddit comments", {
      error: error.message,
      permalink,
    });
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
    source_type: "reddit",
    title: post.title,
    url: `${REDDIT_API_BASE}${post.permalink}`,
    author: post.author === "[deleted]" ? null : `u/${post.author}`,
    published_at: new Date(post.created_utc * 1000),
    text: post.selftext || "",
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
    source_type: "reddit",
    title: `Comment by ${comment.author}`,
    url: `${REDDIT_API_BASE}${comment.permalink}`,
    author: comment.author === "[deleted]" ? null : `u/${comment.author}`,
    published_at: new Date(comment.created_utc * 1000),
    text: comment.body || "",
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
    const response = await axios.get(
      `${REDDIT_API_BASE}/r/${subreddit}/hot.json`,
      {
        params: { limit },
        headers: {
          "User-Agent": USER_AGENT,
        },
        timeout: config.requestTimeout,
      },
    );

    const posts = response.data.data.children
      .filter((child) => child.kind === "t3")
      .map((child) => normalizePostData(child.data));

    return posts;
  } catch (error) {
    logger.error("Failed to get hot posts", {
      error: error.message,
      subreddit,
    });
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
      logger.error("Reddit API rate limit exceeded", { context });
      throw new RateLimitError("Reddit API rate limit exceeded", "reddit");
    }

    // Too many requests
    if (status === 503) {
      logger.error("Reddit service unavailable", { context });
      throw new ProviderError("Reddit service unavailable", "reddit", error);
    }

    // Not found
    if (status === 404) {
      logger.warn("Reddit resource not found", { context });
      return [];
    }

    // Other errors - log and return empty
    logger.error("Reddit API error", { status, context });
  } else if (error.code === "ECONNABORTED") {
    logger.error("Reddit API request timeout", { context });
  } else {
    logger.error("Reddit provider error", { error: error.message, context });
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
    const response = await axios.get(
      `${REDDIT_API_BASE}/r/AskReddit/hot.json`,
      {
        params: { limit: 1 },
        headers: {
          "User-Agent": USER_AGENT,
        },
        timeout: 5000,
      },
    );

    logger.info("Reddit API connection test successful");
    return response.status === 200;
  } catch (error) {
    logger.error("Reddit API connection test failed", { error: error.message });
    return false;
  }
}

module.exports = {
  search,
  searchPosts,
  searchInSubreddits,
  selectRelevantSubreddits,
  getPostComments,
  getHotPosts,
  testConnection,
};
