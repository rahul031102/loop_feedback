import { prisma } from "@/lib/db";
import { Sentiment } from "@prisma/client";
import { classifyAllPendingFeedback } from "@/lib/services/ai-processing.service";

export type DashboardRangeDays = 7 | 30 | 90;

export interface DashboardStats {
  totalItems: number;
  negativePercent: number;
  newThisWeek: number;
  volumeOverTime: { date: string; count: number }[];
  sentimentBreakdown: { sentiment: Sentiment | "UNCLASSIFIED"; count: number }[];
  topThemes: { id: string; name: string; color: string; count: number }[];
}

/**
 * C5 AC2: "Charts reflect the active filters / date range." The dashboard
 * accepts a date-range window (7/30/90 days) that scopes every chart and
 * stat card below - the one filter dimension that's specifically named in
 * the acceptance criteria for a dashboard (as opposed to C4's fuller
 * channel/sentiment/theme/status filter set, which belongs to the inbox).
 *
 * C5 AC1 asks for three charts, with the sentiment and theme breakdowns
 * necessarily showing "Unclassified" / zero counts until Milestone 3's AI
 * classification runs - Section 10's own Day 10 entry ("Dashboard shell
 * with Recharts... placeholder data ok") anticipates exactly this: the
 * queries here are real and will show real breakdowns the moment M3
 * populates sentiment and theme links, with no code change required.
 *
 * That backfill is triggered right here rather than left to a manual
 * step: any workspace feedback still sitting at `sentiment: null` (seed
 * data, a CSV import, a simulated-channel batch) is classified before the
 * stats below are read, so the Dashboard always reflects fully classified
 * data with no separate "run AI processing" action required. The local
 * classifier is synchronous and has no rate limit, so this is cheap; once
 * a workspace is fully classified it's a single fast count query on every
 * later load.
 */
export async function getDashboardStats(
  workspaceId: string,
  rangeDays: DashboardRangeDays = 30
): Promise<DashboardStats> {
  await classifyAllPendingFeedback(workspaceId);

  const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalItems, negativeItems, newThisWeek, volumeOverTime, sentimentGroups, topThemes] =
    await Promise.all([
      prisma.feedback.count({ where: { workspaceId, createdAt: { gte: since } } }),
      prisma.feedback.count({
        where: { workspaceId, createdAt: { gte: since }, sentiment: Sentiment.NEGATIVE },
      }),
      prisma.feedback.count({ where: { workspaceId, createdAt: { gte: weekAgo } } }),
      getVolumeOverTime(workspaceId, since),
      prisma.feedback.groupBy({
        by: ["sentiment"],
        where: { workspaceId, createdAt: { gte: since } },
        _count: true,
      }),
      getTopThemes(workspaceId, since),
    ]);

  const sentimentBreakdown = sentimentGroups.map((g) => ({
    sentiment: g.sentiment ?? ("UNCLASSIFIED" as const),
    count: g._count,
  }));

  return {
    totalItems,
    negativePercent: totalItems > 0 ? Math.round((negativeItems / totalItems) * 100) : 0,
    newThisWeek,
    volumeOverTime,
    sentimentBreakdown,
    topThemes,
  };
}

/**
 * Daily bucketed counts for the volume-over-time chart. DATE_TRUNC has no
 * equivalent in Prisma's query builder, so this is a deliberate, narrowly
 * scoped raw query - workspaceId and the date bound are the only inputs,
 * both parameterized, no user-controlled string ever enters the query.
 */
async function getVolumeOverTime(
  workspaceId: string,
  since: Date
): Promise<{ date: string; count: number }[]> {
  const rows = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
    SELECT DATE_TRUNC('day', "createdAt") as day, COUNT(*)::bigint as count
    FROM feedback
    WHERE "workspaceId" = ${workspaceId} AND "createdAt" >= ${since}
    GROUP BY day
    ORDER BY day ASC
  `;

  return rows.map((r) => ({
    date: r.day.toISOString().slice(0, 10),
    count: Number(r.count),
  }));
}

async function getTopThemes(
  workspaceId: string,
  since: Date
): Promise<{ id: string; name: string; color: string; count: number }[]> {
  const themes = await prisma.theme.findMany({
    where: { workspaceId },
    select: {
      id: true,
      name: true,
      color: true,
      _count: {
        select: { feedbackThemes: { where: { feedback: { createdAt: { gte: since } } } } },
      },
    },
  });

  return themes
    .map((t) => ({ id: t.id, name: t.name, color: t.color, count: t._count.feedbackThemes }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}
