# PMCC Analyzer — Free Version (Yahoo Finance)

**100% free. No API keys. No AI costs.**

## How it works
- Stock prices, IV data, and options chains come from Yahoo Finance
- PMCC scoring, trend analysis, and recommendations are calculated with pure algorithms
- No external paid APIs required

## Deploy to Vercel (free)

### Step 1 — Push to GitHub
1. Create a new private repo at github.com
2. In this folder run:
```bash
git init
git add .
git commit -m "PMCC Analyzer"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/pmcc-analyzer.git
git push -u origin main
```

### Step 2 — Deploy on Vercel
1. Go to vercel.com/new
2. Import your GitHub repo
3. Framework: **Next.js** (auto-detected)
4. Click **Deploy** — no environment variables needed!

Your site goes live at `https://pmcc-analyzer.vercel.app`

## Local development
```bash
npm install
npm run dev
# Open http://localhost:3000
```

## Features
- 📊 **Analyze any ticker** — live price, IV rank, trend, LEAP + short call suggestions, PMCC score
- 🔍 **Top Picks** — scans ~10 top stocks and ranks by PMCC score
- 📋 **My Trades** — track all your PMCC positions, call history, cost basis recovery, alerts
- 🔔 **Smart Alerts** — DTE warnings, assignment risk alerts, roll suggestions

## Cost
- Hosting: **Free** (Vercel free tier)
- Data: **Free** (Yahoo Finance)
- Total: **$0/month**
