# PMCC Analyzer — Deployment Guide

## What you need
- A free [Vercel account](https://vercel.com) (sign up with GitHub)
- A free [GitHub account](https://github.com) (to host the code)
- An [Anthropic API key](https://console.anthropic.com) (~$5 to start, ~$0.01–0.03 per analysis)

---

## Step 1 — Get your Anthropic API key
1. Go to https://console.anthropic.com
2. Sign up / log in
3. Click **API Keys** → **Create Key**
4. Copy the key (starts with `sk-ant-...`)
5. Add a payment method and load $5 credit

---

## Step 2 — Put the code on GitHub
1. Go to https://github.com/new and create a **private** repository named `pmcc-analyzer`
2. On your computer, open a terminal in the `pmcc-site` folder
3. Run these commands:
```bash
git init
git add .
git commit -m "Initial PMCC Analyzer"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/pmcc-analyzer.git
git push -u origin main
```

---

## Step 3 — Deploy to Vercel
1. Go to https://vercel.com/new
2. Click **Import Git Repository** → select your `pmcc-analyzer` repo
3. Keep all settings as default — Vercel auto-detects Next.js
4. Click **Environment Variables** and add:
   - Key: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-YOUR_KEY_HERE`
5. Click **Deploy**

Your site will be live at `https://pmcc-analyzer.vercel.app` in ~2 minutes.

---

## Step 4 — Custom domain (optional)
1. In Vercel dashboard → **Domains**
2. Add your domain (e.g. `pmcc.yourdomain.com`)
3. Follow the DNS instructions — SSL is automatic

---

## Local development
```bash
npm install
# Edit .env.local and add your API key
npm run dev
# Open http://localhost:3000
```

---

## Security notes
- Your API key is stored in Vercel's environment variables — **never** in the code
- The key is only used server-side in `/api/*` routes — it never reaches the browser
- All traffic is HTTPS by default on Vercel
- The `.gitignore` prevents `.env.local` from being committed to GitHub

---

## Cost estimates
| Action | Approx cost |
|--------|-------------|
| Analyze one ticker | ~$0.02 |
| Top picks scan | ~$0.04 |
| Position AI check | ~$0.02 |
| 100 analyses/month | ~$2.00 |
