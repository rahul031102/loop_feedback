import { prisma } from "@/lib/db";

/**
 * M2 needed only enough theme access to populate the inbox's theme filter
 * (C4 AC2). Milestone 3 adds clustering (find-or-create on classification),
 * counts, drill-down, and trend/spike detection (AI2).
 */
export async function listThemes(workspaceId: string) {
  return prisma.theme.findMany({
    where: { workspaceId },
    select: { id: true, name: true, color: true },
    orderBy: { name: "asc" },
  });
}

// A small, fixed palette so auto-created themes get a legible, distinct
// color deterministically (same name always gets the same color within a
// workspace) rather than a random one each time.
const THEME_COLOR_PALETTE = [
  "#2E6E8E",
  "#B8722E",
  "#B23B3B",
  "#8A8578",
  "#2F7A4F",
  "#6D5EF8",
  "#D97706",
  "#0E7490",
];

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return THEME_COLOR_PALETTE[hash % THEME_COLOR_PALETTE.length]!;
}

/**
 * AI2 AC4: "New feedback is assigned to existing themes where it fits, or
 * forms a new one." Claude is prompted (lib/ai.ts) to reuse an existing
 * theme name when one genuinely fits; this resolves that name to a real
 * Theme row - matching case-insensitively against what already exists in
 * the workspace (so "Mobile Experience" and "mobile experience" don't
 * silently become two themes), or creating a new one otherwise.
 */
export async function findOrCreateTheme(workspaceId: string, name: string) {
  const trimmed = name.trim();

  const existing = await prisma.theme.findFirst({
    where: { workspaceId, name: { equals: trimmed, mode: "insensitive" } },
  });
  if (existing) return existing;

  return prisma.theme.create({
    data: { workspaceId, name: trimmed, color: colorForName(trimmed) },
  });
}

/**
 * Replaces a feedback item's theme links with a fresh set. Used by both
 * initial classification and manual re-classify (AI1 AC4) - re-classifying
 * clears stale links rather than accumulating them alongside new ones.
 */
export async function setFeedbackThemes(
  feedbackId: string,
  assignments: { themeId: string; confidence: number }[]
) {
  await prisma.$transaction([
    prisma.feedbackTheme.deleteMany({ where: { feedbackId } }),
    ...(assignments.length > 0
      ? [
          prisma.feedbackTheme.createMany({
            data: assignments.map((a) => ({
              feedbackId,
              themeId: a.themeId,
              confidence: a.confidence,
            })),
          }),
        ]
      : []),
  ]);
}

export interface ThemeWithCount {
  id: string;
  name: string;
  color: string;
  description: string | null;
  count: number;
}

/** AI2 AC1: "Similar feedback is grouped into named themes with counts." */
export async function listThemesWithCounts(workspaceId: string): Promise<ThemeWithCount[]> {
  const themes = await prisma.theme.findMany({
    where: { workspaceId },
    select: {
      id: true,
      name: true,
      color: true,
      description: true,
      _count: { select: { feedbackThemes: true } },
    },
    orderBy: { name: "asc" },
  });

  return themes
    .map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      description: t.description,
      count: t._count.feedbackThemes,
    }))
    .sort((a, b) => b.count - a.count);
}

export interface ThemeTrend {
  id: string;
  name: string;
  color: string;
  currentCount: number;
  previousCount: number;
  percentChange: number | null;
  isSpiking: boolean;
}

const SPIKE_MIN_CURRENT_COUNT = 3;
const SPIKE_THRESHOLD_PERCENT = 30;

/**
 * AI2 AC2: "A trends view shows theme volume over time and flags themes
 * spiking versus the previous period." Compares two equal-length windows
 * (the last `periodDays` vs. the `periodDays` before that). A theme is
 * flagged spiking if it has meaningful current volume (not 1-2 items,
 * which would make any small change look like a huge percentage swing)
 * and either grew >= 30% period-over-period or is entirely new this period.
 */
export async function getThemeTrends(
  workspaceId: string,
  periodDays: number = 30
): Promise<ThemeTrend[]> {
  const now = new Date();
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const previousPeriodStart = new Date(periodStart.getTime() - periodDays * 24 * 60 * 60 * 1000);

  const themes = await prisma.theme.findMany({
    where: { workspaceId },
    select: {
      id: true,
      name: true,
      color: true,
      feedbackThemes: {
        select: { feedback: { select: { createdAt: true } } },
      },
    },
  });

  return themes
    .map((theme) => {
      let currentCount = 0;
      let previousCount = 0;

      for (const link of theme.feedbackThemes) {
        const createdAt = link.feedback.createdAt;
        if (createdAt >= periodStart) {
          currentCount++;
        } else if (createdAt >= previousPeriodStart && createdAt < periodStart) {
          previousCount++;
        }
      }

      const percentChange =
        previousCount > 0
          ? Math.round(((currentCount - previousCount) / previousCount) * 100)
          : null;

      const isSpiking =
        currentCount >= SPIKE_MIN_CURRENT_COUNT &&
        ((percentChange !== null && percentChange >= SPIKE_THRESHOLD_PERCENT) ||
          (previousCount === 0 && currentCount >= SPIKE_MIN_CURRENT_COUNT));

      return {
        id: theme.id,
        name: theme.name,
        color: theme.color,
        currentCount,
        previousCount,
        percentChange,
        isSpiking,
      };
    })
    .sort((a, b) => {
      if (a.isSpiking !== b.isSpiking) return a.isSpiking ? -1 : 1;
      return b.currentCount - a.currentCount;
    });
}
