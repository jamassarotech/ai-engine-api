require('dotenv').config();

const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),

  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'ai_engine_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
  },

  // External APIs
  youtubeApiKey: process.env.YOUTUBE_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',

  // Performance settings
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '10000', 10), // Reduced from 30s to 10s
  maxSourcesPerQuery: parseInt(process.env.MAX_SOURCES_PER_QUERY || '20', 10),
  redditBatchSize: parseInt(process.env.REDDIT_BATCH_SIZE || '5', 10), // Parallel request batch size
  redditMaxSubreddits: parseInt(process.env.REDDIT_MAX_SUBREDDITS || '10', 10), // Reduce from 15
  maxYoutubeResults: parseInt(process.env.MAX_YOUTUBE_RESULTS || '8', 10), // Reduced from 10
  maxRedditResults: parseInt(process.env.MAX_REDDIT_RESULTS || '10', 10), // Reduced from 15 (posts only, no comments)
  sourceContentMaxLength: parseInt(process.env.SOURCE_CONTENT_MAX_LENGTH || '800', 10), // Reduced from 1000
  
  // Optional settings
  logLevel: process.env.LOG_LEVEL || 'info',
};

// Validation: Check required environment variables
const requiredEnvVars = ['YOUTUBE_API_KEY', 'OPENAI_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0 && config.nodeEnv === 'production') {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

module.exports = config;
