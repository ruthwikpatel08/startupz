# StartupZ 🚀

> **"Find the right people. Build the right startup."**

StartupZ is a full-stack professional networking and ecosystem platform designed specifically for the startup world. It bridges the gap between ambitious founders, technical and business co-founders, early teammates, mentors, and angel/VC investors in one integrated environment.

Think of StartupZ as **LinkedIn + Product Hunt + AngelList + algorithmic co-founder matching + investor discovery**.

---

## 🌟 Core Highlights & Features

### 1. Landing Page & Visual Identity
- **Hero & Ecosystem Visuals**: High-conversion landing page presenting value propositions for founders, talent, mentors, and investors.
- **Dark & Light Mode**: Seamless theme switching with glassmorphism, tailored gradients, and responsive typography.

### 2. Complete Authentication
- **Registration**: Multi-role onboarding (Founder, Co-Founder, Investor, Mentor, Developer, Designer, Marketer, Other).
- **1-Click Demo Login**: Pre-configured demo accounts for instantaneous testing across roles.
- **Password Recovery**: Complete forgot-password and reset-password flows.

### 3. LinkedIn-Style Startup & Founder Profiles
- **Founder Profiles**: Headline, bio, skills, target industries, availability, achievements, GitHub/LinkedIn links, and "Open To" tags (Co-Founder, Startup Team, Mentorship, Investment).
- **Startup Concept Profiles**: Problem, solution, stage (Idea, Validation, MVP, Early Revenue, Growth, Fundraising), business model, required skills, funding needed, pitch deck link, and confidential idea indicators.

### 4. Algorithmic Co-Founder Matchmaking
- **Heuristic Compatibility Engine**: Calculates a percentage match score (e.g., **92% Match**) based on:
  - Technical vs. Business skill complementarity
  - Shared industry verticals and domain interests
  - Aligned availability (Full-time, Part-time, Advisory)
  - Geographic/Remote preferences
- Explanatory reasons for each match (e.g., *"Technical + Business complementarity • Shared focus in AI & Fintech"*).

### 5. Idea Discovery & AI Feedback
- **Explore Startups**: Real-time filtering by stage, industry, funding status, location, and required skills.
- **AI Idea Validation Engine**: Instant structural assessment analyzing:
  - Problem statement clarity
  - Solution viability
  - Target customer definition
  - Key strengths & potential blind spots/risks
  - Customer validation questions

### 6. Startup Opportunities (Jobs & Equity)
- **Early-Stage Role Listings**: Paid, equity-only, or hybrid early-hire positions posted directly by founders.
- **1-Click Applications**: Candidates apply with custom cover letters and resumes; founders accept or decline directly.

### 7. Investor Directory & Pitch System
- **VC & Angel Directory**: Filter by preferred stage (Pre-Seed, Seed, Series A), industry focus, and check size.
- **Send Pitch Modal**: Founders select their startup profile, attach executive traction summaries, and pitch deck URLs directly to investors.

### 8. Mentorship Portal
- **Seasoned Operator Directory**: Filter by mentoring topics, available hours/month, and domain expertise.
- **Request Mentorship**: Founders send structured requests with specific challenge areas.

### 9. Startup Community Feed
- **LinkedIn-Style Social Hub**: Post updates, product launches, milestones, hiring notices, and ask for advice.
- **Interactive Engagements**: Live likes count, nested comments with real-time posting, saving, and sharing.

### 10. Direct 1-to-1 Messaging & Connections
- **Private Chat**: Real-time message exchange with timestamps, read receipts, and auto-scrolling threads.
- **Connection Invitations**: Send personalized invitations, accept/decline pending requests, and manage connected networks.

### 11. Global Multi-Entity Search
- **Unified Search Bar**: Search keywords across **All**, **People**, **Startups**, **Investors**, **Opportunities**, and **Posts**.

### 12. Safety, Reporting & Idea Protection
- **Idea Privacy Controls**: Choose Public, Connections-Only, or Private visibility with a Confidential badge.
- **Reporting System**: Flag spam, fake profiles, fraudulent startup claims, or inappropriate content.

### 13. Admin Moderation Portal
- **Telemetry & Metrics**: Total users, registered startups, active connections, and open reports.
- **Governance**: Suspend/unsuspend users, award **Verified Founder**, **Verified Startup**, and **Verified Investor** badges, and resolve moderation reports.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v3, Lucide Icons, React Router DOM v7 |
| **Backend** | Node.js, Express.js (REST API, JWT Authentication, Multer file upload) |
| **Database** | Supabase Cloud PostgreSQL (Dual-compatible with local Prisma SQLite `dev.db`) |
| **Schema & Migrations** | `/supabase/migrations/001_initial_schema.sql` + `scripts/run-supabase-migration.js` |

---

## 🚀 Quickstart & Local Setup

### 1. Install Dependencies
Run the following in the project root:
```bash
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

### 2. Start the Development Servers
From the root directory, run both frontend and backend concurrently:
```bash
npm run dev
```
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000](http://localhost:5000)

---

## 🔑 Demo Accounts

All demo accounts share the password: **`Password123!`**

| Role | Name | Email | Password |
|---|---|---|---|
| **Founder** | Sarah Chen | `sarah.chen@aiagri.io` | `Password123!` |
| **Developer** | Marcus Vance | `marcus.dev@codeflow.dev` | `Password123!` |
| **Designer** | Priya Sharma | `priya.design@pixelcraft.studio` | `Password123!` |
| **Marketer** | David Kim | `david.kim@growthscale.co` | `Password123!` |
| **Investor** | Elena Rostova | `elena.investor@apexventures.vc` | `Password123!` |
| **Mentor** | Alex Vance | `alex.chen@scaleup.vc` | `Password123!` |
| **Admin** | Security Admin | `admin@startupz.com` | `Password123!` |

> 💡 **Tip**: On the [Login Page](http://localhost:5173/login), you can click any of the 1-click demo buttons to sign in instantly.

---

## ☁️ Supabase Cloud PostgreSQL Setup & Migrations

StartupZ comes pre-configured with complete SQL DDL, Row Level Security (RLS) policies, and seed data located at:
`supabase/migrations/001_initial_schema.sql`

### Running the Migration on Supabase:
1. In `.env` (or environment variables), set:
   ```env
   SUPABASE_DB_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   # Or REST fallback:
   SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
   SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]
   ```
2. Run the migration script:
   ```bash
   npm run migrate:supabase
   ```
3. Alternatively, copy the contents of `supabase/migrations/001_initial_schema.sql` directly into your **Supabase Dashboard -> SQL Editor** and click **Run**.

---

## 📂 Project Structure

```
startupz/
├── client/                     # Vite + React 19 + TypeScript frontend
│   ├── src/
│   │   ├── components/common/  # Navbar, Footer, Badge, Modal, ConnectModal, SendPitchModal...
│   │   ├── context/            # AuthContext, ThemeContext
│   │   ├── pages/              # Landing, Auth, Dashboard, Startups, CoFounders, Investors, Mentors, Feed, Network, Messages, Profile, Saved, Search, Admin
│   │   ├── services/           # api.ts (REST client with JWT auth headers)
│   │   ├── types/              # Comprehensive TypeScript interfaces
│   │   └── App.tsx             # Master routing & protected route wrappers
│   └── package.json
├── server/                     # Node.js + Express backend
│   ├── prisma/
│   │   └── schema.prisma       # Relational models (users, startups, opportunities, posts, messages, etc.)
│   ├── src/
│   │   ├── middleware/         # requireAuth, optionalAuth, requireAdmin
│   │   ├── routes/             # auth, users, startups, opportunities, connections, investors, mentors, posts, messages, saved, notifications, search, admin, reports
│   │   ├── seed.js             # Realistic demo data populator
│   │   └── index.js            # Express server entry point
│   └── package.json
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql # Complete PostgreSQL DDL, RLS policies, seed records
├── scripts/
│   └── run-supabase-migration.js  # Node.js automated migration runner for Supabase
└── README.md
```

---

## 🛡️ Trust, Privacy & Legal Guidelines
StartupZ promotes early collaboration and discovery while reminding founders to protect core intellectual property:
- **Confidentiality Toggles**: Startups can be set to Public, Connections-Only, or Private.
- **Reporting Council**: Suspicious profiles, scam solicitations, or IP issues can be reported and moderated via the Admin Portal.
