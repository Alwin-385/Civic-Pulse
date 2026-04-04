# 🏛️ Civic Pulse

> **Empowering Communities. Resolving Infrastructure Challenges in Real-Time.**

**Civic Pulse** is a comprehensive, full-stack Progressive Web Application (PWA) and Mobile-ready platform designed to dynamically bridge the gap between citizens and critical government infrastructure departments (such as KSEB and PWD). 

The application provides a seamless pipeline for citizens to instantly report, geolocate, and track infrastructure failures, whilst providing government officials with high-level analytical dashboards, interactive geographic heatmaps, and automated PDF report generation.

---

## ⚡ Features

### 🧑‍🤝‍🧑 Citizen Portal
- **One-Click Issue Reporting:** Effortlessly report infrastructure issues with high-resolution image uploads.
- **Smart Geotagging:** Automatically extracts exact GPS coordinates seamlessly from uploaded photos.
- **Real-Time Tracking:** Citizens can track the progression of their complaints from 'Reported' to 'Dispatched' to 'Resolved'.
- **Seamless Authentication:** Frictionless secure login utilizing **Google OAuth** or native Encrypted Email/PIN login.

### 🏢 Official Command Center (KSEB / PWD)
- **Role-Based Workspaces:** Dedicated analytical matrices for KSEB (Electricity) and PWD (Public Works) departments.
- **Interactive Geo-Spatial Maps:** Visualize complaint densities dynamically across regions using **Leaflet Maps**.
- **Automated PDF Document Generation:** Instantly compile division analytics and generate official multi-page PDF ledgers using **jsPDF** & **AutoTable**.
- **Complaint Matrix Allocation:** Triage, update statuses, and dispatch workforce teams to high-priority grids.
- **Micro-animations & Stunning UI:** Extremely premium interface built with **Tailwind CSS**, featuring dark-glass frosted aesthetics and Recharts data analytics.

### 📱 Progressive Web App (PWA) Capabilities
- **Desktop/Mobile Native Installability:** Installs instantly on Android, Windows, and macOS operating systems mirroring a standalone native application framework without an App Store.

---

## 🛠️ Technology Stack

**Frontend:**
*   React 18 & TypeScript
*   Vite (Blazing fast build engine)
*   Tailwind CSS (Core styling framework)
*   Leaflet.js (Geospatial mapping infrastructure)
*   Recharts (Data analytics visualization)

**Backend:**
*   Node.js & Express.js
*   Prisma ORM (PostgreSQL Database mapping)
*   Passport.js (Google OAuth Authentication)
*   JSON Web Tokens (JWT) & Express-Sessions
*   Multer (Multipart/form-data upload system)
*   Nodemailer (Secure OTP generation & notifications)

**Infrastructure:**
*   **Frontend Deployment:** Vercel
*   **Backend Deployment:** Render 
*   **Database Host:** PostgreSQL Database cluster

---

## 🚀 Local Development Setup

To run this repository locally on your machine, follow these steps:

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL Database (Local or Cloud)

### 1. Clone the Repository
```bash
git clone https://github.com/Alwin-385/Civic-Pulse.git
cd Civic-Pulse
```

### 2. Configure Backend
```bash
cd backend
npm install
```
Create a `.env` file in the `backend/` directory:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/civicpulse"
JWT_SECRET="super_secret_jwt_key_change_this"
SESSION_SECRET="super_secret_session_key"
FRONTEND_ORIGIN="http://localhost:3000"
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
GOOGLE_REDIRECT_URL="http://localhost:5000/api/auth/google/callback"
```
Migrate the Database & Start the Server:
```bash
npx prisma migrate dev --name init
npm run dev
```

### 3. Configure Frontend
```bash
cd ../frontend
npm install
```
Start the Vite Development Server:
```bash
npm run dev
```

### 4. Visit the Application
Open your browser and navigate to `http://localhost:3000`.

---

## 🛡️ License

This project is proprietary and meant for demonstration and civic-service improvement purposes.
