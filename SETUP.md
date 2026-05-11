# PostgreSQL Database Setup

## Quick Start (Development)

### Option 1: Using Docker (Recommended)

```bash
# Run PostgreSQL in Docker
docker run -d \
  --name ai-engine-postgres \
  -e POSTGRES_DB=ai_engine_db \
  -e POSTGRES_USER=node \
  -e POSTGRES_PASSWORD=dev_password \
  -p 5432:5432 \
  postgres:15

# Run migrations
npm run migrate

# Start server
npm run dev
```

### Option 2: Local PostgreSQL

If PostgreSQL is installed locally:

1. **Update PostgreSQL config for trust auth:**
   
   Edit `/etc/postgresql/15/main/pg_hba.conf`:
   ```
   # Add this line:
   local   all   node   trust
   host    all   node   127.0.0.1/32   trust
   ```

2. **Restart PostgreSQL:**
   ```bash
   sudo service postgresql restart
   ```

3. **Create database:**
   ```bash
   sudo -u postgres createdb ai_engine_db
   sudo -u postgres psql -c "CREATE USER node WITH PASSWORD 'dev_password';"
   sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ai_engine_db TO node;"
   ```

4. **Update .env file:**
   ```env
   DB_USER=node
   DB_PASSWORD=dev_password
   ```

5. **Run migrations:**
   ```bash
   npm run migrate
   ```

### Option 3: Skip Database (API Testing Only)

For quick API testing without database:

1. Comment out database calls in `server.js`
2. Mock the search.service responses
3. Test API endpoints directly

## API Keys Required

Before starting the server, add these to `.env`:

```env
# Get from: https://console.developers.google.com/
YOUTUBE_API_KEY=your_youtube_key_here

# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_key_here
```

## Testing Without External APIs

You can test the API structure without external services:

1. Use test scripts:
   ```bash
   npm run test:services  # Test normalization logic
   ```

2. Mock provider responses in services

## Configuration

All configuration is in `.env`:

- `NODE_ENV` - 'development' or 'production'
- `PORT` - Server port (default: 3000)
- `DB_*` - Database connection settings
- `LOG_LEVEL` - 'debug', 'info', 'warn', 'error'
- `REQUEST_TIMEOUT` - External API timeout (ms)
- `MAX_SOURCES_PER_QUERY` - Max sources to fetch (default: 20)

## Troubleshooting

### Database Connection Failed

**Error:** `client password must be a string`
- Set `DB_PASSWORD` in `.env` or configure trust auth

**Error:** `ECONNREFUSED`
- Start PostgreSQL: `sudo service postgresql start`
- Or use Docker option above

### Missing API Keys

**Error:** `YOUTUBE_API_KEY not configured`
- Get key from Google Cloud Console
- Add to `.env`

**Error:** `OPENAI_API_KEY not configured`
- Get key from OpenAI platform
- Add to `.env`

### Port Already in Use

**Error:** `Port 3000 is already in use`
- Change `PORT` in `.env`
- Or kill process: `lsof -ti:3000 | xargs kill -9`
