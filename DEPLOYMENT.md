# Deploying Civic Pulse (Vercel + Render)

## Use the production URL

**Always use:** https://civic-pulse-platform.vercel.app

Do **not** use preview links like `civic-pulse-platform-xxxxx-alwin-babys-projects.vercel.app`. Vercel deletes old preview deployments and they return **410 GONE**.

---

## Vercel (frontend)

**Project Settings → Environment Variables:**

| Variable | Value |
|----------|-------|
| `VITE_API_BASE_URL` | `https://civic-pulse-ak6s.onrender.com` |

Redeploy after saving.

---

## Render (backend)

**Build command** (Settings → Build & Deploy):

```
npm install --include=dev && npm run build
```

**Start command:**

```
npm start
```

**Root directory:** `backend`

**Environment → Environment Variables:**

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your live Supabase/Postgres connection string |
| `JWT_SECRET` | Long random secret |
| `SESSION_SECRET` | Long random secret |
| `FRONTEND_ORIGIN` | `https://civic-pulse-platform.vercel.app` |
| `CORS_ORIGIN` | `https://civic-pulse-platform.vercel.app` |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console (required for Google login) |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console (required for Google login) |
| `GOOGLE_REDIRECT_URL` | `https://civic-pulse-ak6s.onrender.com/api/auth/google/callback` |
| `SESSION_SECRET` | Long random secret |
| `JWT_SECRET` | Long random secret |
| `NODE_ENV` | `production` |

**Google Cloud Console** → OAuth client → Authorized redirect URIs:

```
https://civic-pulse-ak6s.onrender.com/api/auth/google/callback
```

Check OAuth config after deploy:

```
https://civic-pulse-ak6s.onrender.com/api/health/oauth
```

All `*Set` fields must be `true`.

After first deploy, run migrations from Render shell or locally against production DB:

```bash
npx prisma db push
```

---

## Google Cloud Console

**Authorized redirect URIs** must include:

```
https://civic-pulse-ak6s.onrender.com/api/auth/google/callback
```

---

## Verify

1. https://civic-pulse-ak6s.onrender.com/api/health → `{"ok":true,"database":"connected"}`
2. https://civic-pulse-platform.vercel.app → login page loads
3. Email login and Google login both redirect back to the **production** Vercel URL
