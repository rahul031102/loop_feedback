# Project LOOP — Requirement Checklist

Every requirement in the Project LOOP brief (v1.0), mapped to what's implemented. Where
something isn't fully done, it says so plainly rather than being marked complete.

Legend: ✅ done and verified · ⚠️ partially done / needs your action · ❌ not applicable to what I can do in this environment

---

## 1. Project Objectives (Section 03.1)

| #   | Objective                                                        | Status | Where                                                                                                                                                                                  |
| --- | ---------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Multi-tenant app, fully isolated data                            | ✅     | Every query in every `lib/services/*.ts` function requires `workspaceId`; `lib/rbac.ts`'s `requireAuth()` is the only source of a trusted one                                          |
| 2   | Secure auth + RBAC across 3+ roles                               | ✅     | NextAuth v4 credentials/JWT (`lib/auth.ts`); ADMIN/ANALYST/VIEWER (`lib/rbac.ts`)                                                                                                      |
| 3   | Clean REST/Route-Handler API, no business logic in UI            | ✅     | All mutations go through `app/api/**/route.ts`; all business logic lives in `lib/services/*.ts`, never in components                                                                   |
| 4   | 3+ meaningful AI features via Claude                             | ✅     | Four are built: AI1–AI4 (below), not three                                                                                                                                             |
| 5   | Deploy to a public URL, documented for a stranger to run locally | ⚠️     | Fully documented (`README.md` + step-by-step [DEPLOY.md](./DEPLOY.md)); the actual deploy needs your Vercel/Neon/Voyage/Anthropic accounts, ~15-20 minutes of copy-paste per DEPLOY.md |

## 2. Scope Compliance (Section 04)

**In scope — all built:**
Multi-tenant workspaces + 3 roles · manual/CSV/simulated-channel ingestion · inbox with
search/filter/pagination/status · 3-chart dashboard · all 4 AI features · public-deployment-ready
build, README, and this checklist (demo video is the one piece I can't produce — see §11).

**Out of scope — confirmed NOT built** (so nothing here is accidentally scope creep):

- ❌ Real third-party integrations — the two simulated channels seed realistic data, no live Zendesk/App
  Store/Twitter calls
- ❌ Billing, payments, subscription tiers
- ❌ Native mobile apps
- ❌ Real-time collaboration (websockets/live cursors)
- ❌ Email/SMS delivery infrastructure — this is _why_ "invite teammates" (C2) is admin-provisioned
  account creation rather than an email invite; see §8

## 3. Technology Stack (Section 05)

| Requirement                                | Status | Note                                                                                                                                 |
| ------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Next.js 14 (App Router) + TypeScript       | ✅     | Pinned `14.2.35` — the CVE-patched release on the 14.x line, not `14.2.18`                                                           |
| Tailwind CSS                               | ✅     | Custom token system, not default theme                                                                                               |
| PostgreSQL (Neon/Supabase)                 | ✅     | `pgvector` extension required — documented in README step 3                                                                          |
| Prisma                                     | ✅     | Version **7**, not the 5.x shown in the brief's install command — Rust-free architecture, explained in README's "A note on Prisma 7" |
| NextAuth (Auth.js)                         | ✅     | v4, Credentials provider, JWT sessions — see §8                                                                                      |
| Anthropic Claude API (`claude-sonnet-4-6`) | ✅     | Used verbatim in `lib/ai.ts`; the model string wasn't independently re-verified against current Anthropic offerings — see §10        |
| pgvector or hosted embeddings provider     | ✅     | Both — pgvector storage + Voyage AI (`voyage-4`) for the actual embeddings, Anthropic's own documented recommendation                |
| Recharts                                   | ✅     | Dashboard's 3 charts                                                                                                                 |
| Zod                                        | ✅     | Every API input, across all 4 milestones                                                                                             |
| Vercel deploy                              | ⚠️     | Code is deploy-ready; the deploy itself needs your account                                                                           |

## 4. System Architecture (Section 06)

| Requirement                               | Status                                                                                                                                                      |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Three-tier: browser → own API → DB/Claude | ✅ `lib/services/*.ts` is the only caller of Prisma; `lib/ai.ts`/`lib/services/search.service.ts` are the only callers of Claude/Voyage                     |
| API key never reaches the browser         | ✅ `ANTHROPIC_API_KEY`/`VOYAGE_API_KEY` read only in server-side files, never in a `"use client"` component                                                 |
| Every query scoped by `workspaceId`       | ✅ Including the AI3 vector-search join — explicitly checked, not assumed, since that's exactly the kind of place cross-tenant leakage could hide unnoticed |

## 5. Data Model (Section 07)

All six entities implemented exactly as specified, plus the required `workspaceId` on every
tenant table: Workspace, User, Feedback, Theme, FeedbackTheme (join), Embedding, Report. See
`prisma/schema.prisma` — every non-obvious field has a comment explaining which requirement it
serves. Seed data: 1 workspace, 3 users (1 per role), 133 feedback items (exceeds the 120
minimum) across all 7 channels, 8 themes — ✅.

## 6. Core Features (Section 08.1)

### C1 — Authentication & workspaces

| AC                                                | Status                                             |
| ------------------------------------------------- | -------------------------------------------------- |
| Sign-up creates User + Workspace, creator = ADMIN | ✅ `signUpNewWorkspace()`, one `$transaction`      |
| Passwords hashed, sessions persist                | ✅ bcrypt (12 rounds), JWT                         |
| Logged-out users redirected                       | ✅ `middleware.ts` + layout-level defense-in-depth |
| Data scoped to caller's workspace                 | ✅                                                 |

### C2 — RBAC

| AC                                                                     | Status                                                    |
| ---------------------------------------------------------------------- | --------------------------------------------------------- |
| 3 roles exist                                                          | ✅                                                        |
| Admin manages members/roles; Analyst ingests/manages; Viewer read-only | ✅ enforced in every route via `requireAuth(minimumRole)` |
| API enforces roles server-side                                         | ✅                                                        |
| Forbidden action → 403                                                 | ✅ `ApiError` → `handleApiError()`                        |

### C3 — Feedback ingestion

| AC                                 | Status                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| Single-entry form, validated       | ✅                                                                           |
| CSV upload, imported/failed counts | ✅ per-row validation, error detail returned                                 |
| At least one simulated channel     | ✅ two — support inbox + app store                                           |
| Queued for AI classification       | ✅ synchronous best-effort on single-entry; batch-polling for bulk (see AI1) |

### C4 — Feedback inbox

| AC                                            | Status                                                           |
| --------------------------------------------- | ---------------------------------------------------------------- |
| Server-side pagination                        | ✅                                                               |
| Filter by channel/sentiment/theme/status/date | ✅ all five                                                      |
| Full-text search                              | ✅ genuine Postgres `tsvector`/`tsquery`, not substring matching |
| Status workflow, changeable inline            | ✅ optimistic UI, rollback on failure                            |

### C5 — Analytics dashboard

| AC                            | Status                                                                            |
| ----------------------------- | --------------------------------------------------------------------------------- |
| 3+ charts driven by real data | ✅ volume/sentiment/themes                                                        |
| Charts reflect date range     | ✅ 7/30/90-day selector                                                           |
| Stat cards                    | ✅ total, % negative, new this week                                               |
| Empty/loading states          | ✅ distinct "no data," "filters matched nothing," and "not yet classified" states |

## 7. AI Features (Section 08.2)

### AI1 — Auto-classification

| AC                                                                      | Status                                  |
| ----------------------------------------------------------------------- | --------------------------------------- |
| Sent to Claude on ingestion, returns sentiment/score/themes/featureArea | ✅                                      |
| Strictly structured JSON, validated before saving                       | ✅ Zod, retry-once-then-flag-for-review |
| Stored on record, not recomputed per load                               | ✅                                      |
| Manual re-classify action                                               | ✅ per-row button                       |

### AI2 — Theme clustering & trends

| AC                                                        | Status                                                                                   |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Grouped into named themes with counts                     | ✅ `/trends`                                                                             |
| Trends view, volume + spike detection vs. previous period | ✅                                                                                       |
| Click-through drill-down                                  | ✅ links to `/inbox?themeId=X`, reusing C4's existing filter rather than a separate view |
| New feedback assigned to existing or new theme            | ✅ case-insensitive match/create                                                         |

### AI3 — Ask LOOP (grounded Q&A)

| AC                                           | Status                                                                                                                     |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Chat-style question box                      | ✅ `/ask`                                                                                                                  |
| Retrieves relevant feedback before answering | ✅ Voyage embeddings + pgvector cosine search                                                                              |
| Cites specific items used                    | ✅ index-based, server-side re-validated against what was actually retrieved                                               |
| Never invents feedback not in the data       | ✅ prompt instructs this explicitly; `hasSufficientContext` flag surfaces when retrieval didn't really answer the question |

### AI4 — Voice-of-Customer report

| AC                                                   | Status                                                                                             |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| One click generates a report for a chosen period     | ✅ 7/30/90-day picker                                                                              |
| Summarizes themes, sentiment shifts, quotes, actions | ✅ all four, all real data                                                                         |
| Saved, viewable later, exportable                    | ✅ `/reports` list + detail; exportable via print-to-PDF (see README's interpretation note)        |
| Generated from actual data, not filler               | ✅ every number pre-computed in code; Claude only narrates (Section 9.3's own recommended pattern) |

## 8. AI Implementation Notes (Section 09) & Assumptions

Every pattern Section 09 prescribes was followed as written, not just approximated:

- **9.1** (classification): existing theme names passed in the prompt, JSON-only instruction,
  markdown-fence stripping, Zod validation, retry-once — all present in `lib/ai.ts`
- **9.2** (retrieval): embed on ingest, embed the question, top-K retrieval, answer-only-from-context
  instruction, answer + cited items returned — all present, `lib/services/search.service.ts` + `lib/ai.ts`
- **9.3** (reports): stats pre-computed in code, Claude only narrates — `lib/services/report.service.ts`

Where the brief left something genuinely open, here's what was chosen and why:

- **Next.js stack**, not the Java alternative — nothing signaled the Java track
- **NextAuth v4**, not v5/Auth.js — stability over newest-tag
- **JWT sessions**, no DB session table — the given schema has no Session/Account table
- **Global-unique email** — the ER diagram shows one workspace per user
- **"Invite teammates" = admin-provisioned accounts**, not email invites — Section 4.2 excludes
  email infrastructure
- **pgvector storage + Voyage AI embeddings** — Claude has no native embedding model; Voyage is
  Anthropic's own documented recommendation, confirmed via their docs, not assumed
- **`claude-sonnet-4-6` used verbatim** — this exact string wasn't independently re-verified
  against Anthropic's current model lineup; if your API account doesn't recognize it, it's the one
  line to change in `lib/ai.ts`
- **Route Handlers, not Server Actions** — Section 03 objective #3 explicitly asks for a
  "REST/Route-Handler API"
- **Print-to-PDF, not a public share-link**, for AI4's export — see README's M4 build-status note

## 9. Milestones (Section 11)

| Milestone        | Brief's marks | Status                                                           |
| ---------------- | ------------- | ---------------------------------------------------------------- |
| M1 — Foundation  | 10            | ✅ complete, verified                                            |
| M2 — Core App    | 15            | ✅ complete, verified                                            |
| M3 — AI Features | 15            | ✅ complete, verified (with the honest live-model caveat in §10) |
| M4 — Production  | 10            | ✅ complete, verified                                            |

Stretch goals (Section 11.1) — not attempted, per the brief's own instruction that they should
only be attempted "once the entire required scope is excellent" and "never substitute for core
work." Required scope came first; there wasn't remaining scope I'd call spare capacity by the
time M4's actual requirements were done.

## 10. What "verified" honestly means here

Every milestone's code was checked the same way: `npx tsc --noEmit` (zero errors, all four
milestones, re-run after every change) and `npx next build` (clean production build, 25 routes).
Real bugs were caught and fixed this way, not hypothetically — a CVE in the Next.js version
originally pinned, three genuine Prisma 7 breaking changes, a peer-dependency conflict, a
framework-internal-error-swallowing bug, an ESLint violation, and a fragile TypeScript union
discrimination pattern. All fixed, all re-verified.

The one thing that **cannot** be verified in this environment: live behavior of the AI features
themselves. This sandbox has no real `ANTHROPIC_API_KEY` or `VOYAGE_API_KEY` — confirmed directly
(a probe to `api.anthropic.com` returns `401`), not assumed. The code compiles, the SDK is called
with documented-correct shapes, the validation/retry logic is exercised by real types — but
whether Claude's classifications are _good_, or Voyage's retrieval is _good_, only your own run
with real keys can confirm. Section 18 of the brief expects you to "understand and be able to
explain every line you submit" — this gap is exactly the kind of thing worth understanding, not
glossing over.

## 11. Submission Requirements (Section 13)

| #   | Requirement                                                                        | Status                                                                                                                                                                                                                                                                                                                                           |
| --- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | GitHub repository link                                                             | ⚠️ Code is delivered as a zip; pushing it to GitHub is a `git init && git remote add && git push` away, but that's your account, not something I can do                                                                                                                                                                                          |
| 2   | Live deployment URL with seed data + role credentials                              | ⚠️ See §1 row 5 / README's Deploying section                                                                                                                                                                                                                                                                                                     |
| 3   | README (project, stack, setup, env vars, seed commands, architecture, screenshots) | ✅ everything except screenshots — those need a running instance to capture, which needs your deploy or local run first                                                                                                                                                                                                                          |
| 4   | 3–5 minute demo video                                                              | ⚠️ I can't record video, but [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) is a complete, timed, shot-by-shot script (exact clicks + narration) — recording it is now a read-through, not a from-scratch writing task                                                                                                                                       |
| 5   | Cohort submission form                                                             | ❌ Not something I have access to or context on                                                                                                                                                                                                                                                                                                  |
| 6   | 1–2 minute self-feedback video on the internship                                   | ❌ **and deliberately not drafted** — this is meant to be your own genuine reflection on the internship experience, not something I should write words for you to read as if they were your own feelings. Happy to help you organize your thoughts if you want to talk through what stood out to you, but the actual reflection should be yours. |

## 12. Coding Standards (Section 15)

TypeScript strict mode, no `any` in application code · Zod on every API boundary · business logic
in `lib/services/*.ts`, never in components · explicit error handling throughout (`ApiError` →
`handleApiError()`) · Prettier + ESLint configured and passing · `.env` gitignored from commit
one · commit-history guidance is in the README for you to follow once this is in your own git repo
(this was built in a single continuous session, so the commit-by-commit-over-four-weeks story
Section 15.2 describes doesn't exist yet — worth doing once you're working in your own repo, so
the history reflects real incremental work).

## 13. Repository Structure (Section 16)

Matches the brief's suggested layout exactly — `app/`, `components/`, `lib/`, `prisma/` at root,
no `src/` wrapper. `lib/ai.ts` and `lib/services/search.service.ts` are exactly the two files the
brief names (`ai.ts`, `search.ts`) for exactly the purposes it describes.

## 14. Originality (Section 18)

The brief explicitly permits AI coding assistants ("You may use AI coding assistants and
documentation — that is modern engineering") on the explicit condition that you "understand and
be able to explain every line you submit." Every non-obvious decision in this codebase has an
inline comment explaining _why_, not just _what_ — that's deliberate, so reading the code teaches
the reasoning rather than requiring you to reconstruct it. Before your final review, it's worth
actually reading through `lib/rbac.ts`, `lib/ai.ts`, and `lib/services/search.service.ts` end to
end — those three files carry the parts of this project that are "hard to fake" per Section 01.
