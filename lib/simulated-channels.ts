import { Channel } from "@prisma/client";

/**
 * C3 AC3: "At least one 'channel' button seeds realistic items to simulate
 * an integration." Section 4.2 excludes real third-party integrations, so
 * these buttons stand in for "we just connected Zendesk / the App Store"
 * without an actual API call - exactly what the brief asks for.
 *
 * Two sources are implemented (more than the minimum of one) so the
 * simulate-channel menu demonstrates the pattern generalizes rather than
 * being a single hardcoded button.
 */

export type SimulatedSource = "support_inbox" | "app_store";

export interface SimulatedSourceMeta {
  id: SimulatedSource;
  label: string;
  description: string;
  channel: Channel;
}

export const SIMULATED_SOURCES: SimulatedSourceMeta[] = [
  {
    id: "support_inbox",
    label: "Sync support inbox",
    description: "Pulls the latest support tickets, as if from a connected helpdesk.",
    channel: Channel.SUPPORT_TICKET,
  },
  {
    id: "app_store",
    label: "Sync app store reviews",
    description: "Pulls new reviews, as if from a connected app store listing.",
    channel: Channel.APP_STORE_REVIEW,
  },
];

const SUPPORT_INBOX_POOL: string[] = [
  "Can't get the calendar integration to reauthenticate after it expired.",
  "Report scheduling silently stopped sending our Monday digest three weeks ago.",
  "Getting a permissions error trying to view a workspace I was just invited to.",
  "The bulk-tag action only applied to the first 20 of 60 selected items.",
  "Asked to increase our API rate limit for a migration and haven't heard back in 5 days.",
  "Custom domain setup instructions reference a DNS record type that isn't accepted.",
  "Team member's role change didn't take effect until they logged out and back in.",
  "Getting duplicate notifications for the same event, one right after another.",
  "The activity feed shows actions from a teammate who left the company months ago.",
  "Trying to downgrade our plan but the option isn't showing in billing settings.",
  "Session keeps logging out every few minutes even with 'remember me' checked.",
  "Import wizard doesn't show progress, just spins with no indication of how far along it is.",
];

const APP_STORE_POOL: string[] = [
  "Update broke my saved filters, had to set everything up again from scratch.",
  "Genuinely surprised how smooth the tablet experience is, feels like a real app not a shrunk website.",
  "Push notifications arrive 10-15 minutes late, which defeats the point for us.",
  "Support team walked me through a tricky setup over chat, really appreciated the patience.",
  "App size keeps growing with every update, now bigger than apps with way more features.",
  "The new quick-actions menu saves me so much time day to day.",
  "Face ID login stopped working after the last update, back to typing my password every time.",
  "Everything about this app just feels considered - little animations, clear copy, no clutter.",
  "Wish there was a way to preview an item without fully opening it.",
  "Battery usage in the background is way higher than it should be for what this app does.",
  "The redesign took some adjusting to but I prefer it now that I'm used to it.",
  "Crashes specifically when rotating the screen while a report is open.",
];

function pick<T>(pool: T[], count: number, offset: number): T[] {
  const rotated = [...pool.slice(offset % pool.length), ...pool.slice(0, offset % pool.length)];
  return rotated.slice(0, count);
}

export interface SimulatedFeedbackItem {
  content: string;
  channel: Channel;
  customerLabel: string;
  sourceRef: string;
}

const SIM_COMPANIES = [
  "Driftwood Media",
  "Pinecrest Capital",
  "Silverline Health",
  "Foxglove Studio",
  "Granite Peak Logistics",
  "Amberwood Retail",
];

/**
 * Generates a fresh, realistic batch as if just pulled from the given
 * source. Rotates through the content pool using the current count of
 * previously-imported items from this source as an offset, so repeated
 * clicks surface different items rather than the exact same batch.
 */
export function generateSimulatedBatch(
  source: SimulatedSource,
  previousImportCount: number,
  batchSize: number = 8
): SimulatedFeedbackItem[] {
  const meta = SIMULATED_SOURCES.find((s) => s.id === source);
  if (!meta) {
    throw new Error(`Unknown simulated source: ${source}`);
  }

  const pool = source === "support_inbox" ? SUPPORT_INBOX_POOL : APP_STORE_POOL;
  const refPrefix = source === "support_inbox" ? "TICKET" : "review";
  const items = pick(pool, Math.min(batchSize, pool.length), previousImportCount);

  return items.map((content, i) => ({
    content,
    channel: meta.channel,
    customerLabel: SIM_COMPANIES[(previousImportCount + i) % SIM_COMPANIES.length]!,
    sourceRef: `${refPrefix}-sync-${previousImportCount + i + 1}`,
  }));
}
