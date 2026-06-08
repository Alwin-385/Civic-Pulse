<p align="center">
  <strong>Civic Pulse</strong><br/>
  Smart Civic Issue Reporting for KSEB &amp; PWD
</p>

<p align="center">
  <a href="https://civic-pulse-platform.vercel.app">Live App</a> ·
  <a href="https://civic-pulse-ak6s.onrender.com/api/health">API Health</a> ·
  <a href="DEPLOYMENT.md">Deployment Guide</a> ·
  <a href="https://github.com/Alwin-385/Civic-Pulse">GitHub</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Deploy-Vercel%20%2B%20Render-000000" alt="Deploy" />
</p>

---

## Overview

**Civic Pulse** is a full-stack civic engagement platform that connects residents with government infrastructure departments — **KSEB** (electricity) and **PWD** (public works). Citizens report issues with photos and location data; officials triage complaints, dispatch field staff, and track resolution through a unified dashboard.

The system supports dual roles (Citizen / Official), real-time status tracking, in-app notifications, optional email alerts, PDF exports, and interactive maps with complaint heatmaps.

| | |
|---|---|
| **Live frontend** | [civic-pulse-platform.vercel.app](https://civic-pulse-platform.vercel.app) |
| **Backend API** | [civic-pulse-ak6s.onrender.com](https://civic-pulse-ak6s.onrender.com) |
| **Repository** | [github.com/Alwin-385/Civic-Pulse](https://github.com/Alwin-385/Civic-Pulse) |

---

## Table of Contents

- [Key Features](#key-features)
- [Architecture](#architecture)
- [Complaint Lifecycle](#complaint-lifecycle)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Security Notes](#security-notes)
- [License](#license)

---

## Key Features

### Citizen Portal

- Register and sign in with **email/password** or **Google OAuth**
- File complaints with title, description, severity, and department (KSEB / PWD)
- Upload up to **3 geotagged photos** (EXIF GPS auto-fills location when available)
- Track complaint status with live updates and status history
- Submit feedback after resolution
- In-app notification bell for status changes

### Official Command Center

- Department-scoped dashboards (KSEB / PWD) with analytics and charts
- Manage complaints: filter, review, update status, dispatch staff
- Assign field workers and auto-increment workload tracking
- Interactive **Leaflet** maps and complaint **heatmaps** (Kerala region)
- Export per-complaint **PDF reports** (jsPDF + AutoTable)
- Staff CRUD: create, update, delete, and reassign personnel

### Platform

- JWT + httpOnly cookie authentication
- Role-based access control (Citizen vs Official)
- Cloudinary image hosting
- Gmail SMTP for transactional emails (non-blocking)
- PWA-ready frontend (`manifest.json`, service worker)
- Optimized for Render free-tier cold starts (timeouts, retries, API wake-up)

---

## Architecture

```mermaid
flowchart TB
  subgraph Client
    FE[React + Vite SPA]
  end

  subgraph Vercel
    FE
  end

  subgraph Render
    API[Express API]
    PP[Passport Google OAuth]
  end

  subgraph Data
    DB[(Supabase PostgreSQL)]
    CL[Cloudinary]
    GM[Gmail SMTP]
  end

  FE -->|REST + JWT| API
  API --> PP
  API --> DB
  API --> CL
  API -.->|async| GM
  PP -->|OAuth callback| FE
```

---

## Complaint Lifecycle

```
REPORTED → ACKNOWLEDGED → DISPATCHED → IN_PROGRESS → RESOLVED
```

| Status | Meaning |
|--------|---------|
| `REPORTED` | Citizen submitted the complaint |
| `ACKNOWLEDGED` | Official has reviewed the ticket |
| `DISPATCHED` | Field staff assigned |
| `IN_PROGRESS` | Work underway |
| `RESOLVED` | Issue closed; citizen can leave feedback |

Each transition is recorded in `ComplaintStatusHistory` with optional notes and timestamps.

---

## Tech Stack

| Layer | Technologies |
|-------|----------------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Recharts, Leaflet, jsPDF |
| **Backend** | Node.js, Express 5, TypeScript, Prisma ORM |
| **Database** | PostgreSQL (Supabase) |
| **Auth** | JWT, Passport.js (Google OAuth 2.0), bcrypt |
| **Storage** | Cloudinary (images) |
| **Email** | Nodemailer (Gmail SMTP) |
| **Deploy** | Vercel (frontend), Render (backend) |

---

## Project Structure

```
Civic-Pulse/
├── frontend/                 # React SPA (Vite)
│   ├── screens/              # Page-level components
│   ├── components/           # Shared UI (Layout, Notifications)
│   ├── apiClient.ts          # HTTP client with timeouts & retries
│   ├── authStore.ts          # JWT / localStorage helpers
│   └── vercel.json           # SPA routing
│
├── backend/                  # Express API
│   ├── src/
│   │   ├── controllers/      # Route handlers
│   │   ├── routes/           # API route definitions
│   │   ├── middleware/       # Auth, roles, upload, errors
│   │   ├── config/           # Prisma, Passport, env helpers
│   │   └── utils/            # Email, OTP, Cloudinary
│   ├── prisma/
│   │   └── schema.prisma     # Database models
│   ├── .env.example          # Environment template
│   └── render.yaml           # Render service config
│
├── DEPLOYMENT.md             # Production deploy checklist
└── docker-compose.yml        # Optional local PostgreSQL
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **npm** 9+
- **PostgreSQL** — Supabase (recommended) or local Docker
- **Google Cloud** OAuth client (for Google sign-in)
- **Cloudinary** account (for image uploads)

### 1. Clone the repository

```bash
git clone https://github.com/Alwin-385/Civic-Pulse.git
cd Civic-Pulse
```

### 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env   # then edit .env with your values
npx prisma db push
npm run dev
```

API runs at **http://localhost:5000**.

### 3. Frontend setup

```bash
cd ../frontend
npm install
npm run dev
```

App runs at **http://localhost:3000**.

### 4. Optional — local PostgreSQL (Docker)

```bash
# From repo root
docker compose up -d
```

Then set in `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/civicpulse?schema=public"
```

Run `npx prisma db push` again.

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env`. Never commit `.env` files.

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase **session pooler** URI (port **5432**) |
| `JWT_SECRET` | Secret for signing access tokens |
| `SESSION_SECRET` | Express session secret (OAuth flow) |
| `FRONTEND_ORIGIN` | Frontend URL for CORS and OAuth redirects |
| `CORS_ORIGIN` | Allowed browser origin |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REDIRECT_URL` | `http://localhost:5000/api/auth/google/callback` (local) |
| `SMTP_*` | Gmail SMTP for email notifications |
| `CLOUDINARY_*` | Image upload credentials |

**Frontend** (Vercel / `frontend/.env.local`):

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Backend URL (e.g. `http://localhost:5000`) |

---

## API Overview

Base URL: `http://localhost:5000` (local) · `https://civic-pulse-ak6s.onrender.com` (production)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/health` | Public | Database connectivity check |
| `GET` | `/api/health/oauth` | Public | OAuth configuration diagnostic |
| `POST` | `/api/auth/register` | Public | Create account |
| `POST` | `/api/auth/login` | Public | Email/password login |
| `GET` | `/api/auth/google` | Public | Start Google OAuth |
| `GET` | `/api/auth/me` | Auth | Current user profile |
| `POST` | `/api/complaints` | Citizen | Submit complaint |
| `GET` | `/api/complaints/mine` | Citizen | List own complaints |
| `GET` | `/api/complaints` | Official | List department complaints |
| `PATCH` | `/api/complaints/:id/status` | Official | Update status |
| `POST` | `/api/assignments` | Official | Dispatch staff |
| `GET` | `/api/staff` | Official | List staff |
| `POST` | `/api/upload` | Auth | Upload images (max 3) |
| `GET` | `/api/notifications` | Auth | User notifications |
| `GET` | `/api/reports/dashboard` | Official | Dashboard statistics |

Protected routes require `Authorization: Bearer <token>` or an httpOnly `token` cookie.

---

## Deployment

Production uses **Vercel** (frontend) + **Render** (backend) + **Supabase** (database).

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full checklist, including:

- Render build command with `prisma db push`
- Supabase connection string format (session pooler, port 5432)
- Google OAuth redirect URIs
- Vercel `VITE_API_BASE_URL`
- Health check verification

**Always use the production URL:** [civic-pulse-platform.vercel.app](https://civic-pulse-platform.vercel.app)  
Avoid Vercel preview links — expired previews return `410 Gone`.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Google login fails | OAuth client missing or wrong credentials on Render | Set `GOOGLE_CLIENT_ID` / `SECRET`; add redirect URI in Google Cloud |
| `database_unavailable` | Wrong `DATABASE_URL` on Render | Use Supabase **session pooler** port **5432**; no quotes around URL |
| Stuck on "Checking session…" | Render cold start | Wait 30s and refresh; redeploy latest frontend |
| Admin action timeout | Render waking + slow SMTP | Latest code sends email async; redeploy backend |
| `410 Gone` on Vercel | Using an old preview URL | Use production URL above |
| Schema errors after update | DB out of sync | Run `npx prisma db push` locally or redeploy Render |

**Diagnostics:**

```text
GET https://civic-pulse-ak6s.onrender.com/api/health
GET https://civic-pulse-ak6s.onrender.com/api/health/oauth
```

---

## Security Notes

- Never commit `.env`, credentials, or API keys to Git
- Rotate `JWT_SECRET`, database passwords, and OAuth secrets for production
- Use Gmail **App Passwords** (not your account password) for SMTP
- Add test users in Google Cloud while OAuth app is in **Testing** mode
- Official routes are protected by role middleware (`CITIZEN` vs `OFFICIAL`)

---

## License

This project is proprietary and intended for demonstration and civic-service improvement purposes.

---

<p align="center">
  Built for smarter civic infrastructure reporting in Kerala.<br/>
  <sub>KSEB · PWD · Citizens · Officials — connected in one platform.</sub>
</p>
