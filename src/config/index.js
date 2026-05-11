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
  },

  // External APIs
  youtubeApiKey: process.env.YOUTUBE_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',

  // Optional settings
  logLevel: process.env.LOG_LEVEL || 'info',
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000', 10),
  maxSourcesPerQuery: parseInt(process.env.MAX_SOURCES_PER_QUERY || '20', 10),
};

// Validation: Check required environment variables
const requiredEnvVars = ['YOUTUBE_API_KEY', 'OPENAI_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0 && config.nodeEnv === 'production') {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

module.exports = config;
