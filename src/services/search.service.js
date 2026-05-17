const normalizationService = require("./normalization.service");
const cacheService = require("./cache.service");
const analysisService = require("./analysis.service");
const costMonitorService = require("./cost-monitor.service");
const queryRepository = require("../repositories/query.repository");
const resultRepository = require("../repositories/result.repository");
const sourceRepository = require("../repositories/source.repository");
const logRepository = require("../repositories/log.repository");
const logger = require("../utils/logger");
const { ValidationError, DatabaseError } = require("../utils/errors");

/**
 * Search Service
 * Main orchestration service for the search flow
 */

/**
 * Execute a search query (main entry point)
 * @param {string} rawQuery - Raw search query from user
 * @param {Object} options - Search options
 * @param {boolean} options.skipCache - Skip cache lookup (default: false)
 * @param {number} options.cacheMaxAgeHours - Max cache age in hours (default: 24)
 * @param {string} [options.userId] - User ID from frontend localStorage
 * @returns {Promise<Object>} Search result
 */
async function executeSearch(rawQuery, options = {}) {
  const { skipCache = false, cacheMaxAgeHours = 24, userId } = options;

  const startTime = Date.now();
  let cached = false;
  let tokensInput = 0;
  let tokensOutput = 0;
  let aiCost = 0;
  let errorMessage = null;

  try {
    logger.info("Search request received", { query: rawQuery });

    // Step 1: Validate query
    const validation = normalizationService.validateQuery(rawQuery);
    if (!validation.isValid) {
      throw new ValidationError(validation.reason);
    }

    // Step 2: Normalize and process query
    const processedQuery = normalizationService.processQuery(rawQuery);
    const { normalized, slug, type } = processedQuery;

    logger.debug("Query processed", { normalized, slug, type });

    // Step 3: Check cache
    if (!skipCache) {
      const cachedResult = await cacheService.getCachedResult(normalized);

      if (
        cachedResult &&
        cacheService.isCacheValid(cachedResult, cacheMaxAgeHours)
      ) {
        logger.info("Returning cached result", {
          queryId: cachedResult.query.id,
        });

        // Log cache hit
        await logRepository.create({
          query: rawQuery,
          normalized_query: normalized,
          cached: true,
          latency_ms: Date.now() - startTime,
          tokens_input: null,
          tokens_output: null,
          ai_cost: null,
        });

        return formatCachedResponse(cachedResult);
      }
    }

    // Step 4: Fetch fresh data and analyze
    logger.info("Cache miss - fetching fresh data", { normalized });

    // Step 4a: Check budget before making AI API call
    const budgetCheck = await costMonitorService.authorizeRequest();
    if (!budgetCheck.authorized) {
      throw new ValidationError(budgetCheck.message);
    }

    // Perform complete analysis
    const analysisResult =
      await analysisService.performCompleteAnalysis(normalized);

    tokensInput = analysisResult.metadata.tokens_input;
    tokensOutput = analysisResult.metadata.tokens_output;
    aiCost = analysisResult.metadata.ai_cost;

    // Step 5: Store in database
    const storedResult = await storeSearchResult(
      rawQuery,
      normalized,
      slug,
      type,
      analysisResult,
      userId
    );

    // Step 6: Log search
    await logRepository.create({
      query: rawQuery,
      normalized_query: normalized,
      cached: false,
      latency_ms: Date.now() - startTime,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      ai_cost: aiCost,
    });

    logger.info("Search completed successfully", {
      queryId: storedResult.queryId,
      cached: false,
      latency: Date.now() - startTime,
    });

    return formatFreshResponse(storedResult, analysisResult);
  } catch (error) {
    errorMessage = error.message;
    const latency = Date.now() - startTime;

    logger.error("Search failed", {
      error: error.message,
      query: rawQuery,
      latency,
    });

    // Log failed search
    try {
      await logRepository.create({
        query: rawQuery,
        normalized_query: normalizationService.normalizeQuery(rawQuery),
        cached: false,
        latency_ms: latency,
        tokens_input: tokensInput,
        tokens_output: tokensOutput,
        ai_cost: aiCost,
        error_message: errorMessage,
      });
    } catch (logError) {
      logger.error("Failed to log error", { error: logError.message });
    }

    throw error;
  }
}

/**
 * Store search result in database
 * @param {string} originalQuery - Original query
 * @param {string} normalizedQuery - Normalized query
 * @param {string} slug - URL slug
 * @param {string} queryType - Query type
 * @param {Object} analysisResult - Analysis result from analysis service
 * @param {string} [userId] - User ID from frontend localStorage
 * @returns {Promise<Object>} Stored result IDs
 */
async function storeSearchResult(
  originalQuery,
  normalizedQuery,
  slug,
  queryType,
  analysisResult,
  userId
) {
  try {
    logger.debug("Storing search result", { slug });

    // Find or create query (handles duplicate slugs gracefully)
    const { query, isNew } = await queryRepository.findOrCreate({
      original_query: originalQuery,
      normalized_query: normalizedQuery,
      slug,
      query_type: queryType,
      status: "completed",
      user_id: userId,
    });

    // If updating existing query, delete old sources and result
    if (!isNew) {
      logger.debug("Updating existing query, deleting old data", {
        queryId: query.id,
      });
      await Promise.all([
        sourceRepository.deleteByQueryId(query.id),
        resultRepository.deleteByQueryId(query.id),
      ]);
    }

    // Store sources
    const sourcesToStore = analysisResult.sources.all.map((source) => ({
      query_id: query.id,
      source_type: source.source_type,
      title: source.title,
      url: source.url,
      author: source.author,
      published_at: source.published_at,
      text: source.text,
      score: source.score,
    }));

    await sourceRepository.bulkCreate(sourcesToStore);

    // Store result
    const result = await resultRepository.create({
      query_id: query.id,
      summary: analysisResult.analysis.summary,
      pros: analysisResult.analysis.pros,
      cons: analysisResult.analysis.cons,
      warnings: analysisResult.analysis.warnings,
      quotes: analysisResult.analysis.quotes,
      confidence: analysisResult.analysis.confidence,
      ai_model: analysisResult.metadata.model,
      tokens_input: analysisResult.metadata.tokens_input,
      tokens_output: analysisResult.metadata.tokens_output,
      ai_cost: analysisResult.metadata.ai_cost,
    });

    logger.info("Search result stored", {
      queryId: query.id,
      resultId: result.id,
      isUpdate: !isNew,
    });

    return {
      queryId: query.id,
      resultId: result.id,
      sourceCount: sourcesToStore.length,
    };
  } catch (error) {
    logger.error("Failed to store search result", { error: error.message });
    throw new DatabaseError("Failed to store search result", error);
  }
}

/**
 * Format cached response
 * @param {Object} cachedResult - Cached result from cache service
 * @returns {Object} Formatted response
 */
function formatCachedResponse(cachedResult) {
  const { query, result, sources } = cachedResult;

  // Group sources by type
  const youtubeSources = sources
    .filter((s) => s.source_type === "youtube")
    .map(formatSource);

  const redditSources = sources
    .filter((s) => s.source_type === "reddit")
    .map(formatSource);

  return {
    query: query.original_query,
    metadata: {
      sourceCount: sources.length,
      lastUpdated: result.generated_at,
      cached: true,
      confidence: result.confidence,
    },
    summary: result.summary,
    pros: result.pros_json,
    cons: result.cons_json,
    warnings: result.warnings_json,
    quotes: result.quotes_json,
    sources: {
      youtube: youtubeSources,
      reddit: redditSources,
    },
  };
}

/**
 * Format fresh response
 * @param {Object} storedResult - Stored result info
 * @param {Object} analysisResult - Fresh analysis result
 * @returns {Object} Formatted response
 */
function formatFreshResponse(storedResult, analysisResult) {
  const youtubeSources = analysisResult.sources.youtube.map(formatSource);
  const redditSources = analysisResult.sources.reddit.map(formatSource);

  return {
    query: analysisResult.query,
    metadata: {
      sourceCount: analysisResult.sources.all.length,
      lastUpdated: new Date().toISOString(),
      cached: false,
      confidence: analysisResult.analysis.confidence,
    },
    summary: analysisResult.analysis.summary,
    pros: analysisResult.analysis.pros,
    cons: analysisResult.analysis.cons,
    warnings: analysisResult.analysis.warnings,
    quotes: analysisResult.analysis.quotes,
    sources: {
      youtube: youtubeSources,
      reddit: redditSources,
    },
  };
}

/**
 * Format a source for API response
 * @param {Object} source - Raw source object
 * @returns {Object} Formatted source
 */
function formatSource(source) {
  return {
    type: source.source_type,
    title: source.title,
    url: source.url,
    author: source.author,
    publishedAt: source.published_at,
    score: source.score,
  };
}

/**
 * Get search by slug (for SEO-friendly URLs)
 * @param {string} slug - URL slug
 * @returns {Promise<Object>} Search result
 */
async function getSearchBySlug(slug) {
  try {
    const cachedResult = await cacheService.getCachedResultBySlug(slug);

    if (!cachedResult) {
      return null;
    }

    return formatCachedResponse(cachedResult);
  } catch (error) {
    logger.error("Failed to get search by slug", {
      error: error.message,
      slug,
    });
    throw error;
  }
}

module.exports = {
  executeSearch,
  getSearchBySlug,
};
