# Session changes — premium redesign + auth/env fixes

## 1. Root cause of the DATABASE_URL / signup 500 error

Two real, distinct bugs, both fixed:

- **`prisma.config.ts` used `env("DATABASE_URL")`, which throws immediately
  if the variable is missing** — and this file is evaluated for *every*
  Prisma CLI command, including `prisma generate`, which never opens a
  database connection at all. Net effect: a fresh `npm install` could fail
  at the `postinstall` step before `.env.local` even existed yet. Fixed by
  reading `process.env.DATABASE_URL` directly (empty string if unset) so
  `generate` always succeeds; `migrate`/`db seed`/`studio` still fail
  clearly, from Prisma/`pg` itself, the moment they actually need a real
  connection.
- **The CLI only ever loaded `.env`, never `.env.local`.** Next.js loads
  `.env.local` automatically for the app itself, but Prisma's CLI
  (`migrate`, `db seed`, `studio`) does not — it needs to be told to.
  `prisma.config.ts` and `prisma/seed.ts` now both load `.env.local` first
  and fall back to `.env`, matching Next.js's own precedence. Every
  "copy .env.example to..." instruction (README, DEPLOY.md, the example
  file itself, and every runtime "not set" error message) now consistently
  says `.env.local`.

**You still need to do this yourself:** `cp .env.example .env.local` and
fill in real values — `DATABASE_URL`, `NEXTAUTH_SECRET`, and (optional,
for AI features) `ANTHROPIC_API_KEY` / `VOYAGE_API_KEY`. Nothing in this
repo can generate those for you.

## 2. Frontend — complete redesign

New dark, glass, gradient design system (replacing the previous warm/light
"instrument console" theme entirely — this is a new token *system*, not a
recolor):

- `tailwind.config.ts` / `app/globals.css` — new tokens (`base`/`fg`
  surfaces+text, `primary` blue→violet + `accent` teal gradients, dark-
  tuned `positive`/`negative`/`neutral`/`warning`), a fixed ambient grid +
  glow backdrop, a reusable `.glass` surface recipe, custom scrollbar,
  `prefers-reduced-motion` guard. Font swapped to Inter (`next/font/google`)
  for UI text; IBM Plex Mono kept for numeric/data contexts.
- Every primitive rebuilt on the new system: `Button` (gradient/glass/
  outline/ghost/destructive variants with real hover glow), `Input` (glass
  + optional icon slot), `Card`, `Select`, `Label`, `Skeleton`.
- **Login / signup** (`app/(auth)/layout.tsx` + pages + forms) rebuilt to
  match the attached reference: split hero panel (orbit/scatter motif
  extending the existing LoopMark idea, real product copy, a floating
  illustrative "signal" widget, the actual RBAC roles as a footer legend)
  beside a glass form card. Added: password show/hide, a working
  "Remember me" (see §3), and a real `/forgot-password` page.
- **Dashboard & shell**: sidebar and app-shell rebuilt as glass panels with
  grouped nav and gradient branding; stat cards, and all three Recharts
  dashboard charts recolored for dark backgrounds (axes, grid, tooltips,
  cursor — these were hardcoded hex from the old theme, not token-driven).
- Every other screen (inbox, trends, ask, reports, settings/members, all
  dialogs, badges, pagination, tables) was systematically swept rather
  than left half-migrated: every old color token was renamed (not just
  revalued) across the whole app, every hardcoded `bg-white` card surface
  and the one hardcoded amber status badge were converted to the new
  tokens, and every table now scrolls horizontally on narrow screens
  instead of overflowing.
- Fixed a few "chip exactly matches the background it sits on" contrast
  bugs this redesign would otherwise have introduced (the unclassified-
  sentiment badge, empty-state icons, a member's avatar circle).
- **Deliberately not added:** "Continue with Google" from the reference
  image. Wiring real Google OAuth means new user provisioning logic and
  asking you for Google Cloud credentials — reasonable to do, but a real
  scope decision rather than a decorative button, so it's left out rather
  than shipped non-functional. Happy to build it if you want it.

## 3. Auth / session

- `lib/auth.ts`: "Remember me" is real, not decorative — unchecked sessions
  expire in 1 day, checked in 30, enforced via a custom `jwt.encode` that
  varies the token's own `exp` (verified directly against `next-auth/jwt`,
  not just read from the source — see §4).
- Hardened `signIn()` error handling in the login form (previously
  unguarded — a network failure there would have thrown unhandled).

## 4. Testing actually performed

- `npm install`, `npx tsc --noEmit`, `npx eslint .`, `npm run format` (all
  clean — 0 ESLint errors, 0 non-Prisma-cascade TypeScript errors).
- **Real auth round-trip against a live local Postgres**: signed up with
  `example@email.com` / `MyPassword123` using the project's actual
  `signUpSchema` + `bcryptjs` (cost 12, matching
  `workspace.service.ts` exactly), then logged in with the same
  credentials, different-cased email, and whitespace — all succeeded;
  wrong password and unknown email both correctly failed.
- **Remember-me duration verified directly**: encoded tokens with
  `next-auth/jwt`'s real `encode`/`decode` and confirmed unchecked sessions
  expire in ~1 day vs. ~30 days checked.
- **One confirmed environment-only limitation**: `prisma generate` cannot
  finish inside this sandbox specifically, because Prisma 7 still fetches
  a schema-engine binary from `binaries.prisma.sh` for CLI operations
  (query-time is Rust-free via the driver adapter, but `generate`/`migrate`
  aren't), and that host isn't reachable from here. All 109 TypeScript
  errors currently reported trace to this single cause (missing generated
  `@prisma/client` types) — checked file by file, not assumed. This will
  not happen in your own environment, which has normal internet access;
  it only affected how much I could verify from inside this chat.

## 5. Not touched

Prisma schema, business logic (feedback/theme/report/AI services), RBAC,
middleware, and the NextAuth credentials flow itself were left exactly as
they were — they were already correct — beyond the specific fixes above.
