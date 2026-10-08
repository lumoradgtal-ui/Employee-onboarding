# 🚀 Vercel Deployment Guide for HRMS Platform

This project is fully configured for seamless 1-click deployment on **Vercel** with a serverless FastAPI Python backend and Vite React frontend.

---

## 📁 Repository Structure Overview for Vercel

```
HRMS-Platform/
├── vercel.json                 # Vercel deployment routes & build rules
├── requirements.txt            # Python backend dependencies
├── .vercelignore               # Ignored files for Vercel deployment
├── api/
│   └── index.py                # Serverless FastAPI backend entry point
├── backend/
│   └── app/
│       ├── main.py             # Main FastAPI API routes
│       └── core.py             # Supabase & Auth core helpers
└── frontend/
    ├── package.json            # React + Vite frontend dependencies
    ├── vite.config.ts
    └── src/
        └── lib/api.ts          # Environment-aware API client
```

---

## ⚡ Deployment Options

### Option A: Deploy via Vercel Dashboard (Recommended)

1. Push your repository to **GitHub / GitLab / Bitbucket**.
2. Log in to [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New Project"**.
3. Import your **HRMS-Platform** repository.
4. **Build Settings**:
   - **Framework Preset**: Other / Vite
   - **Root Directory**: `./` (leave default)
5. **Environment Variables**: Add the following required environment variables:

| Variable Name | Description | Example Value |
|---|---|---|
| `SUPABASE_URL` | Your Supabase Project URL | `https://your-project.supabase.co` |
| `SUPABASE_ANON_KEY` | Your Supabase Anon Key | `eyJhbGci...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase Service Role Key | `eyJhbGci...` |
| `VITE_SUPABASE_URL` | Supabase URL for Frontend | `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anon Key for Frontend | `eyJhbGci...` |
| `CORS_ORIGINS` | Allowed CORS origins (optional) | `*` |

6. Click **Deploy**. Vercel will automatically build the frontend React application and serve the serverless Python backend API.

---

### Option B: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```
2. Run deployment from root directory:
   ```bash
   vercel
   ```
3. For production deployment:
   ```bash
   vercel --prod
   ```

---

## 🛠️ How It Works Under the Hood

1. **Serverless API Routes (`/api/*` & `/health`)**:
   Requests to `/api/*` are handled by `api/index.py` using `@vercel/python` serverless functions.
2. **Static SPA Frontend (`/`)**:
   The Vite React application is compiled into `dist` and served statically with automatic client-side SPA route rewrites to `index.html`.
3. **Environment Adaptability**:
   In local development, the frontend connects to `http://localhost:8000`. In production on Vercel, requests use relative paths (`/api/...`) on the same domain seamlessly.
