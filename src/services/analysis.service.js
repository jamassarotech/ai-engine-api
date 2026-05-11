const youtubeProvider = require('../providers/youtube.provider');
const redditProvider = require('../providers/reddit.provider');
const openaiProvider = require('../providers/openai.provider');
const logger = require('../utils/logger');
const { ProviderError, AIError } = require('../utils/errors');

/**
 * Analysis Service
 * Orchestrates source fetching and AI analysis
 */

/**
 * Fetch sources from all providers
 * @param {string} query - Search query
 * @param {Object} options - Fetch options
 * @param {number} options.maxYouTubeResults - Max YouTube videos (default: 10)
 * @param {number} options.maxRedditResults - Max Reddit sources (default: 20)
 * @returns {Promise<Object>} Sources from all providers
 */
async function fetchSources(query, options = {}) {
  const {
    maxYouTubeResults = 10,
    maxRedditResults = 20,
  } = options;

  logger.info('Fetching sources', { query, maxYouTubeResults, maxRedditResults });

  const startTime = Date.now();

  // Fetch from both providers in parallel
  const [youtubeResults, redditResults] = await Promise.allSettled([
    youtubeProvider.search(query, maxYouTubeResults),
    redditProvider.search(query, maxRedditResults),
  ]);

  // Extract results (handle errors gracefully)
  const youtubeSources = youtubeResults.status === 'fulfilled' ? youtubeResults.value : [];
  const redditSources = redditResults.status === 'fulfilled' ? redditResults.value : [];

  // Log any errors but don't fail the request
  if (youtubeResults.status === 'rejected') {
    logger.warn('YouTube fetch failed', { error: youtubeResults.reason.message });
  }
  if (redditResults.status === 'rejected') {
    logger.warn('Reddit fetch failed', { error: redditResults.reason.message });
  }

  const allSources = [...youtubeSources, ...redditSources];
  const fetchTime = Date.now() - startTime;

  logger.info('Sources fetched', {
    query,
    youtube: youtubeSources.length,
    reddit: redditSources.length,
    total: allSources.length,
    fetchTimeMs: fetchTime,
  });

  return {
    youtube: youtubeSources,
    reddit: redditSources,
    all: allSources,
    metadata: {
      youtubeCount: youtubeSources.length,
      redditCount: redditSources.length,
      totalCount: allSources.length,
      fetchTimeMs: fetchTime,
    },
  };
}

/**
 * Generate AI analysis from sources
 * @param {string} query - Search query
 * @param {Array} sources - Array of normalized sources
 * @param {Object} options - Analysis options
 * @returns {Promise<Object>} AI analysis result
 */
async function generateAnalysis(query, sources, options = {}) {
  if (!sources || sources.length === 0) {
    throw new ProviderError('No sources available for analysis');
  }

  logger.info('Generating AI analysis', { query, sourceCount: sources.length });

  try {
    const result = await openaiProvider.generateAnalysis(query, sources, options);

    logger.info('AI analysis completed', {
      query,
      confidence: result.analysis.confidence,
      tokensUsed: result.metadata.tokens_input + result.metadata.tokens_output,
      cost: result.metadata.ai_cost,
    });

    return result;
  } catch (error) {
    logger.error('AI analysis failed', { error: error.message, query });
    throw error;
  }
}

/**
 * Perform complete analysis: fetch sources + generate AI analysis
 * @param {string} query - Search query
 * @param {Object} options - Combined options for fetch and analysis
 * @returns {Promise<Object>} Complete analysis result
 */
async function performCompleteAnalysis(query, options = {}) {
  const startTime = Date.now();

  logger.info('Starting complete analysis', { query });

  try {
    // Step 1: Fetch sources
    const sourcesResult = await fetchSources(query, options);

    if (sourcesResult.all.length === 0) {
      throw new ProviderError('No sources found for query');
    }

    // Step 2: Generate AI analysis
    const analysisResult = await generateAnalysis(query, sourcesResult.all, options);

    const totalTime = Date.now() - startTime;

    logger.info('Complete analysis finished', {
      query,
      totalSources: sourcesResult.all.length,
      confidence: analysisResult.analysis.confidence,
      totalTimeMs: totalTime,
    });

    return {
      query,
      sources: sourcesResult,
      analysis: analysisResult.analysis,
      metadata: {
        ...sourcesResult.metadata,
        ...analysisResult.metadata,
        totalTimeMs: totalTime,
      },
    };
  } catch (error) {
    const totalTime = Date.now() - startTime;
    logger.error('Complete analysis failed', {
      error: error.message,
      query,
      totalTimeMs: totalTime,
    });
    throw error;
  }
}

/**
 * Validate sources quality
 * @param {Array} sources - Array of sources
 * @returns {Object} Quality assessment
 */
function assessSourceQuality(sources) {
  if (!sources || sources.length === 0) {
    return {
      quality: 'low',
      reason: 'No sources available',
      score: 0,
    };
  }

  const youtubeCount = sources.filter(s => s.source_type === 'youtube').length;
  const redditCount = sources.filter(s => s.source_type === 'reddit').length;

  // Calculate quality score
  let score = 0;

  // Diversity bonus
  if (youtubeCount > 0 && redditCount > 0) score += 20;

  // Quantity bonus
  if (sources.length >= 15) score += 20;
  else if (sources.length >= 10) score += 15;
  else if (sources.length >= 5) score += 10;

  // Recency bonus (sources from last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const recentSources = sources.filter(s => 
    s.published_at && new Date(s.published_at) > sixMonthsAgo
  );
  const recentRatio = recentSources.length / sources.length;
  score += Math.floor(recentRatio * 30);

  // Engagement bonus (high scores)
  const avgScore = sources.reduce((sum, s) => sum + (s.score || 0), 0) / sources.length;
  if (avgScore > 10000) score += 30;
  else if (avgScore > 1000) score += 20;
  else if (avgScore > 100) score += 10;

  // Determine quality level
  let quality, reason;
  if (score >= 70) {
    quality = 'high';
    reason = 'Diverse, recent sources with high engagement';
  } else if (score >= 40) {
    quality = 'medium';
    reason = 'Good mix of sources with moderate engagement';
  } else {
    quality = 'low';
    reason = 'Limited sources or low engagement';
  }

  return {
    quality,
    reason,
    score,
    breakdown: {
      total: sources.length,
      youtube: youtubeCount,
      reddit: redditCount,
      recent: recentSources.length,
      avgScore: Math.round(avgScore),
    },
  };
}

module.exports = {
  fetchSources,
  generateAnalysis,
  performCompleteAnalysis,
  assessSourceQuality,
};
