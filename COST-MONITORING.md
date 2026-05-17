# Cost Monitoring & Alerts Setup

## Overview

This API includes comprehensive cost monitoring to help you control your OpenAI API spending and Railway hosting costs.

## Features

- ✅ **Daily & Monthly Budget Limits** - Automatically block requests when budgets are exceeded
- ✅ **Real-time Cost Tracking** - Monitor costs via API endpoints
- ✅ **Warning Alerts** - Get notified at 80% budget threshold
- ✅ **Cost Analytics** - View detailed spending breakdowns
- ✅ **Cache Optimization** - Reduce costs with intelligent caching

---

## Quick Start

### 1. Configure Budget Limits

Add these environment variables to control costs:

```bash
# Daily budget limit (default: $5.00)
DAILY_BUDGET_USD=5.00

# Monthly budget limit (default: $100.00)
MONTHLY_BUDGET_USD=100.00

# Alert threshold percentage (default: 0.80 = 80%)
COST_ALERT_THRESHOLD=0.80

# Enable/disable cost limits (default: true)
ENABLE_COST_LIMITS=true
```

### 2. Set Variables on Railway

```bash
railway variables --set DAILY_BUDGET_USD=5.00
railway variables --set MONTHLY_BUDGET_USD=100.00
railway variables --set COST_ALERT_THRESHOLD=0.80
```

### 3. Monitor Costs

Access the monitoring endpoints:

```bash
# Get comprehensive cost stats
curl https://your-api.up.railway.app/api/stats/cost

# Check budget status
curl https://your-api.up.railway.app/api/stats/budget

# View recent logs
curl https://your-api.up.railway.app/api/stats/logs

# See top queries
curl https://your-api.up.railway.app/api/stats/queries
```

---

## Cost Monitoring Endpoints

### GET /api/stats/cost

Returns comprehensive cost statistics.

**Response:**

```json
{
  "success": true,
  "data": {
    "today": {
      "cost": 0.15,
      "budget": 5.0,
      "remaining": 4.85,
      "percentUsed": 3.0,
      "requests": 12,
      "tokensInput": 35000,
      "tokensOutput": 7000
    },
    "thisMonth": {
      "cost": 12.5,
      "budget": 100.0,
      "remaining": 87.5,
      "percentUsed": 12.5,
      "requests": 450,
      "tokensInput": 1250000,
      "tokensOutput": 250000
    },
    "allTime": {
      "cost": 45.75,
      "requests": 1523,
      "tokensInput": 4500000,
      "tokensOutput": 920000,
      "avgCostPerRequest": 0.03
    },
    "cache": {
      "hitRate": 65.5,
      "totalRequests": 152,
      "hits": 100,
      "misses": 52
    },
    "config": {
      "dailyBudget": 5.0,
      "monthlyBudget": 100.0,
      "alertThreshold": 0.8,
      "limitsEnabled": true
    }
  }
}
```

### GET /api/stats/budget

Check current budget status.

**Response:**

```json
{
  "success": true,
  "data": {
    "daily": {
      "period": "daily",
      "currentCost": 0.15,
      "budgetLimit": 5.0,
      "remaining": 4.85,
      "percentUsed": 3.0,
      "exceeded": false,
      "withinLimit": true,
      "nearingLimit": false,
      "message": "Within daily budget"
    },
    "monthly": {
      "period": "monthly",
      "currentCost": 12.5,
      "budgetLimit": 100.0,
      "remaining": 87.5,
      "percentUsed": 12.5,
      "exceeded": false,
      "withinLimit": true,
      "nearingLimit": false,
      "message": "Within monthly budget"
    },
    "alert": "Within budget"
  }
}
```

### GET /api/stats/logs?limit=50

Get recent search logs.

### GET /api/stats/queries?limit=10

Get most popular search queries.

### GET /api/stats/errors?limit=50

Get recent error logs.

---

## Budget Protection

When budget limits are exceeded, the API will:

1. **Block new AI requests** - Returns error: "Daily/Monthly AI budget limit exceeded"
2. **Still serve cached results** - Cached queries continue to work
3. **Log warnings** - Check Railway logs for budget alerts
4. **Auto-reset daily** - Daily budget resets at midnight UTC

**Example Error Response:**

```json
{
  "success": false,
  "error": "Daily AI budget limit exceeded. Please try again tomorrow."
}
```

---

## Railway Monitoring Setup

### 1. Enable Railway Metrics

Railway provides built-in monitoring for:

- CPU usage
- Memory usage
- Network traffic
- Deployment health

Access at: `https://railway.com/project/YOUR_PROJECT_ID`

### 2. Set Up Cost Alerts in Railway

Currently Railway doesn't have built-in cost alerts, but you can:

1. **Check Usage Dashboard**
   - Go to your project → Usage tab
   - View current month's spending
   - Set calendar reminders to check weekly

2. **Set a Payment Limit**
   - Go to Account Settings → Billing
   - Set a spending limit on your payment method

3. **Monitor via API**
   - Set up a cron job to check `/api/stats/budget` daily
   - Send email/Slack alerts when approaching limits

### 3. External Monitoring (Recommended)

Use a monitoring service to track your costs:

**Option A: Cron Job + Webhook**

```bash
# Add to crontab (runs twice daily)
0 */12 * * * curl https://your-api.up.railway.app/api/stats/budget | \
  jq '.data.daily.percentUsed' | \
  awk '{if($1>80) system("curl -X POST https://hooks.slack.com/YOUR_WEBHOOK")}'
```

**Option B: UptimeRobot**

1. Sign up at uptimerobot.com (free)
2. Add HTTP monitor for `/health` endpoint
3. Get alerts if API goes down

**Option C: Better Stack (formerly Logtail)**

1. Sign up at betterstack.com
2. Add log forwarding from Railway
3. Set up alerts on cost warnings

---

## Cost Optimization Tips

### 1. Leverage Caching (Biggest Savings!)

The API caches results for 24 hours by default. This can reduce costs by 60-70%.

**Current cache hit rate:** Check `/api/stats/cost` → `cache.hitRate`

### 2. Reduce Source Limits

Lower the number of sources to analyze:

```bash
# Reduce from defaults
railway variables --set MAX_YOUTUBE_RESULTS=5  # default: 8
railway variables --set MAX_REDDIT_RESULTS=3   # default: 5
```

**Impact:** Lower source counts = fewer tokens = lower cost per request

### 3. Use Smaller Models (Future)

Currently using `gpt-4o` ($5.00/1M input tokens). Future options:

- `gpt-4o-mini` - 60% cheaper
- `gpt-3.5-turbo` - 90% cheaper (lower quality)

### 4. Monitor Popular Queries

Check `/api/stats/queries` to see what users search for most. Pre-cache popular queries to reduce AI calls.

---

## Cost Breakdown

### OpenAI Pricing (gpt-4o)

- **Input:** $5.00 per 1M tokens
- **Output:** $15.00 per 1M tokens

### Typical Request Cost

```
Average request:
- Input tokens: 3,000 (sources + prompt)
- Output tokens: 600 (structured response)
- Cost per request: $0.024

Daily limit of $5.00 = ~208 requests/day
Monthly limit of $100 = ~4,166 requests/month
```

### Railway Hosting Cost

- **Starter Plan:** $5/month (500 hours)
- **Pro Plan:** $20/month (includes $5 usage)
- **Database:** Included in plan

**Total estimated cost:** $5-25/month depending on traffic

---

## Monitoring Best Practices

### Daily Routine

1. Check `/api/stats/budget` in the morning
2. Review cache hit rate (aim for >60%)
3. Monitor Railway dashboard for errors

### Weekly Review

1. Check `/api/stats/queries` - identify popular searches
2. Review `/api/stats/errors` - fix recurring issues
3. Check Railway Usage tab for hosting costs

### Monthly Review

1. Analyze total costs vs budget
2. Adjust limits if needed
3. Review cache effectiveness
4. Optimize source limits

---

## Troubleshooting

### "Daily budget exceeded" error

**Solution:**

1. Wait until midnight UTC for reset
2. Or increase budget: `railway variables --set DAILY_BUDGET_USD=10.00`
3. Check if cache is working: `/api/stats/cost`

### High costs, low cache hit rate

**Solution:**

1. Check if users are searching unique queries
2. Increase cache duration (edit `cacheMaxAgeHours` in code)
3. Reduce source limits to lower cost per query

### Budget not enforcing

**Solution:**

1. Verify `ENABLE_COST_LIMITS=true`
2. Check Railway logs for errors
3. Restart service: `railway up`

---

## Alert Integration Examples

### Send Slack Alert

```javascript
// Add to cost-monitor.service.js
async function sendSlackAlert(message) {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) return;

  await axios.post(webhook, {
    text: `🚨 Cost Alert: ${message}`,
    channel: "#alerts",
  });
}
```

### Send Email via SendGrid

```javascript
// Add to cost-monitor.service.js
async function sendEmailAlert(subject, body) {
  const sgMail = require("@sendgrid/mail");
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  await sgMail.send({
    to: process.env.ALERT_EMAIL,
    from: "alerts@yourdomain.com",
    subject,
    text: body,
  });
}
```

---

## Support

For questions or issues:

1. Check Railway logs: `railway logs`
2. Review error endpoint: `/api/stats/errors`
3. Check Railway Discord: discord.gg/railway

---

## Summary: Cost Control Checklist

- [ ] Set `DAILY_BUDGET_USD` on Railway
- [ ] Set `MONTHLY_BUDGET_USD` on Railway
- [ ] Test budget endpoint: `curl .../api/stats/budget`
- [ ] Set up external monitoring (UptimeRobot, cron, etc.)
- [ ] Review costs weekly via `/api/stats/cost`
- [ ] Monitor cache hit rate (aim for >60%)
- [ ] Set calendar reminder for monthly Railway bill review

**With these settings, you'll have full control over your API costs!** 🎉
