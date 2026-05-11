const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const { ProviderError, RateLimitError } = require('../utils/errors');

/**
 * YouTube Provider
 * Integrates with YouTube Data API v3 to fetch video data
 */

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const MAX_RESULTS = 10; // Balance between relevance and quota usage

/**
 * Search YouTube for videos related to the query
 * @param {string} query - Search query
 * @param {number} maxResults - Maximum number of results (default: 10)
 * @returns {Promise<Array>} Array of normalized video objects
 */
async function search(query, maxResults = MAX_RESULTS) {
  if (!config.youtubeApiKey) {
    logger.warn('YouTube API key not configured, skipping YouTube search');
    return [];
  }

  try {
    logger.info('Searching YouTube', { query, maxResults });

    // Step 1: Search for video IDs
    const searchResponse = await axios.get(`${YOUTUBE_API_BASE}/search`, {
      params: {
        key: config.youtubeApiKey,
        q: query,
        part: 'id,snippet',
        type: 'video',
        maxResults,
        relevanceLanguage: 'en',
        safeSearch: 'moderate',
        order: 'relevance',
      },
      timeout: config.requestTimeout,
    });

    const videoIds = searchResponse.data.items
      .filter((item) => item.id?.videoId)
      .map((item) => item.id.videoId);

    if (videoIds.length === 0) {
      logger.info('No YouTube videos found for query', { query });
      return [];
    }

    // Step 2: Get detailed video information (stats, description)
    const videosResponse = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
      params: {
        key: config.youtubeApiKey,
        id: videoIds.join(','),
        part: 'snippet,statistics,contentDetails',
      },
      timeout: config.requestTimeout,
    });

    // Step 3: Normalize video data
    const videos = videosResponse.data.items.map(normalizeVideoData);

    logger.info('YouTube search completed', { query, count: videos.length });
    return videos;
  } catch (error) {
    return handleYouTubeError(error, query);
  }
}

/**
 * Normalize YouTube video data to standard format
 * @param {Object} video - Raw YouTube video object
 * @returns {Object} Normalized video object
 */
function normalizeVideoData(video) {
  const { snippet, statistics, contentDetails } = video;

  return {
    source_type: 'youtube',
    title: snippet.title,
    url: `https://www.youtube.com/watch?v=${video.id}`,
    author: snippet.channelTitle,
    published_at: new Date(snippet.publishedAt),
    text: snippet.description || '',
    score: parseInt(statistics.viewCount, 10) || 0,
    metadata: {
      videoId: video.id,
      channelId: snippet.channelId,
      thumbnails: snippet.thumbnails,
      likeCount: parseInt(statistics.likeCount, 10) || 0,
      commentCount: parseInt(statistics.commentCount, 10) || 0,
      duration: contentDetails.duration,
      tags: snippet.tags || [],
    },
  };
}

/**
 * Get video details by video ID
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<Object>} Normalized video object
 */
async function getVideoById(videoId) {
  if (!config.youtubeApiKey) {
    throw new ProviderError('YouTube API key not configured', 'youtube');
  }

  try {
    const response = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
      params: {
        key: config.youtubeApiKey,
        id: videoId,
        part: 'snippet,statistics,contentDetails',
      },
      timeout: config.requestTimeout,
    });

    if (response.data.items.length === 0) {
      logger.warn('YouTube video not found', { videoId });
      return null;
    }

    return normalizeVideoData(response.data.items[0]);
  } catch (error) {
    return handleYouTubeError(error, videoId);
  }
}

/**
 * Search YouTube channels for reviews/tech content
 * @param {string} query - Search query
 * @param {Array<string>} channelIds - Specific channel IDs to search
 * @returns {Promise<Array>} Array of normalized video objects
 */
async function searchInChannels(query, channelIds = []) {
  if (!config.youtubeApiKey) {
    logger.warn('YouTube API key not configured, skipping channel search');
    return [];
  }

  if (channelIds.length === 0) {
    return search(query);
  }

  try {
    const allVideos = [];

    for (const channelId of channelIds) {
      const response = await axios.get(`${YOUTUBE_API_BASE}/search`, {
        params: {
          key: config.youtubeApiKey,
          q: query,
          part: 'id,snippet',
          type: 'video',
          channelId,
          maxResults: 5,
          relevanceLanguage: 'en',
          order: 'relevance',
        },
        timeout: config.requestTimeout,
      });

      const videoIds = response.data.items
        .filter((item) => item.id?.videoId)
        .map((item) => item.id.videoId);

      if (videoIds.length > 0) {
        const videosResponse = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
          params: {
            key: config.youtubeApiKey,
            id: videoIds.join(','),
            part: 'snippet,statistics,contentDetails',
          },
          timeout: config.requestTimeout,
        });

        const videos = videosResponse.data.items.map(normalizeVideoData);
        allVideos.push(...videos);
      }
    }

    logger.info('YouTube channel search completed', { query, count: allVideos.length });
    return allVideos;
  } catch (error) {
    return handleYouTubeError(error, query);
  }
}

/**
 * Handle YouTube API errors
 * @param {Error} error - Error object
 * @param {string} context - Context (query or video ID)
 * @returns {Array} Empty array for graceful degradation
 * @throws {ProviderError|RateLimitError} For critical errors
 */
function handleYouTubeError(error, context) {
  if (error.response) {
    const { status, data } = error.response;

    // Rate limit exceeded (quota)
    if (status === 403 && data.error?.errors?.[0]?.reason === 'quotaExceeded') {
      logger.error('YouTube API quota exceeded', { context });
      throw new RateLimitError('YouTube API quota exceeded', 'youtube');
    }

    // Rate limit exceeded (user rate limit)
    if (status === 429) {
      logger.error('YouTube API rate limit exceeded', { context });
      throw new RateLimitError('YouTube API rate limit exceeded', 'youtube');
    }

    // Invalid API key
    if (status === 400 || status === 401) {
      logger.error('YouTube API authentication failed', { status, context });
      throw new ProviderError('YouTube API authentication failed', 'youtube', error);
    }

    // Other API errors - log and return empty (graceful degradation)
    logger.error('YouTube API error', {
      status,
      message: data.error?.message,
      context,
    });
  } else if (error.code === 'ECONNABORTED') {
    logger.error('YouTube API request timeout', { context });
  } else {
    logger.error('YouTube provider error', { error: error.message, context });
  }

  // Return empty array for graceful degradation
  // Let the service layer handle partial results
  return [];
}

/**
 * Test YouTube API connectivity
 * @returns {Promise<boolean>} True if API is accessible
 */
async function testConnection() {
  if (!config.youtubeApiKey) {
    logger.warn('YouTube API key not configured');
    return false;
  }

  try {
    const response = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
      params: {
        key: config.youtubeApiKey,
        id: 'dQw4w9WgXcQ', // Rick Astley - Never Gonna Give You Up (always available)
        part: 'id',
      },
      timeout: 5000,
    });

    logger.info('YouTube API connection test successful');
    return response.status === 200;
  } catch (error) {
    logger.error('YouTube API connection test failed', { error: error.message });
    return false;
  }
}

module.exports = {
  search,
  getVideoById,
  searchInChannels,
  testConnection,
};
