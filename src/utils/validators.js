const { z } = require('zod');

// Schema for POST /api/search request body
const searchRequestSchema = z.object({
  query: z
    .string()
    .min(3, 'Query must be at least 3 characters long')
    .max(500, 'Query must not exceed 500 characters')
    .trim(),
});

module.exports = {
  searchRequestSchema,
};
