const { z } = require("zod");

/**
 * Zod Schemas for AI Analysis
 * Used for OpenAI structured outputs and validation
 */

// Pro item schema
const proSchema = z.object({
  point: z.string().describe("A positive aspect or benefit"),
  sources: z
    .array(z.string())
    .describe("URLs or references supporting this pro"),
});

// Con item schema
const conSchema = z.object({
  point: z.string().describe("A negative aspect or drawback"),
  sources: z
    .array(z.string())
    .describe("URLs or references supporting this con"),
});

// Warning schema
const warningSchema = z.object({
  warning: z.string().describe("A caution or important consideration"),
  severity: z
    .enum(["high", "medium", "low"])
    .describe("Severity level of the warning"),
});

// Quote schema
const quoteSchema = z.object({
  text: z.string().describe("The exact quote or key statement"),
  author: z.string().describe("Author or source of the quote"),
  source: z.string().describe("Source name (channel, subreddit, username)"),
  url: z.string().describe("URL to the original source"),
});

// Summary schema
const summarySchema = z.object({
  title: z
    .string()
    .describe('Brief title for the analysis (e.g., "LG C4 — Quick Answer")'),
  verdict: z.string().describe("1-2 sentence recommendation or conclusion"),
});

// Recommendation schema (for AI generation)
// Note: imageUrl and amazonUrl are added during enrichment, not by AI
const recommendationSchema = z.object({
  name: z
    .string()
    .describe(
      'Specific product name or model number (e.g., "Sony WH-1000XM5", not "wireless headphones")',
    ),
  summary: z
    .string()
    .describe("Brief reason why this product is recommended (1 sentence)"),
  score: z
    .number()
    .min(0)
    .max(100)
    .describe("Recommendation score from 0-100 based on analysis"),
});

// Complete AI analysis response schema
const aiAnalysisSchema = z.object({
  summary: summarySchema,
  pros: z.array(proSchema).describe("Array of positive aspects"),
  cons: z.array(conSchema).describe("Array of negative aspects"),
  warnings: z
    .array(warningSchema)
    .describe("Array of warnings or important considerations"),
  recommendations: z
    .array(recommendationSchema)
    .describe(
      "Array of specific product recommendations (empty if query is not product-related)",
    ),
  quotes: z.array(quoteSchema).describe("Array of notable quotes from sources"),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe("Confidence level based on source quality and consensus"),
});

// Type exports for TypeScript-like usage in JSDoc
/**
 * @typedef {z.infer<typeof proSchema>} Pro
 * @typedef {z.infer<typeof conSchema>} Con
 * @typedef {z.infer<typeof warningSchema>} Warning
 * @typedef {z.infer<typeof quoteSchema>} Quote
 * @typedef {z.infer<typeof summarySchema>} Summary
 * @typedef {z.infer<typeof recommendationSchema>} Recommendation
 * @typedef {z.infer<typeof aiAnalysisSchema>} AIAnalysis
 */

module.exports = {
  proSchema,
  conSchema,
  warningSchema,
  quoteSchema,
  summarySchema,
  recommendationSchema,
  aiAnalysisSchema,
};
