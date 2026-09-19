# LOOP — AI Customer-Feedback Intelligence Platform

[![Next.js](https://img.shields.io/badge/Next.js-14.2.35-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7.9-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Cloud-336791?style=for-the-badge&logo=postgresql)](https://neon.tech)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?style=for-the-badge&logo=vercel)](https://loop-feedback-seven.vercel.app)

> **Live Deployment:** [https://loop-feedback-seven.vercel.app](https://loop-feedback-seven.vercel.app)

**LOOP** is a modern multi-tenant AI feedback intelligence platform built for SaaS teams. It consolidates scattered customer feedback from support tickets, app store reviews, NPS/CSAT surveys, sales notes, and community posts, auto-classifies sentiment and emerging themes, generates executive Voice-of-Customer reports, and provides an Ask LOOP semantic Q&A interface grounded strictly in verified customer data.

---

## 🚀 Live Demo & Demo Credentials

Visit the production deployment at **[loop-feedback-seven.vercel.app](https://loop-feedback-seven.vercel.app)**.

The database is pre-seeded with a demo workspace (**Northwind Analytics**) and 141 customer feedback records:

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@northwind.example` | `Admin123!` | Full access: feedback CRUD, channel simulation, member management, VoC reports |
| **Analyst** | `analyst@northwind.example` | `Analyst123!` | Read/write access: feedback, trends, reports, and Ask LOOP |
| **Viewer** | `viewer@northwind.example` | `Viewer123!` | Read-only access across dashboard, inbox, trends, and reports |

*(You can also click **Create one** on the login page to register a brand-new, isolated company workspace!)*

---

## ✨ Key Features

### 1. Multi-Channel Feedback Ingestion
* **Manual Feedback**: Fast modal for capturing ad-hoc customer calls or tickets with metadata.
* **CSV Bulk Import**: Drag-and-drop CSV importer with field mapping and validation.
* **Simulated Channel Sync**: One-click simulated ingestion for Zendesk, App Store, G2, Discord, and Salesforce notes.

### 2. AI Intelligence & Auto-Classification
* **Dual Engine (Local + Cloud)**: Includes a zero-dependency, in-process keyword/rule intelligence engine (`lib/local-classifier.ts`) that runs 100% offline without API keys, plus optional Claude (`claude-sonnet-4-6`) support.
* **Granular Sentiment**: Scores feedback as Positive, Neutral, or Negative with numerical confidence.
* **Dynamic Theme Tagging**: Automatically detects feature areas (Billing, Auth, UI, Performance) and clusters feedback into actionable themes.

### 3. Ask LOOP (Evidence-Grounded AI Q&A)
* Plain-English search & question answering over all ingested customer feedback.
* Answers are synthesized strictly from retrieved database records with verbatim quote citations and customer labels — no hallucinations.
* Supports both local keyword/theme retrieval and optional pgvector semantic embeddings via Voyage AI.

### 4. Executive Analytics & VoC Reports
* **Interactive Dashboard**: Volume trends, sentiment distribution charts, and top theme breakdowns built with Recharts in a sleek dark glassmorphism UI.
* **Voice-of-Customer Reports**: Generate structured executive summaries, top emerging complaints, period-over-period sentiment shifts, and prioritized recommended actions.
* **One-Click Export**: Printable, presentation-ready report view.

### 5. Multi-Tenancy & Enterprise RBAC
* **Strict Tenant Isolation**: Enforced server-side — every database query requires a verified `workspaceId` extracted from the encrypted session token.
* **Role-Based Access Control**: Granular permissions for Admin, Analyst, and Viewer roles enforced in API route handlers and edge middleware.

---

## 🛠️ Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | Next.js 14 (App Router) | High-performance React server components & server actions |
| **Language** | TypeScript | End-to-end type safety across client, server, and schema |
| **Styling** | Tailwind CSS | Custom dark-glass design tokens, accessible palettes, micro-animations |
| **Database** | PostgreSQL + pgvector | Hosted serverless Postgres on [Neon](https://neon.tech) |
| **ORM** | Prisma 7 | Rust-free Prisma with `@prisma/adapter-pg` driver pool |
| **Authentication**| NextAuth.js v4 | Credentials provider, JWT session strategy, "Remember Me" expiry |
| **Validation** | Zod | Runtime validation for every API request payload |
| **Visualizations**| Recharts | Responsive, dark-mode tuned charts for volume, sentiment & themes |
| **Deployment** | Vercel | Production edge network and serverless functions |

---

## 🏛️ System Architecture

```text
Browser (RSC + Client Components)
        │
        ├── Next.js Edge Middleware (Token & Protocol Verification)
        │
        ▼
API Route Handlers ── requireAuth(role) ──▶ 401/403 Security Boundary
        │
        ├── lib/services/*.ts (Tenant-Scoped Business Logic with workspaceId)
        │
        ├── AI Layer:
        │     ├── Local Engine (lib/local-classifier.ts, lib/local-qa.ts, lib/local-report.ts)
        │     └── Optional Cloud (Anthropic Claude + Voyage pgvector)
        │
        ▼
Prisma 7 (@prisma/adapter-pg) ──▶ Neon PostgreSQL (+ vector extension)
```

---

## 💻 Getting Started Locally

### Prerequisites
* **Node.js**: v18.17+ or v20+
* **npm**: v9+
* **PostgreSQL Database**: Free cloud database from [Neon](https://neon.tech) or [Supabase](https://supabase.com)

### 1. Clone & Install
```bash
git clone https://github.com/rahul031102/loop_feedback.git
cd loop_feedback
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your configuration:
```env
# PostgreSQL connection string (Neon or Supabase with pgvector)
DATABASE_URL="postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require"

# NextAuth session encryption secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET="f8a7d3b2c1e40596a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0"
NEXTAUTH_URL="http://localhost:3000"

# Optional (Leave blank for offline operation):
ANTHROPIC_API_KEY=""
VOYAGE_API_KEY=""
```

### 3. Push Database Schema & Seed Data
Ensure `vector` extension is enabled on your Postgres database (`CREATE EXTENSION IF NOT EXISTS vector;`), then run:
```bash
npx prisma db push
npm run seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚢 Deploying to Vercel

1. Push your code to GitHub.
2. Import the repository in [Vercel](https://vercel.com/new).
3. Add the following **Environment Variables** in Vercel:
   * `DATABASE_URL`: Your cloud PostgreSQL connection string (`?sslmode=require`).
   * `NEXTAUTH_SECRET`: A secure 32+ character random string.
   * `NEXTAUTH_URL`: Your production URL (`https://your-app-name.vercel.app`).
4. Click **Deploy**.

---

## 📁 Directory Structure

```text
loop-feedback/
├── app/
│   ├── (app)/                  # Protected application shell
│   │   ├── inbox/              # Filterable, searchable feedback inbox
│   │   ├── dashboard/          # Analytics metrics & trend charts
│   │   ├── trends/             # Emerging themes & spike tracking
│   │   ├── ask/                # Ask LOOP retrieval Q&A
│   │   ├── reports/            # VoC executive reports & print views
│   │   └── settings/members/   # Workspace team management (Admin)
│   ├── (auth)/                 # Public auth pages (login, signup, forgot-pwd)
│   └── api/                    # Secure REST API route handlers
├── components/
│   ├── ask/                    # Ask LOOP chat & citation widgets
│   ├── auth/                   # Authentication forms
│   ├── dashboard/              # Recharts volume, sentiment & theme graphs
│   ├── feedback/               # Table, filters, CSV upload, channel sim
│   ├── layout/                 # Glassmorphism sidebar & app shell
│   └── ui/                     # Design system primitives (Button, Card, Input)
├── lib/
│   ├── local-classifier.ts     # In-process sentiment & theme classifier
│   ├── local-qa.ts             # Evidence-grounded local Q&A pipeline
│   ├── local-report.ts         # VoC executive narrative generator
│   ├── rbac.ts                 # Role enforcement & tenant isolation
│   ├── db.ts                   # Prisma 7 client & pg adapter configuration
│   └── services/               # Modular business logic services
├── prisma/
│   ├── schema.prisma           # Relational schema + pgvector definition
│   ├── migrations/             # SQL migrations
│   └── seed.ts                 # Demo workspace & multi-channel feedback seed
└── middleware.ts               # Edge security & session cookie verification
```

---

## 📄 License
Built for the Zidio Development Internship submission (Project LOOP brief v1.0).
Distributed under the MIT License.
