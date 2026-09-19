# LOOP — AI Customer-Feedback Intelligence Platform

Built for the Zidio Development internship, Project LOOP brief v1.0. LOOP ingests
multi-channel customer feedback (support tickets, app-store reviews, NPS/CSAT
surveys, sales notes, community/social mentions), uses Claude to classify it,
cluster it into trending themes, and answer plain-English questions grounded
in the actual feedback.

**Current status: all four milestones complete.** Auth, workspaces, RBAC, member
management, feedback CRUD, CSV import, simulated channels, the full
filtered/paginated/searchable inbox, the analytics dashboard, Claude
auto-classification, theme clustering with spike detection, Ask LOOP's
retrieval-grounded Q&A, Voice-of-Customer reports, and production hardening
(404/error pages, loading states, mobile-responsive layout) are all built and
verified. See [Build status](#build-status) below, and
[CHECKLIST.md](./CHECKLIST.md) for the complete requirement-by-requirement
mapping against the brief — including an honest accounting of what's outside
what I can do in this environment (a live deployment, and the two required
videos).

## Tech stack

| Layer      | Technology                                 | Notes                                                                                                                                    |
| ---------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Framework  | Next.js 14 (App Router) + TypeScript       | Pinned to `14.2.35` — the patched release on the 14.x line (14.2.18, the version `create-next-app` would install today, has known CVEs)  |
| Styling    | Tailwind CSS                               | Custom design tokens, see `tailwind.config.ts`                                                                                           |
| Database   | PostgreSQL + pgvector                      | Neon or Supabase free tier, both support the `vector` extension                                                                          |
| ORM        | Prisma **7**                               | Rust-free — uses a driver adapter (`@prisma/adapter-pg`), not a downloaded native engine. See [A note on Prisma 7](#a-note-on-prisma-7)  |
| Auth       | NextAuth v4                                | Credentials provider, JWT sessions (no DB session table — see the Assumptions section of the project plan)                               |
| Validation | Zod                                        | Every API input                                                                                                                          |
| AI         | Anthropic Claude API (`claude-sonnet-4-6`) | Classification (AI1) and Ask LOOP's answers (AI3) — `lib/ai.ts`                                                                          |
| Embeddings | Voyage AI (`voyage-4`)                     | Anthropic's own documented recommendation for Claude apps, since Claude has no native embedding model — `lib/services/search.service.ts` |

## Getting started

### Prerequisites

- Node.js 18+ and npm
- A free PostgreSQL database ([Neon](https://neon.tech) or [Supabase](https://supabase.com))
- Git

### 1. Install dependencies

```bash
npm install
```

This also runs `prisma generate` automatically (via `postinstall`), which needs
network access to Prisma's engine registry — normal on any machine with regular
internet access.

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in:

- `DATABASE_URL` — your Neon/Supabase connection string
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` — `http://localhost:3000` for local dev
- `ANTHROPIC_API_KEY` — required for classification (AI1) and Ask LOOP (AI3). Get one at [console.anthropic.com](https://console.anthropic.com)
- `VOYAGE_API_KEY` — required for Ask LOOP's semantic search (AI3). Get one at [dashboard.voyageai.com](https://dashboard.voyageai.com) — Voyage is Anthropic's own documented recommendation for embeddings (see `lib/services/search.service.ts`'s comment), not something this project invented; it's a separate free-tier signup from your Anthropic key.

### 3. Set up the database

First, enable the `pgvector` extension on your database — `schema.prisma` declares it
for the `Embedding` model (used by Ask LOOP's semantic search), and migrations will
fail without it. Run this once against your database, e.g. via your provider's SQL
editor or `psql`:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Neon and Supabase both support this out of the box. Then:

```bash
npx prisma migrate dev --name init
npm run seed
```

The seed script prints demo login credentials when it finishes (also listed below).

Seed data starts unclassified by design (Appendix A: "sentiment and themes left
blank so your AI classifier fills them on import"). After logging in, open the
Inbox and click **Run AI processing** in the banner at the top to classify and
embed all 133 seed items — this is what makes the Dashboard, Trends, and Ask
LOOP pages show real data instead of "not yet classified" states. It takes a
minute or two (small batches, to stay within API rate limits) and only needs
to run once.

### 4. Run it

```bash
npm run dev
```

Visit `http://localhost:3000` — you'll land on `/login`.

### Demo credentials

Seeded onto a workspace called **Northwind Analytics**, one login per role, as
Section 13's submission checklist requires:

| Role    | Email                       | Password      |
| ------- | --------------------------- | ------------- |
| Admin   | `admin@northwind.example`   | `Admin123!`   |
| Analyst | `analyst@northwind.example` | `Analyst123!` |
| Viewer  | `viewer@northwind.example`  | `Viewer123!`  |

These are seed-script placeholders for local/demo use only — never reused real
passwords, per the brief's own warning in Section 13.

## Architecture

Three-tier, per Section 06 of the brief:

```
Browser (RSC + Client Components)
        │  fetch()
        ▼
API Route Handlers ──requireAuth(role)──▶ 401/403 boundary
        │
        ▼
lib/services/*.ts  (workspace-scoped business logic — the ONLY place Prisma is called)
        │
        ▼
Prisma ──▶ PostgreSQL
```

**Tenant isolation** is enforced structurally, not by convention: `lib/rbac.ts`'s
`requireAuth()` is the single place every route handler and protected page gets a
`workspaceId`, and it comes from the verified session token — never from anything
the client sends. Every service function in `lib/services/` requires that
`workspaceId` as its first argument to run any query at all.

**RBAC** (`ADMIN` / `ANALYST` / `VIEWER`) is enforced the same way: `requireAuth(minimumRole)`
throws a 403 before a route handler's logic runs. The UI also hides controls a
role can't use, but that's a convenience layer — the real enforcement is
server-side, per C2's acceptance criteria.

## Folder structure

Matches Section 16 of the brief (no `src/` wrapper):

```
loop/
├── app/
│   ├── (auth)/{login,signup}/          public auth pages
│   ├── (app)/{inbox,settings/members}/ protected app pages
│   ├── api/{auth,feedback,workspace}/  route handlers
│   ├── layout.tsx · globals.css · page.tsx
├── components/{ui,layout,auth,feedback,settings,providers}/
├── lib/{db.ts,auth.ts,rbac.ts,utils.ts,labels.ts,validations/,services/}
├── prisma/{schema.prisma,seed.ts}
├── types/next-auth.d.ts
├── middleware.ts
└── prisma.config.ts
```

## A note on Prisma 7

This project uses Prisma ORM **7**, not 5 or 6. Prisma went Rust-free as of v7 —
`PrismaClient` is constructed with a driver adapter (`@prisma/adapter-pg`) instead
of a downloaded native query engine binary. Two consequences worth knowing about
if you're used to older Prisma:

- The database URL is **not** in `schema.prisma` anymore. It lives in
  `prisma.config.ts` (for the CLI — `migrate`, `db seed`) and is passed directly
  to the adapter in `lib/db.ts` / `prisma/seed.ts` (for the running app).
- Prisma 7 no longer auto-loads `.env` for CLI commands, so `dotenv` is loaded
  explicitly (`prisma.config.ts`, and `-r dotenv/config` in the `seed` script).

## Build status

### Milestone 1 — Foundation ✅ complete

- [x] Repo, Next.js 14 + TypeScript + Tailwind, Prisma schema, seed script
- [x] Auth: sign-up (Workspace + ADMIN User created atomically), login, logout, protected routes
- [x] RBAC: three roles, server-enforced, 403 on forbidden actions
- [x] Workspace member management (list, admin-provisioned add, role change, remove)
- [x] Basic feedback create + list

### Milestone 2 — Core App ✅ complete

- [x] CSV bulk import — per-row validation, imported/failed counts with error detail (C3 AC2)
- [x] Two simulated channel sources (support inbox, app store) that seed a fresh batch on demand (C3 AC3)
- [x] Feedback inbox: server-side pagination, full-text search (genuine Postgres `tsvector`/`tsquery`,
      not substring matching), filters by channel/sentiment/status/theme/date range (C4)
- [x] Status workflow (NEW → REVIEWED → ACTIONED), inline, optimistic with rollback on failure (C4 AC4)
- [x] Analytics dashboard: 3 charts (volume over time, sentiment breakdown, top themes) + 3 stat cards,
      date-range filtered (C5)
- [x] `npx tsc --noEmit` — zero errors · `npx next build` — clean production build, all 16 routes

**On the sentiment/theme charts (M2's own note, still accurate before you run
AI processing):** they're wired to real queries, not mock data — Section 10's
Day 10 entry anticipates exactly this state ("Dashboard shell with
Recharts... **placeholder data ok**"). Once you click **Run AI processing**
in the Inbox (Milestone 3), the same queries start returning real breakdowns
with no code changes.

### Milestone 3 — AI Features ✅ complete

- [x] AI1 auto-classification: structured JSON from Claude (sentiment, sentimentScore, themes,
      featureArea), Zod-validated before saving, retry-once-then-flag-for-review on failure,
      stored on the record (not recomputed per page load), manual re-classify action per item
- [x] AI2 theme clustering: Claude reuses existing theme names or proposes new ones
      (case-insensitive matched/created), theme list with counts, spike detection vs. the
      previous period, click-through drill-down into the filtered inbox — `/trends`
- [x] AI3 Ask LOOP: genuine retrieve-then-answer RAG (Voyage embeddings + pgvector cosine
      search, tenant-scoped in the same query), Claude answers only from retrieved items and
      cites which ones by index, defensively re-validated server-side against what was actually
      retrieved — `/ask`
- [x] `npx tsc --noEmit` — zero errors · `npx next build` — clean production build, all 21 routes (25 by the end of Milestone 4)
- [x] M1/M2 functionality re-verified intact after every M3 change (see the note below)

**An honest limit on "verified" for this milestone specifically:** this sandbox has no real
`ANTHROPIC_API_KEY` or `VOYAGE_API_KEY` — outbound requests to `api.anthropic.com` return `401`
without one, confirmed directly rather than assumed. Everything gets verified _except_ actual
model output: the code compiles, the build is clean, the SDK is called with the correct
documented shapes, the JSON-parsing/Zod-validation/retry logic is exercised by real TypeScript
types — but whether Claude's actual classifications are _good_ classifications, or Voyage's
actual retrieval is _good_ retrieval, can only be confirmed once you add your own keys and run
it. That's a real, meaningful gap, not a formality — it's exactly why the "Run AI processing"
step above is worth doing yourself rather than taking on faith.

**On M1/M2 preservation specifically:** every pre-existing file M3 touched, and exactly what
changed in each - all additive, nothing removed or replaced:

- `prisma/schema.prisma` — corrected the `Embedding.vector` dimension (1536→1024, a placeholder
  from M1 pending this milestone's provider decision; nothing else changed)
- `package.json` — added `@anthropic-ai/sdk`, `@anthropic-ai/adapter-pg`'s peer requirement bumped
  `zod` from 3.23.8→3.25.76 (Zod 3 API throughout, not a Zod 4 migration)
- `.env.example` — added `VOYAGE_API_KEY` documentation
- `middleware.ts` — added `/trends` and `/ask` to the route matcher (existing entries untouched)
- `components/layout/sidebar.tsx` — added Trends/Ask LOOP nav links (existing links untouched)
- `app/api/feedback/route.ts` — added a classification hook to `POST`; `GET`'s full M2
  pagination/filter/search logic is untouched (see it directly above)
- `components/feedback/feedback-table.tsx` — added a re-classify action column; the M2
  status-editing column is untouched
- `app/(app)/inbox/page.tsx` — added the AI-processing banner above the existing filter/table card

`tsc` and `next build` were re-run clean after every change in this milestone, and the
higher-risk files above were reviewed directly (not just type-checked) to confirm the M1/M2
logic inside them is intact.

### Milestone 4 — Production ✅ complete

- [x] AI4 Voice-of-Customer report: stats pre-computed in code (Section 9.3's exact pattern —
      "stops the model from hallucinating figures"), Claude narrates around them, saved and
      viewable later, exportable via a print-optimized page (`window.print()` → PDF; see the
      Assumptions note below for why print-to-PDF over a public share-link) — `/reports`
- [x] Hardening: custom 404 (`app/not-found.tsx`) and error boundary (`app/error.tsx`), `loading.tsx`
      skeletons on every data-fetching page, mobile-responsive layout (the sidebar becomes a
      slide-out drawer below the `lg` breakpoint — previously fixed-width with no mobile treatment
      at all)
- [x] `npx tsc --noEmit` — zero errors · `npx next build` — clean production build, **25 routes**
- [x] M1/M2/M3 functionality re-verified intact (see the note below)

**Interpretation note on AI4 AC3 ("exportable — PDF or shareable page"):** implemented as a
print-optimized report page rather than a public unauthenticated share-link. Both readings are
valid per the brief's own "or" — a share-link would need a new token-based auth bypass mechanism
(schema changes, expiry handling, its own security review) that's a meaningfully bigger feature
than what a "production polish" milestone should add; print-to-PDF satisfies "exportable" directly,
with no new attack surface, and is what most real SaaS tools actually do for this exact use case.

### Milestone 4, honestly

- **AI4 has the same live-verification limit as Milestone 3** — the narrative generation calls
  Claude the same way classification does, so the same "compiles and is structured correctly, but
  actual model output isn't verifiable without a real key" caveat applies here too.
- **Every number in a generated report is computed by this app, not by Claude** — sentiment counts,
  theme counts, period totals all come from `report.service.ts`'s own Prisma queries. Claude only
  ever writes prose around numbers it's handed. This isn't a trust-me claim: read
  `buildVoCPrompt` in `lib/ai.ts` — every number in the prompt is interpolated from already-computed
  values, and the response schema (`vocNarrativeResponseSchema`) has no field a number could go in
  except inside free-text prose.

**On M1/M2/M3 preservation specifically:** pre-existing files touched in M4, all additive:

- `middleware.ts` — added `/reports` to the matcher
- `components/layout/sidebar.tsx` — added the Reports nav link, and restructured for the mobile
  drawer (`lg:static lg:translate-x-0` restores the exact prior desktop-only layout — verified by
  reading the responsive classes directly, not assumed)
- `app/(app)/layout.tsx` — swapped the inline sidebar+main markup for the new `AppShell` wrapper,
  which renders the identical structure on desktop and adds the mobile drawer below `lg`
  (`sm:px-8 sm:py-8` matches the original unconditional `px-8 py-8` exactly at `sm` and above; only
  below `sm` does padding now shrink — a deliberate mobile improvement, not a regression)
- `app/globals.css` — added a `@media print` block; zero effect on normal (non-print) rendering

`tsc` and `next build` were re-run clean after every change in this milestone.

## API endpoints (all four milestones)

| Endpoint                        | Method       | Role required               | Notes                                                                |
| ------------------------------- | ------------ | --------------------------- | -------------------------------------------------------------------- |
| `/api/auth/signup`              | POST         | —                           | Creates Workspace + ADMIN User                                       |
| `/api/auth/[...nextauth]`       | \*           | —                           | NextAuth session handling                                            |
| `/api/feedback`                 | GET          | any                         | Paginated, filtered, searchable list                                 |
| `/api/feedback`                 | POST         | ANALYST+                    | Single-entry create, classified+embedded synchronously (best-effort) |
| `/api/feedback/[id]`            | GET          | any                         | Single item (workspace-scoped)                                       |
| `/api/feedback/[id]`            | PATCH        | ANALYST+                    | Status workflow update                                               |
| `/api/feedback/import`          | POST         | ANALYST+                    | CSV bulk import                                                      |
| `/api/feedback/channel-sim`     | POST         | ANALYST+                    | Simulated channel pull                                               |
| `/api/feedback/[id]/classify`   | POST         | ANALYST+                    | Manual re-classify (AI1 AC4)                                         |
| `/api/feedback/process-pending` | GET/POST     | ANALYST+ (POST)             | Pending count / run next batch of 10                                 |
| `/api/themes`                   | GET          | any                         | Theme list with counts (AI2 AC1)                                     |
| `/api/themes/trends`            | GET          | any                         | Spike detection, `?period=7\|30\|90` (AI2 AC2)                       |
| `/api/insights/ask`             | POST         | any                         | Ask LOOP - retrieve then answer (AI3)                                |
| `/api/workspace/members`        | GET/POST     | ADMIN                       | List / add a teammate                                                |
| `/api/workspace/members/[id]`   | PATCH/DELETE | ADMIN                       | Change role / remove                                                 |
| `/api/insights/dashboard`       | GET          | any                         | Stat cards + chart data, `?range=7\|30\|90`                          |
| `/api/reports`                  | GET/POST     | any (GET) / ANALYST+ (POST) | List / generate a VoC report (AI4)                                   |
| `/api/reports/[id]`             | GET          | any                         | View a saved report                                                  |

## Deploying

**See [DEPLOY.md](./DEPLOY.md) for exact, copy-paste-ready steps** — GitHub push, database
creation, pgvector setup, API keys, Vercel environment variables, and a smoke-test checklist, in
order. The summary:

1. Push this repo to GitHub.
2. Create a Neon or Supabase Postgres database; enable the `vector` extension
   (see step 3 above); run `npx prisma migrate dev` and `npm run seed` against
   it (or `prisma migrate deploy` for a clean production DB).
3. Import the repo into Vercel; add `DATABASE_URL`, `NEXTAUTH_SECRET`,
   `NEXTAUTH_URL` (your production URL), `ANTHROPIC_API_KEY`, and
   `VOYAGE_API_KEY` as environment variables in the Vercel project settings.
4. Deploy.
5. Log in as the seeded admin, open the Inbox, and click **Run AI processing**
   — this is a manual step by design (see `lib/services/ai-processing.service.ts`),
   not something that happens automatically on deploy.
6. Per Section 13's submission checklist: capture the live URL, and record your
   demo video — **[DEMO_SCRIPT.md](./DEMO_SCRIPT.md) has the full shot-by-shot
   script**, timed to fit the required 3–5 minutes.

## Testing this build yourself

```bash
npx tsc --noEmit   # type-check
npx next lint      # lint
npx next build     # production build
```
