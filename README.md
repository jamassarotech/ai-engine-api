# AI Engine API

AI-powered buying research search engine backend.

## 🎉 MVP COMPLETE!

All 6 implementation phases are complete! See [MVP-COMPLETE.md](MVP-COMPLETE.md) for full details.

## 🚀 Project Status

- **Phase 1: Foundation** ✅ COMPLETED
- **Phase 2: Database Layer** ✅ COMPLETED
- **Phase 3: External Providers** ✅ COMPLETED
- **Phase 4: AI Integration** ✅ COMPLETED
- **Phase 5: Services Layer** ✅ COMPLETED
- **Phase 6: API Layer** ✅ COMPLETED

**Ready to deploy with PostgreSQL + API keys!**

## ⚡ Quick Start

```bash
# 1. Setup PostgreSQL (use Docker or local install)
docker run -d --name ai-engine-postgres \
  -e POSTGRES_DB=ai_engine_db \
  -e POSTGRES_USER=node \
  -e POSTGRES_PASSWORD=dev_password \
  -p 5432:5432 \
  postgres:15

# 2. Run migrations
npm run migrate

# 3. Add API keys to .env
# YOUTUBE_API_KEY=your_key
# OPENAI_API_KEY=your_key

# 4. Start server
npm run dev

# 5. Test it!
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "is lg c4 worth it"}'
```

See [SETUP.md](SETUP.md) for detailed setup instructions.

## 📁 Project Structure

```
ai-engine-api/
├── src/
│   ├── config/          # Configuration and environment variables
│   ├── controllers/     # Request handlers
│   ├── db/              # Database connection and migrations
│   ├── middleware/      # Express middleware
│   ├── providers/       # External API integrations (YouTube, Reddit, OpenAI)
│   ├── repositories/    # Database operations
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   └── utils/           # Utilities (logger, errors, validators, slug)
├── scripts/             # Migration and utility scripts
├── .env                 # Environment variables (DO NOT COMMIT)
├── .env.example         # Environment variables template
└── package.json
```

## 🔧 Setup Instructions

### 1. Install Dependencies

Dependencies are already installed. If needed:

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:
- `YOUTUBE_API_KEY` - Get from [Google Cloud Console](https://console.cloud.google.com/)
- `OPENAI_API_KEY` - Get from [OpenAI Platform](https://platform.openai.com/)
- `DB_*` - PostgreSQL database credentials

### 3. Set Up PostgreSQL Database

Create the database:

```bash
# Using psql
createdb ai_engine_db

# Or connect to PostgreSQL and run:
# CREATE DATABASE ai_engine_db;
```

### 4. Run Database Migration

Apply the schema:

```bash
npm run migrate
```

This will create all necessary tables:
- `queries` - Search queries
- `query_results` - AI-generated analysis
- `sources` - YouTube/Reddit sources
- `search_logs` - Request logs

### 5. Start Development Server

Once Phase 2+ is complete:

```bash
npm run dev
```

## 📋 Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run migrate` - Run database migrations

## 🏗️ Implementation Phases

### ✅ Phase 1: Foundation (COMPLETED)
- [x] npm dependencies installed
- [x] Folder structure created
- [x] Configuration module (`config/index.js`)
- [x] Database connection pool (`db/connection.js`)
- [x] Migration script (`001_initial_schema.sql`)
- [x] Logger utility with Winston
- [x] Custom error classes
- [x] Validators with Zod
- [x] Slug generator

### 🔄 Phase 2: Database Layer (NEXT)
- [ ] Query repository
- [ ] Result repository
- [ ] Source repository
- [ ] Log repository

### 🔄 Phase 3: External Providers
- [ ] YouTube provider
- [ ] Reddit provider

### 🔄 Phase 4: AI Integration
- [ ] OpenAI provider with structured outputs

### 🔄 Phase 5: Services Layer
- [ ] Normalization service
- [ ] Cache service
- [ ] Analysis service
- [ ] Search service

### 🔄 Phase 6: API Layer
- [ ] Search controller
- [ ] Search routes
- [ ] Error handler middleware
- [ ] Request logger middleware
- [ ] App setup
- [ ] Server entry point

### 🔄 Phase 7: Testing & Refinement
- [ ] Manual testing
- [ ] Error scenario testing
- [ ] Documentation

## 🔑 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment mode | No | `development` |
| `PORT` | Server port | No | `3000` |
| `DB_HOST` | PostgreSQL host | No | `localhost` |
| `DB_PORT` | PostgreSQL port | No | `5432` |
| `DB_NAME` | Database name | No | `ai_engine_db` |
| `DB_USER` | Database user | No | `postgres` |
| `DB_PASSWORD` | Database password | Yes | - |
| `YOUTUBE_API_KEY` | YouTube Data API key | Yes | - |
| `OPENAI_API_KEY` | OpenAI API key | Yes | - |
| `LOG_LEVEL` | Winston log level | No | `info` |
| `REQUEST_TIMEOUT` | Request timeout (ms) | No | `30000` |
| `MAX_SOURCES_PER_QUERY` | Max sources to fetch | No | `20` |

## 📊 Database Schema

### Tables

1. **queries** - Stores search queries
   - `id`, `original_query`, `normalized_query`, `slug`, `query_type`, `status`, `created_at`, `updated_at`

2. **query_results** - AI-generated analysis
   - `id`, `query_id`, `summary`, `pros_json`, `cons_json`, `warnings_json`, `quotes_json`, `confidence`, `ai_model`, `tokens_*`, `ai_cost`, `generated_at`

3. **sources** - External content sources
   - `id`, `query_id`, `source_type`, `title`, `url`, `author`, `published_at`, `text`, `score`, `created_at`

4. **search_logs** - Request analytics
   - `id`, `query`, `normalized_query`, `cached`, `latency_ms`, `tokens_*`, `ai_cost`, `error_message`, `created_at`

## 🎯 API Specification

### POST /api/search

**Request:**
```json
{
  "query": "is lg c4 worth it"
}
```

**Response:**
```json
{
  "query": "is lg c4 worth it",
  "metadata": {
    "sourceCount": 18,
    "lastUpdated": "2026-05-10T12:00:00Z",
    "cached": true,
    "confidence": "high"
  },
  "summary": {
    "title": "LG C4 — Quick Answer",
    "verdict": "Recommended for movies and gaming, but not ideal for bright rooms."
  },
  "pros": [],
  "cons": [],
  "warnings": [],
  "quotes": [],
  "sources": {
    "youtube": [],
    "reddit": []
  }
}
```

## 📝 Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js 5.x
- **Database:** PostgreSQL 15+
- **Validation:** Zod
- **Logging:** Winston
- **AI:** OpenAI API
- **External APIs:** YouTube Data API v3, Reddit JSON API

## 🚧 Development Constraints

This is an MVP build with the following constraints:
- ✅ Express.js (not NestJS)
- ✅ PostgreSQL (no Redis yet)
- ✅ No queue system yet (no BullMQ)
- ✅ No authentication yet
- ✅ No affiliate logic yet
- ✅ Query-driven (not product-driven)

## 📄 License

ISC
