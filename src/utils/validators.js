const { z } = require('zod');

// UUID v4 regex pattern
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Schema for POST /api/search request body
const searchRequestSchema = z.object({
  query: z
    .string()
    .min(3, 'Query must be at least 3 characters long')
    .max(500, 'Query must not exceed 500 characters')
    .trim(),
  userId: z
    .string()
    .regex(UUID_V4_REGEX, 'userId must be a valid UUID v4')
    .optional()
    .describe('User ID from frontend localStorage (UUID v4 format)'),
});

module.exports = {
  searchRequestSchema,
};
