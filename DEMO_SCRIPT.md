# Demo Video Script

Timed for ~4 minutes. Read the narration roughly as written, but in your own voice — it'll sound
more natural than a stiff read-through. Practice once before recording; the whole thing goes
faster than it looks on paper.

**Before you hit record:** log in as admin and run AI processing already, so the demo shows real
classified data instead of watching a progress bar. Have four browser tabs pre-opened: Inbox,
Dashboard, Trends, Ask LOOP — cuts dead air switching between pages.

---

### 0:00-0:15 — Hook

_(Screen: Inbox, showing the 133 seeded items)_

> "This is LOOP - it takes scattered customer feedback from every channel a support team deals
> with, and turns it into a ranked, evidence-backed list of what to actually build next. I built
> this as a multi-tenant SaaS platform with Claude handling the intelligence layer."

### 0:15-0:35 — Auth & RBAC

_(Screen: log out, show the login page, log back in as admin)_

> "It's fully multi-tenant - every company gets an isolated workspace, three role levels: Admin,
> Analyst, Viewer, all enforced server-side, not just hidden buttons. I'm logged in as the admin
> for our demo workspace, Northwind Analytics."

### 0:35-1:10 — Ingestion

_(Screen: Inbox, click "New feedback", fill in a quick example, submit)_

> "Feedback comes in three ways. Manual entry -"

_(shows it appearing in the list)_

> "- CSV bulk import for migrating existing data -"

_(click Import CSV, show the dialog - have a small sample CSV ready, or just show the dialog and cancel if time's tight)_

> "- and simulated channel sync, standing in for a live integration like Zendesk or the App Store."

_(click Simulate Channel, Sync support inbox, show new items appear)_

### 1:10-1:35 — Inbox filters

_(Screen: type in the search box, pick a channel filter, change a status dropdown inline)_

> "The inbox has full server-side pagination, filtering by channel, sentiment, theme, status, and
> date range, and genuine full-text search - this isn't a substring match, it's real Postgres
> text search. Status is editable right here, inline."

### 1:35-2:00 — Dashboard

_(Screen: switch to Dashboard tab)_

> "The dashboard gives a product manager the shape of things at a glance - volume over time,
> sentiment breakdown, top themes, all filterable by date range."

_(click the 7-day range toggle, show it update)_

### 2:00-2:35 — AI classification

_(Screen: Trends tab - should already show classified themes since you pre-ran processing)_

> "Every item gets classified automatically by Claude on ingestion - sentiment, theme, feature
> area - structured JSON, validated, and stored, not recomputed every page load. Themes get
> clustered automatically too - Claude reuses an existing theme when it fits, or proposes a new
> one. And this view flags themes that are spiking versus the previous period."

_(point at a "Spiking" badge if one shows, click through to drill into the filtered inbox)_

> "Clicking a theme drills straight into the feedback behind it."

### 2:35-3:10 — Ask LOOP

_(Screen: Ask LOOP tab, type a real question)_

> "This is the part I'm most proud of - Ask LOOP. It's retrieval-augmented generation: your
> question gets embedded, the system finds the most semantically similar feedback in the
> database, and Claude answers strictly from what was retrieved."

_(type: "What are users saying about the mobile app?" and submit)_

> "It cites exactly which feedback items it used - so you can verify the answer yourself instead
> of just trusting it. If the data doesn't actually address the question, it says so instead of
> guessing."

### 3:10-3:45 — Reports

_(Screen: Reports tab, Generate report, pick 30 days)_

> "Last piece - one-click Voice-of-Customer reports. Every number here - the counts, the
> sentiment shift - is computed directly from the database, not by the model. Claude only writes
> the narrative around numbers it's already been given, so it can't hallucinate a statistic."

_(scroll through the generated report)_

> "It's saved for later, and exportable - this print button generates a clean PDF you could
> literally forward to leadership."

### 3:45-4:00 — Close

> "Under the hood: Next.js 14, Prisma 7, Postgres with pgvector, NextAuth, and Claude doing
> classification, clustering, retrieval, and report generation - all server-side, tenant-isolated
> at every query. That's Project LOOP."

_(end on the Dashboard or Inbox, whichever looks best)_

---

## If you're short on time

Cut in this order first: the CSV-import dialog demo (1:10 block), the dashboard date-range click
(1:55 block). Never cut: Ask LOOP or the Reports section - those are the two AI features most
worth showing working end-to-end, and Section 12.3 specifically grades whether the demo "shows
every feature working."
