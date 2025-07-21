# 🏃‍♂️ Server Keep-Alive Service

## What This Does
Prevents your Render backend from sleeping by pinging it every 10 minutes.

## Option 1: UptimeRobot (Recommended - Free & Easy)

### Setup:
1. **Go to:** https://uptimerobot.com/
2. **Sign up** for a free account
3. **Create New Monitor:**
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** CSX Backend Keep-Alive
   - **URL:** `https://api.csxnaillounge.co.uk/ping`
   - **Monitoring Interval:** 5 minutes
4. **Save Monitor**

### Benefits:
- ✅ Completely free
- ✅ Also monitors if your site goes down
- ✅ Email alerts if issues
- ✅ No code needed

## Option 2: Cron-Job.org (Alternative)

1. **Go to:** https://cron-job.org/
2. **Sign up** for free account
3. **Create new cronjob:**
   - **URL:** `https://api.csxnaillounge.co.uk/ping`
   - **Schedule:** Every 10 minutes
   - **Method:** GET

## Option 3: GitHub Actions (Advanced)

Create this file in your repo: `.github/workflows/keep-alive.yml`

```yaml
name: Keep Server Alive
on:
  schedule:
    - cron: '*/10 * * * *'  # Every 10 minutes
  workflow_dispatch:

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Server
        run: |
          curl -f https://api.csxnaillounge.co.uk/ping || exit 1
```

## Option 4: Simple Node.js Script (Self-Hosted)

If you have another server running 24/7:

```javascript
// keep-alive.js
const https = require('https');

const pingServer = () => {
  const options = {
    hostname: 'api.csxnaillounge.co.uk',
    path: '/ping',
    method: 'GET'
  };

  const req = https.request(options, (res) => {
    console.log(`Ping successful: ${res.statusCode} at ${new Date().toISOString()}`);
  });

  req.on('error', (error) => {
    console.error('Ping failed:', error.message);
  });

  req.end();
};

// Ping every 10 minutes
setInterval(pingServer, 10 * 60 * 1000);
console.log('Keep-alive service started...');
```

## 🎯 Recommended Approach

**Use UptimeRobot** because:
- ✅ Free and reliable
- ✅ Also monitors your site health
- ✅ Sends alerts if your site goes down
- ✅ No maintenance required
- ✅ Works immediately

## 📊 Monitoring Your Endpoints

After deployment, you can monitor:
- **Health:** `https://api.csxnaillounge.co.uk/health`
- **Ping:** `https://api.csxnaillounge.co.uk/ping`
- **Frontend:** `https://csxnaillounge.co.uk`

## ⚠️ Important Notes

- **Render Free Tier:** Sleeps after 15 minutes of inactivity
- **Monthly Limit:** 750 hours/month (enough for 24/7 with keep-alive)
- **Cold Starts:** First request after sleep takes 10-30 seconds
- **Keep-alive:** Prevents sleep, ensures fast response times

Start with UptimeRobot - it's the easiest and most reliable option! 🚀
