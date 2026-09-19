import { prisma } from "@/lib/db";
import { Sentiment } from "@prisma/client";
import { generateLocalVoCNarrative } from "@/lib/local-report";
import type {
  VoCReportContent,
  PeriodSentimentBreakdown,
  ReportThemeStat,
  RepresentativeQuote,
} from "@/lib/validations/reports";

const MAX_TOP_THEMES = 5;
const MAX_QUOTES_PER_THEME = 2;
const MAX_TOTAL_QUOTES = 8;

async function getSentimentBreakdown(
  workspaceId: string,
  start: Date,
  end: Date
): Promise<PeriodSentimentBreakdown> {
  const groups = await prisma.feedback.groupBy({
    by: ["sentiment"],
    where: { workspaceId, createdAt: { gte: start, lt: end } },
    _count: true,
  });

  const breakdown: PeriodSentimentBreakdown = {
    positive: 0,
    neutral: 0,
    negative: 0,
    unclassified: 0,
  };
  for (const g of groups) {
    if (g.sentiment === Sentiment.POSITIVE) breakdown.positive = g._count;
    else if (g.sentiment === Sentiment.NEUTRAL) breakdown.neutral = g._count;
    else if (g.sentiment === Sentiment.NEGATIVE) breakdown.negative = g._count;
    else breakdown.unclassified = g._count;
  }
  return breakdown;
}

async function getTopThemesForPeriod(
  workspaceId: string,
  start: Date,
  end: Date,
  previousStart: Date
): Promise<ReportThemeStat[]> {
  const themes = await prisma.theme.findMany({
    where: { workspaceId },
    select: {
      id: true,
      name: true,
      color: true,
      feedbackThemes: { select: { feedback: { select: { createdAt: true } } } },
    },
  });

  const stats = themes.map((theme) => {
    let count = 0;
    let previousCount = 0;
    for (const link of theme.feedbackThemes) {
      const createdAt = link.feedback.createdAt;
      if (createdAt >= start && createdAt < end) count++;
      else if (createdAt >= previousStart && createdAt < start) previousCount++;
    }
    return { id: theme.id, name: theme.name, color: theme.color, count, previousCount };
  });

  return stats
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_TOP_THEMES);
}

/**
 * AI4 AC2: "notable verbatim quotes." Picks up to 2 real feedback excerpts
 * per top theme, capped overall - genuine customer language for the
 * report, not something Claude invents. Ordering surfaces negative
 * sentiment first (more useful signal for a leadership digest than neutral
 * chatter), falling back to whatever's available per theme.
 */
async function getRepresentativeQuotes(
  workspaceId: string,
  start: Date,
  end: Date,
  themeIds: string[]
): Promise<RepresentativeQuote[]> {
  if (themeIds.length === 0) return [];

  const quotes: RepresentativeQuote[] = [];

  for (const themeId of themeIds) {
    if (quotes.length >= MAX_TOTAL_QUOTES) break;

    const items = await prisma.feedback.findMany({
      where: {
        workspaceId,
        createdAt: { gte: start, lt: end },
        feedbackThemes: { some: { themeId } },
      },
      orderBy: [{ sentiment: "asc" }, { createdAt: "desc" }],
      take: MAX_QUOTES_PER_THEME,
      select: { content: true, channel: true, sentiment: true, customerLabel: true },
    });

    quotes.push(...items);
  }

  return quotes.slice(0, MAX_TOTAL_QUOTES);
}

export async function computePeriodStats(workspaceId: string, periodStart: Date, periodEnd: Date) {
  const durationMs = periodEnd.getTime() - periodStart.getTime();
  const previousPeriodStart = new Date(periodStart.getTime() - durationMs);

  const [
    totalItems,
    previousPeriodTotalItems,
    sentimentBreakdown,
    previousSentimentBreakdown,
    topThemes,
  ] = await Promise.all([
    prisma.feedback.count({
      where: { workspaceId, createdAt: { gte: periodStart, lt: periodEnd } },
    }),
    prisma.feedback.count({
      where: { workspaceId, createdAt: { gte: previousPeriodStart, lt: periodStart } },
    }),
    getSentimentBreakdown(workspaceId, periodStart, periodEnd),
    getSentimentBreakdown(workspaceId, previousPeriodStart, periodStart),
    getTopThemesForPeriod(workspaceId, periodStart, periodEnd, previousPeriodStart),
  ]);

  const representativeQuotes = await getRepresentativeQuotes(
    workspaceId,
    periodStart,
    periodEnd,
    topThemes.map((t) => t.id)
  );

  return {
    totalItems,
    previousPeriodTotalItems,
    sentimentBreakdown,
    previousSentimentBreakdown,
    topThemes,
    representativeQuotes,
  };
}

/**
 * AI4: the full report pipeline. Stats are computed in code (above) and
 * handed to a local template-based narrator (lib/local-report.ts) - no
 * ANTHROPIC_API_KEY required. Every number in the report comes from the
 * stats computed here; the narrator only turns them into prose and
 * suggests actions grounded in them.
 */
export async function generateVoCReport(
  workspaceId: string,
  generatedById: string,
  periodStart: Date,
  periodEnd: Date,
  title: string
) {
  const stats = await computePeriodStats(workspaceId, periodStart, periodEnd);

  const narrativeResult = await generateLocalVoCNarrative(stats);
  if (!narrativeResult.success) {
    throw new Error(narrativeResult.error);
  }

  const content: VoCReportContent = {
    ...stats,
    narrative: narrativeResult.data.narrative,
    recommendedActions: narrativeResult.data.recommendedActions,
  };

  return prisma.report.create({
    data: {
      workspaceId,
      generatedById,
      title,
      periodStart,
      periodEnd,
      contentJson: content as unknown as object,
    },
  });
}

export async function listReports(workspaceId: string) {
  return prisma.report.findMany({
    where: { workspaceId },
    select: {
      id: true,
      title: true,
      periodStart: true,
      periodEnd: true,
      createdAt: true,
      generatedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getReportById(workspaceId: string, id: string) {
  return prisma.report.findFirst({
    where: { id, workspaceId },
    include: { generatedBy: { select: { name: true } } },
  });
}
