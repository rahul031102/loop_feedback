/**
 * Seed script - Section 07: "Ship a seed script that creates one demo
 * workspace, three users (one per role), at least 120 realistic feedback
 * items across several channels, and a handful of themes."
 *
 * Sentiment, sentimentScore, and theme links are deliberately left unset
 * here, per Appendix A: "sentiment and themes left blank so your AI
 * classifier fills them on import." That classifier is Milestone 3 work;
 * this script only needs to produce the raw feedback it will act on.
 *
 * Run with: npm run seed
 */
import { config as loadEnv } from "dotenv";
import path from "node:path";
import { PrismaClient, Channel, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

// Same .env.local-first precedence as prisma.config.ts (see its comment) -
// this is the one other place that loads env vars outside the Next.js app
// itself, since `npm run seed` can also be invoked directly rather than
// through `prisma db seed`.
loadEnv({ path: path.join(process.cwd(), ".env.local") });
loadEnv({ path: path.join(process.cwd(), ".env") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local first.");
}
const adapter = new PrismaPg({
  connectionString,
  ssl: /(localhost|127\.0\.0\.1)/.test(connectionString)
    ? undefined
    : { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * DAY_MS);
}

const COMPANIES = [
  "Northbeam Logistics",
  "Cascade Robotics",
  "Fernhill Insurance",
  "Blue Harbor Media",
  "Ridgeline Analytics",
  "Solace Health",
  "Anchor & Co",
  "Trellis Manufacturing",
  "Vantage Point Consulting",
  "Meridian Retail Group",
  "Copper Peak Software",
  "Halcyon Biotech",
  "Ember Financial",
  "Lattice Works",
  "Northstar Freight",
  "Ironclad Security",
  "Willow Creek Studios",
  "Ascend Learning",
  "Portside Ventures",
  "Clearwater Utilities",
];

function company(i: number): string {
  return COMPANIES[i % COMPANIES.length]!;
}

interface SeedItem {
  content: string;
  channel: Channel;
  daysAgo: number;
  sourceRef?: string;
  customerLabel?: string;
}

// Support tickets - direct, problem-first, often frustrated.
const supportTickets: string[] = [
  "Onboarding took forever - I couldn't figure out how to invite my team.",
  "Billing page keeps timing out when I try to download an invoice.",
  "We can't get SAML SSO to work with Okta. Docs reference a field that doesn't exist in the settings page.",
  "The mobile app crashes every time I try to attach a screenshot to a ticket.",
  "Export to CSV has been stuck at 'processing' for over an hour.",
  "Getting a 500 error whenever I try to bulk-archive more than 50 items at once.",
  "Our team lead can't remove a former employee's access - the button just spins.",
  "Dashboard loads fine on desktop but times out constantly on our office wifi.",
  "None of the webhook retries are firing after a failed delivery. We're missing events.",
  "Password reset email never arrived, checked spam three times.",
  "The date filter resets itself every time I switch tabs and come back.",
  "API rate limits kicked in way below the documented threshold - we were nowhere near 1000/min.",
  "Two-factor codes from the authenticator app are being rejected as invalid even though the clock is synced.",
  "Search is returning zero results for terms that definitely exist in our records.",
  "Custom fields we set up last month have all reverted to their default values.",
  "The 'download all' button on reports silently fails with no error message.",
  "Our sync with the calendar integration duplicated every event for the past two weeks.",
  "Trying to merge two duplicate customer records but the merge tool just hangs.",
  "Notifications stopped coming through to Slack a few days ago with no config changes on our end.",
  "The audit log is missing entries from last Tuesday - we need it for a compliance review.",
  "Uploading a file over 20MB just fails silently instead of showing a size limit error.",
  "We lost an hour of unsaved form data when the session expired without warning.",
  "Timezone settings aren't respected in the weekly digest email - everything shows UTC.",
  "The keyboard shortcuts stopped working after the last update.",
  "Getting billed for five seats but only four people have ever logged in.",
];

// App store reviews - short, star-rating tone, mix of praise and complaint.
const appStoreReviews: string[] = [
  "The new dashboard is gorgeous and finally fast. Huge improvement.",
  "Crashes on launch since the last update. Had to delete and reinstall twice.",
  "Clean interface, does exactly what it says. Wish there was a dark mode though.",
  "Been using this for 8 months and it just keeps getting better. Great support team too.",
  "Notifications are broken - haven't gotten a single push alert in weeks.",
  "Finally added offline mode and it works flawlessly. Take my five stars.",
  "The search feature is basically useless, never finds what I'm looking for.",
  "Simple, fast, does the job without getting in the way. Exactly what I needed.",
  "App drains my battery way faster than any other tool I have installed.",
  "Love the redesign but the onboarding tutorial is way too long, let me skip it.",
  "Syncs perfectly across my phone and laptop, never lose my place.",
  "Constant lag when scrolling through longer lists, even on a newer phone.",
  "Support responded within an hour and actually fixed my issue. Rare these days.",
  "Widget on the home screen stopped updating a month ago.",
  "Best-in-class for what we need, worth every penny of the subscription.",
  "Login screen freezes about half the time, have to force-quit and retry.",
  "The tablet layout finally makes proper use of the screen space. Nice work.",
  "Too many permission requests on first launch, felt invasive.",
  "Genuinely impressed by how often useful features get added without cluttering things up.",
  "Text is too small and there's no way to adjust it in settings.",
];

// NPS / CSAT survey free text - reflective, often balanced/hedged.
const surveyResponses: string[] = [
  "It does the job, but the mobile experience needs work.",
  "Would recommend - saved our team hours every week on reporting.",
  "Wouldn't recommend yet, too many rough edges in the onboarding flow.",
  "Solid product overall, the billing/invoicing section is confusing though.",
  "Genuinely the best tool we've adopted this year for the price.",
  "Support has been slow to respond to two separate tickets now.",
  "Great value, but we need better export options before I'd recommend it widely.",
  "The dashboard gives us exactly the visibility we were missing before.",
  "Onboarding was rough, but once we were set up it's been smooth sailing.",
  "Would rate higher if the reporting tools were more customizable.",
  "Reliable and fast, no complaints from our team in months.",
  "It works, but feels like it's missing basic integrations competitors already have.",
  "Pricing feels steep for a team our size compared to alternatives we evaluated.",
  "The mobile app is what's holding this back from a perfect score for us.",
  "Customer support quality is the main reason we're staying instead of switching.",
  "Performance has noticeably improved over the last couple of releases.",
  "Would like to see SSO included without needing the enterprise tier.",
  "Overall satisfied, main friction point is the export/reporting workflow.",
  "The learning curve was steeper than expected for new team members.",
  "Does what we need reliably, though the UI could use a refresh.",
];

// Sales call notes - third person, written by the rep, deal-context framing.
const salesCallNotes: string[] = [
  "Prospect wants SSO before they'll sign - third time this month.",
  "Renewal call: customer flagged the mobile app as the main blocker to expanding seats.",
  "Prospect compared us favorably to [competitor] but said our reporting is behind.",
  "Existing customer asked about a native Slack integration during the QBR - said it would be a dealbreaker for renewal.",
  "New prospect very price-sensitive, asked for a lower tier without SSO to hit their budget.",
  "Customer success flagged that this account has opened four support tickets about CSV export this quarter.",
  "Prospect's security team requires SOC 2 documentation before proceeding - sent over what we have.",
  "Upsell call: customer interested in the analytics add-on but wants a trial period first.",
  "Renewal at risk - customer cited slow support response times as the primary concern.",
  "Prospect asked specifically about bulk import capabilities for migrating from their legacy tool.",
  "Customer mentioned the onboarding took their team nearly three weeks longer than expected.",
  "Expansion call: happy customer, wants to add 40 more seats next quarter pending budget approval.",
  "Prospect's IT team pushed back on the audit log retention period being too short.",
  "Customer asked when custom roles beyond admin/analyst/viewer might be available.",
  "Renewal call went well overall, customer specifically praised the recent dashboard performance improvements.",
  "Prospect wants a dedicated account manager as part of the enterprise package before signing.",
  "Customer raised concerns about data residency options for their EU-based subsidiaries.",
  "Deal stalled - procurement wants a signed DPA and we're waiting on legal to draft one.",
  "Customer success noted a spike in usage from this account after the mobile app fix shipped.",
  "Prospect asked about API rate limits for a high-volume integration they're planning.",
];

// Community posts - forum tone, tips, requests, occasional praise.
const communityPosts: string[] = [
  "Love the new export feature, saved me an hour today.",
  "Does anyone know if there's a way to bulk-tag items? Can't find it in the docs.",
  "PSA: the keyboard shortcut for quick-add is way faster than clicking through the menu.",
  "Would be great to see a public roadmap so we know what's coming.",
  "Just switched over from a competitor and the migration was smoother than expected.",
  "Anyone else notice the notification settings reset after every update?",
  "Tip: you can filter by multiple channels at once if you hold shift while selecting.",
  "Really wish there was a way to save custom filter combinations as presets.",
  "The new charts on the dashboard are a huge upgrade from the old table view.",
  "Is there a public API changelog somewhere? Hard to track breaking changes.",
  "Six months in and the team still finds new useful features every week.",
  "Feature request: dark mode, please. My eyes would thank you.",
  "Anyone using the mobile app for daily triage? Curious how reliable it's been for others.",
  "The community here has been more helpful than official support honestly.",
  "Would pay extra for a proper Zapier integration instead of the current webhook workaround.",
  "Just a heads up to others: clearing your browser cache fixed the stuck-loading issue for me.",
  "Onboarding docs could really use more real-world examples instead of just field descriptions.",
  "The new bulk-actions menu is a nice quality-of-life improvement.",
  "Does the roadmap include native mobile push notifications, or is that not planned?",
  "Appreciate how responsive the team has been to feedback in this forum specifically.",
];

// Social mentions - short, casual, tweet-like.
const socialMentions: string[] = [
  "just found out you can filter by sentiment in @LOOP and it's changed how our team triages feedback",
  "why is the mobile app still this laggy in 2026, come on",
  "shoutout to the support team for turning around a fix in under a day",
  "anyone know if LOOP has a status page? having trouble loading dashboards right now",
  "the onboarding for this thing was rough but I'm glad I stuck with it",
  "billing dashboard finally doesn't time out, whoever fixed that thank you",
  "wish more B2B tools had exports this clean honestly",
  "still waiting on that SSO fix, been open for weeks now",
  "the new report generator is actually really good, wasn't expecting that",
  "customer support ghosted my ticket for four days, not great",
  "just set up the CSV import and it just worked first try, nice surprise",
  "mobile notifications completely stopped working for me this week",
  "genuinely one of the better dashboards I've used for this kind of data",
  "anyone else's search just returning nothing lately?",
  "really like that they actually read feedback here and ship fixes",
  "pricing jump for the next tier felt steep compared to what we're getting",
  "the loading states on this thing are so much smoother than they used to be",
  "still no dark mode?? asking for a friend (me)",
  "support response time has been way better lately, appreciate it",
  "export button just spins forever for anything over a few hundred rows",
];

function buildItems(): SeedItem[] {
  const items: SeedItem[] = [];
  let i = 0;

  // Even historical spread for most content, drawn from the last 90 days.
  const spread = (texts: string[], channel: Channel, refPrefix?: string) => {
    texts.forEach((content, idx) => {
      const item: SeedItem = {
        content,
        channel,
        daysAgo: Math.floor((idx / texts.length) * 85) + Math.floor(Math.random() * 4),
        customerLabel: company(i++),
      };
      if (refPrefix) item.sourceRef = `${refPrefix}-${1000 + idx}`;
      items.push(item);
    });
  };

  spread(supportTickets, Channel.SUPPORT_TICKET, "TICKET");
  spread(appStoreReviews, Channel.APP_STORE_REVIEW, "review");
  spread(surveyResponses, Channel.NPS_SURVEY);
  spread(salesCallNotes, Channel.SALES_CALL_NOTE);
  spread(communityPosts, Channel.COMMUNITY_POST);
  spread(socialMentions, Channel.SOCIAL_MENTION);

  // Mild recency bias for mobile-experience and SSO/integration complaints,
  // so Milestone 3's spike-detection has real signal to find once themes
  // are linked - not a data-science exercise, just enough deliberate shape
  // that the trends feature has something true to show.
  const recentMobileAndSso: SeedItem[] = [
    {
      content: "Mobile app crashed again trying to open a shared report.",
      channel: Channel.SUPPORT_TICKET,
      daysAgo: 2,
      customerLabel: company(i++),
      sourceRef: "TICKET-2201",
    },
    {
      content: "SSO login loop is back - third time reporting this exact issue.",
      channel: Channel.SUPPORT_TICKET,
      daysAgo: 1,
      customerLabel: company(i++),
      sourceRef: "TICKET-2202",
    },
    {
      content: "mobile app battery drain is actually unreal now, something regressed",
      channel: Channel.SOCIAL_MENTION,
      daysAgo: 3,
      customerLabel: company(i++),
    },
    {
      content: "Prospect walked away from the deal specifically over missing SSO support.",
      channel: Channel.SALES_CALL_NOTE,
      daysAgo: 4,
      customerLabel: company(i++),
    },
    {
      content:
        "Mobile experience needs work, still the weakest part of an otherwise great product.",
      channel: Channel.NPS_SURVEY,
      daysAgo: 2,
      customerLabel: company(i++),
    },
    {
      content: "Okta SSO integration broke again after yesterday's update.",
      channel: Channel.SUPPORT_TICKET,
      daysAgo: 0,
      customerLabel: company(i++),
      sourceRef: "TICKET-2210",
    },
    {
      content: "the mobile app has gotten noticeably slower over the past two weeks",
      channel: Channel.COMMUNITY_POST,
      daysAgo: 5,
      customerLabel: company(i++),
    },
    {
      content:
        "Renewal at risk - customer's IT team is blocking on unresolved SSO reliability issues.",
      channel: Channel.SALES_CALL_NOTE,
      daysAgo: 1,
      customerLabel: company(i++),
    },
  ];
  items.push(...recentMobileAndSso);

  return items;
}

const THEMES: { name: string; description: string; color: string }[] = [
  {
    name: "Onboarding & Setup",
    description: "First-run experience, account and team setup.",
    color: "#2E6E8E",
  },
  {
    name: "Billing & Invoicing",
    description: "Payments, invoices, and billing page issues.",
    color: "#B8722E",
  },
  {
    name: "Mobile Experience",
    description: "Mobile app performance, crashes, and gaps vs. desktop.",
    color: "#B23B3B",
  },
  {
    name: "Performance & Reliability",
    description: "Load times, timeouts, and general stability.",
    color: "#8A8578",
  },
  {
    name: "Integrations & SSO",
    description: "SSO, webhooks, and third-party integrations.",
    color: "#2F7A4F",
  },
  {
    name: "Customer Support Quality",
    description: "Response times and support experience.",
    color: "#6D5EF8",
  },
  {
    name: "Pricing & Plans",
    description: "Plan tiers, seat pricing, and perceived value.",
    color: "#D97706",
  },
  {
    name: "Reporting & Exports",
    description: "Dashboards, charts, CSV/PDF export reliability.",
    color: "#0E7490",
  },
];

async function main() {
  console.log("Seeding LOOP demo data...");

  // Idempotent: wipe any previous demo workspace before reseeding, so this
  // script can be re-run safely without creating duplicates.
  const existing = await prisma.workspace.findFirst({ where: { name: "Northwind Analytics" } });
  if (existing) {
    await prisma.workspace.delete({ where: { id: existing.id } });
    console.log("Removed previous demo workspace.");
  }

  const workspace = await prisma.workspace.create({
    data: { name: "Northwind Analytics" },
  });

  const [adminPass, analystPass, viewerPass] = await Promise.all([
    hash("Admin123!", 12),
    hash("Analyst123!", 12),
    hash("Viewer123!", 12),
  ]);

  await prisma.user.createMany({
    data: [
      {
        workspaceId: workspace.id,
        name: "Priya Sharma",
        email: "admin@northwind.example",
        passwordHash: adminPass,
        role: Role.ADMIN,
      },
      {
        workspaceId: workspace.id,
        name: "Daniel Osei",
        email: "analyst@northwind.example",
        passwordHash: analystPass,
        role: Role.ANALYST,
      },
      {
        workspaceId: workspace.id,
        name: "Maria Chen",
        email: "viewer@northwind.example",
        passwordHash: viewerPass,
        role: Role.VIEWER,
      },
    ],
  });
  console.log("Created workspace and 3 users (admin / analyst / viewer).");

  await prisma.theme.createMany({
    data: THEMES.map((t) => ({ ...t, workspaceId: workspace.id })),
  });
  console.log(
    `Created ${THEMES.length} themes (unlinked - Milestone 3 clusters feedback into these).`
  );

  const items = buildItems();
  await prisma.feedback.createMany({
    data: items.map((item) => ({
      workspaceId: workspace.id,
      content: item.content,
      channel: item.channel,
      sourceRef: item.sourceRef,
      customerLabel: item.customerLabel,
      createdAt: daysAgo(item.daysAgo),
      // sentiment / sentimentScore / featureArea intentionally left null -
      // Milestone 3's classifier fills these on ingestion.
    })),
  });
  console.log(
    `Created ${items.length} feedback items across ${new Set(items.map((i) => i.channel)).size} channels.`
  );

  console.log("\nDemo login credentials:");
  console.log("  Admin:   admin@northwind.example   / Admin123!");
  console.log("  Analyst: analyst@northwind.example / Analyst123!");
  console.log("  Viewer:  viewer@northwind.example  / Viewer123!");
  console.log("\nSeed complete.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
