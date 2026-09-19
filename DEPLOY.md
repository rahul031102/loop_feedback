# Deploying LOOP — exact steps

Everything up to the point of needing your own accounts is done. This is deliberately written
so you can copy-paste each block without having to figure anything out. Where a step needs _you_
specifically (an account, a click, a key) it's marked **[YOU]**.

Total time: ~15-20 minutes if nothing goes wrong. If something errors, paste the exact error back
and I'll fix it — most of what could go wrong here is a typo'd env var or a missed step, not a
real bug (the code itself is already verified via `tsc`/`next build`).

---

## 1. Push to GitHub **[YOU: create the repo first]**

Go to github.com → New repository → name it `loop` (or whatever you like) → **do not**
initialize with a README/gitignore (this repo already has both) → Create.

Then, from inside the unzipped project folder:

```bash
git init
git add .
git commit -m "Project LOOP - Zidio internship submission"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## 2. Create the database **[YOU: pick one]**

**Neon** (neon.tech) — free tier, sign in with GitHub, "Create Project," copy the connection
string it shows you. It already includes `?sslmode=require`.

**Supabase** (supabase.com) — free tier, "New Project," then Project Settings → Database →
Connection String → "URI" tab → copy it, append `?sslmode=require` if it's not already there.

Either way, you now have a `DATABASE_URL` value. Save it somewhere for step 5.

## 3. Enable pgvector **[YOU, but copy-paste]**

Open your database's SQL editor (Neon and Supabase both have one in their dashboard) and run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## 4. Get your API keys **[YOU]**

- Anthropic: console.anthropic.com → API Keys → Create Key → copy it (`ANTHROPIC_API_KEY`)
- Voyage AI: dashboard.voyageai.com → sign up (free tier exists) → API Keys → copy it (`VOYAGE_API_KEY`)

## 5. Run migrations and seed **locally, against your new database**

```bash
npm install
cp .env.example .env.local
```

Open `.env.local` and fill in the four values from steps 2 and 4, plus:

```
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
```

Then:

```bash
npx prisma migrate dev --name init
npm run seed
```

You should see "Seed complete" and the three demo logins printed. If this step fails, paste the
exact error — this is the step most likely to surface a typo in `DATABASE_URL`.

**Optional but recommended:** run `npm run dev`, open `http://localhost:3000`, log in as the
seeded admin, and click **Run AI processing** in the Inbox _now_, locally. That way your live
deployment starts with everything already classified instead of you doing it again after deploy.

## 6. Deploy to Vercel **[YOU]**

Go to vercel.com → sign in with GitHub → **Add New → Project** → import the repo from step 1.

Vercel will detect Next.js automatically. Before clicking Deploy, expand **Environment
Variables** and add all five:

| Key                 | Value                                |
| ------------------- | ------------------------------------ |
| `DATABASE_URL`      | from step 2                          |
| `NEXTAUTH_SECRET`   | from step 5                          |
| `NEXTAUTH_URL`      | leave blank for now — see note below |
| `ANTHROPIC_API_KEY` | from step 4                          |
| `VOYAGE_API_KEY`    | from step 4                          |

Click **Deploy**.

**About `NEXTAUTH_URL`:** Vercel gives you the production URL only _after_ the first deploy
(something like `https://loop-yourname.vercel.app`). Deploy once, copy that URL, go to Project
Settings → Environment Variables, add `NEXTAUTH_URL` with that exact value, then trigger a
redeploy (Deployments tab → ⋯ on the latest one → Redeploy). This two-step dance is a real
Vercel/NextAuth quirk, not something I got wrong — the URL genuinely doesn't exist until after
the first deploy.

## 7. Smoke test

Visit your live URL. Log in with the seeded admin credentials (README has them). Confirm:

- [ ] Login works
- [ ] Inbox shows 133 items
- [ ] Dashboard charts render
- [ ] If you didn't already run AI processing locally in step 5, do it now on the live site
- [ ] Ask LOOP answers a question
- [ ] Generate a report

That's the live URL for Section 13's submission requirement #2.

## If something breaks

Paste me the exact error message and which step you were on. This deployment path uses nothing
exotic — Vercel, Postgres, two API keys — so almost anything that goes wrong will be a copy-paste
slip (extra space in an env var, missing `?sslmode=require`, etc.) rather than a real defect, and
fixable in one message.
