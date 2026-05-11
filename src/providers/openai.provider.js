const OpenAI = require('openai');
const { zodResponseFormat } = require('openai/helpers/zod');
const config = require('../config');
const logger = require('../utils/logger');
const { AIError } = require('../utils/errors');
const { aiAnalysisSchema } = require('../utils/schemas');

/**
 * OpenAI Provider
 * Integrates with OpenAI API for structured analysis generation
 */

let openai = null;

/**
 * Initialize OpenAI client
 * @returns {OpenAI} OpenAI client instance
 */
function getClient() {
  if (!openai) {
    if (!config.openaiApiKey) {
      throw new AIError('OpenAI API key not configured');
    }
    openai = new OpenAI({ apiKey: config.openaiApiKey });
  }
  return openai;
}

/**
 * Generate structured buying analysis from sources
 * @param {string} query - Original search query
 * @param {Array} sources - Array of normalized sources (YouTube, Reddit)
 * @param {Object} options - Generation options
 * @param {string} options.model - Model to use (default: gpt-4o)
 * @param {number} options.temperature - Temperature (default: 0.3)
 * @returns {Promise<Object>} Analysis result with metadata
 */
async function generateAnalysis(query, sources, options = {}) {
  const {
    model = 'gpt-4o',
    temperature = 0.3,
  } = options;

  if (!sources || sources.length === 0) {
    throw new AIError('No sources provided for analysis');
  }

  try {
    logger.info('Generating AI analysis', { query, sourceCount: sources.length, model });

    const startTime = Date.now();

    // Prepare sources for AI prompt
    const sourcesText = formatSourcesForPrompt(sources);

    // Build system and user prompts
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(query, sourcesText);

    // Call OpenAI with structured output
    const client = getClient();
    const completion = await client.chat.completions.create({
      model,
      temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: zodResponseFormat(aiAnalysisSchema, 'buying_analysis'),
    });

    const latencyMs = Date.now() - startTime;

    // Extract result
    const message = completion.choices[0]?.message;
    if (!message?.content) {
      throw new AIError('No response from OpenAI');
    }

    // Parse JSON response
    const analysis = JSON.parse(message.content);

    // Validate with Zod
    const validatedAnalysis = aiAnalysisSchema.parse(analysis);

    // Calculate cost (approximate)
    const usage = completion.usage;
    const cost = calculateCost(model, usage.prompt_tokens, usage.completion_tokens);

    logger.info('AI analysis completed', {
      query,
      latencyMs,
      tokensInput: usage.prompt_tokens,
      tokensOutput: usage.completion_tokens,
      cost,
    });

    return {
      analysis: validatedAnalysis,
      metadata: {
        model,
        tokens_input: usage.prompt_tokens,
        tokens_output: usage.completion_tokens,
        ai_cost: cost,
        latency_ms: latencyMs,
      },
    };
  } catch (error) {
    return handleOpenAIError(error, query);
  }
}

/**
 * Format sources for AI prompt
 * @param {Array} sources - Normalized sources
 * @returns {string} Formatted sources text
 */
function formatSourcesForPrompt(sources) {
  return sources
    .map((source, index) => {
      const type = source.source_type.toUpperCase();
      const date = source.published_at ? new Date(source.published_at).toLocaleDateString() : 'Unknown date';
      
      return `
[${index + 1}] ${type} | ${source.title}
Author: ${source.author || 'Unknown'}
Published: ${date}
Score: ${source.score?.toLocaleString() || 0} ${source.source_type === 'youtube' ? 'views' : 'upvotes'}
URL: ${source.url}
Content: ${source.text ? source.text.substring(0, 1000) : 'No content available'}
${source.text && source.text.length > 1000 ? '...' : ''}
---`;
    })
    .join('\n');
}

/**
 * Build system prompt for AI
 * @returns {string} System prompt
 */
function buildSystemPrompt() {
  return `You are an expert buying research analyst. Your role is to analyze user-generated content from YouTube and Reddit to provide objective, data-driven buying advice.

Your analysis should:
- Be balanced and objective
- Highlight both positive and negative aspects
- Include important warnings or caveats
- Extract notable quotes that support key points
- Provide a clear, actionable verdict
- Base confidence on source quality, recency, and consensus

Guidelines:
- Focus on practical buying decision factors
- Prioritize recent information
- Note contradictions or disagreements in sources
- Flag potential biases (sponsored content, fanboy posts, etc.)
- Consider different use cases and buyer profiles
- Be concise but thorough

Response format:
- Summary: Brief title + 1-2 sentence verdict
- Pros: List positive aspects with source references
- Cons: List negative aspects with source references
- Warnings: Flag important caveats (price, compatibility, alternatives)
- Quotes: Extract 3-5 impactful quotes from sources
- Confidence: High (strong consensus), Medium (mixed), Low (limited/conflicting data)`;
}

/**
 * Build user prompt for specific query
 * @param {string} query - Search query
 * @param {string} sourcesText - Formatted sources
 * @returns {string} User prompt
 */
function buildUserPrompt(query, sourcesText) {
  return `Query: "${query}"

Analyze the following sources and provide a structured buying analysis:

${sourcesText}

Based on these sources, generate a comprehensive buying analysis for: "${query}"`;
}

/**
 * Calculate estimated cost for OpenAI API call
 * @param {string} model - Model name
 * @param {number} inputTokens - Input tokens
 * @param {number} outputTokens - Output tokens
 * @returns {number} Cost in USD
 */
function calculateCost(model, inputTokens, outputTokens) {
  // Pricing as of 2026 (approximate)
  const pricing = {
    'gpt-4o': { input: 2.5 / 1_000_000, output: 10 / 1_000_000 },
    'gpt-4o-mini': { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
    'gpt-4-turbo': { input: 10 / 1_000_000, output: 30 / 1_000_000 },
    'gpt-4': { input: 30 / 1_000_000, output: 60 / 1_000_000 },
  };

  const rates = pricing[model] || pricing['gpt-4o'];
  const cost = (inputTokens * rates.input) + (outputTokens * rates.output);

  return parseFloat(cost.toFixed(6));
}

/**
 * Test a simple completion
 * @param {string} prompt - Test prompt
 * @returns {Promise<Object>} Test result
 */
async function testCompletion(prompt = 'Say hello') {
  try {
    const client = getClient();
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 50,
    });

    logger.info('OpenAI test completion successful');
    return {
      success: true,
      response: completion.choices[0]?.message?.content,
    };
  } catch (error) {
    logger.error('OpenAI test failed', { error: error.message });
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Handle OpenAI API errors
 * @param {Error} error - Error object
 * @param {string} context - Context (query)
 * @throws {AIError}
 */
function handleOpenAIError(error, context) {
  if (error.status) {
    const { status, message } = error;

    // Rate limit
    if (status === 429) {
      logger.error('OpenAI rate limit exceeded', { context });
      throw new AIError('OpenAI rate limit exceeded. Please try again later.', error);
    }

    // Authentication
    if (status === 401) {
      logger.error('OpenAI authentication failed', { context });
      throw new AIError('OpenAI API authentication failed', error);
    }

    // Service error
    if (status >= 500) {
      logger.error('OpenAI service error', { status, message, context });
      throw new AIError('OpenAI service temporarily unavailable', error);
    }

    // Other errors
    logger.error('OpenAI API error', { status, message, context });
    throw new AIError(`OpenAI API error: ${message}`, error);
  }

  // Network or other errors
  if (error.code === 'ECONNABORTED') {
    logger.error('OpenAI request timeout', { context });
    throw new AIError('OpenAI request timeout', error);
  }

  // Parsing error
  if (error instanceof SyntaxError) {
    logger.error('Failed to parse OpenAI response', { error: error.message, context });
    throw new AIError('Failed to parse AI response', error);
  }

  // Unknown error
  logger.error('OpenAI provider error', { error: error.message, context });
  throw new AIError('AI analysis failed', error);
}

module.exports = {
  generateAnalysis,
  testCompletion,
};
