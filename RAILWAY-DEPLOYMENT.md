# Railway Deployment Guide

## Project Details

- **Project URL:** https://railway.com/project/d655b3b4-ebe2-4245-b9db-7298deca3388
- **Project Name:** ai-engine-api
- **Environment:** production

## Services Required

### 1. PostgreSQL Database ✅

- **Status:** Already created
- **Variables:** Automatically set by Railway

### 2. API Service (Node.js App)

You should create this service in Railway dashboard:

**Steps to create:**

1. Go to your Railway project dashboard
2. Click "+ New" button
3. Select "GitHub Repo"
4. Connect your `jamassarotech/ai-engine-api` repository
5. Select `main` branch

**OR if you prefer to deploy from local:**

1. Click "+ New"
2. Select "Empty Service"
3. Use the Railway CLI: `railway link` then `railway up`

## Environment Variables

All variables are already set via CLI. Verify these exist in your API service:

### Required API Keys:

- `YOUTUBE_API_KEY` = AIzaSyC08RsPna4dPdTGEVlL_Tg7kaoGSnHCT04
- `OPENAI_API_KEY` = sk-proj-4Yyi8uBK... (your key)
- `NODE_ENV` = production

### Database Connection:

- `DB_HOST` = postgres.railway.internal
- `DB_PORT` = 5432
- `DB_NAME` = railway
- `DB_USER` = postgres
- `DB_PASSWORD` = XroNaOydsAGtmZcqaXzwvsFdJTGSqZbB

## Deployment Configuration

The app uses `railway.json` for configuration:

```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run migrate && npm start"
  }
}
```

## Verify Deployment

### Check if the API is running:

1. In Railway dashboard, find your API service
2. Go to "Settings" tab
3. Under "Networking", click "Generate Domain"
4. Visit: `https://your-app.up.railway.app/`

### Test the API:

```bash
curl -X POST https://your-app.up.railway.app/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "best laptop 2024"}'
```

## Common Issues

### If service keeps crashing:

1. Check "Deployments" tab → Click latest deployment → View logs
2. Most common: Missing environment variables
3. Check that all variables from `.env.example` are set

### If database connection fails:

- Ensure both services are in the same Railway project
- Database variables should reference `postgres.railway.internal` not `localhost`

### If build fails:

- Check that `package.json` has correct start script
- Verify Node.js version in `package.json`: `"engines": { "node": ">=18.0.0" }`

## Next Steps

1. ✅ Commit your code (done)
2. ⏳ Create GitHub service in Railway or deploy via CLI
3. ⏳ Generate public domain
4. ⏳ Test the API endpoint
5. ⏳ (Optional) Set up custom domain

## Quick CLI Commands

Link to your Railway project and check status:

```bash
railway link  # Connect to ai-engine-api project
railway status  # Check all services
railway logs  # View application logs
railway open  # Open project in browser
```

Deploy updates:

```bash
git add .
git commit -m "your changes"
railway up  # Deploy to Railway
```
