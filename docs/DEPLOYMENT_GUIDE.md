# Free Cloud Deployment Guide

**Target Architecture**:
* **Frontend**: Cloudflare Pages / Vercel (Free Tier)
* **Backend Database & Auth**: Supabase PostgreSQL (Free Tier)
* **Quant Engine Microservice**: Render.com / Fly.io Container (Free Tier)

---

## 1. Local One-Command Startup
To run the full stack locally (Python Quant Engine + React Trading Terminal):

```bash
npm run start:all
```
* **Quant Engine OpenAPI Docs**: `http://127.0.0.1:8000/docs`
* **Trading Terminal App**: `http://127.0.0.1:3000`

---

## 2. Docker Container Deployment

Build and run using `docker-compose`:

```bash
docker-compose up --build
```

---

## 3. Deploying Python Quant Engine to Render.com (Free Tier)

1. Connect your GitHub repository to Render.com.
2. Select **New Web Service** → choose Docker runtime (or Environment: Python 3.11).
3. Set Build Command: `pip install -r requirements.txt`
4. Set Start Command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
5. Render will automatically expose your Quant Engine at `https://<service-name>.onrender.com`.

---

## 4. Deploying Database to Supabase (Free PostgreSQL)

1. Create a free project on [Supabase.com](https://supabase.com).
2. Go to **SQL Editor** and run the schema defined in `implementation_plan.md`.
3. Copy your `DATABASE_URL` and `SUPABASE_URL` into your environment variables.

---

## 5. Deploying Frontend to Cloudflare Pages / Vercel

1. Import your GitHub repository to Cloudflare Pages or Vercel.
2. Build Command: `npm run build`
3. Output Directory: `dist`
4. Set Environment Variable: `QUANT_ENGINE_URL=https://<your-render-app>.onrender.com/api/v1`
