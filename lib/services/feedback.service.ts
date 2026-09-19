import { Prisma, type Feedback, type FeedbackStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { CreateFeedbackInput, FeedbackFilters } from "@/lib/validations/feedback";

/**
 * Every function here takes `workspaceId` as its first argument and uses it
 * in the Prisma `where` clause of every query. There is no function in this
 * file - and, by extension, no code path in the app - that can read or
 * write a Feedback row without a workspace scope. That's the mechanical
 * enforcement of Section 06's tenant-isolation rule for this entity.
 */

const M1_LIST_CAP = 100;

export async function listRecentFeedback(workspaceId: string, take: number = M1_LIST_CAP) {
  return prisma.feedback.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: Math.min(take, M1_LIST_CAP),
  });
}

export async function countFeedback(workspaceId: string) {
  return prisma.feedback.count({ where: { workspaceId } });
}

export async function createFeedback(workspaceId: string, input: CreateFeedbackInput) {
  return prisma.feedback.create({
    data: {
      workspaceId,
      content: input.content,
      channel: input.channel,
      sourceRef: input.sourceRef || null,
      customerLabel: input.customerLabel || null,
      // sentiment / sentimentScore / featureArea / theme links are left
      // unset here by design - AI1 (Milestone 3) populates them on
      // ingestion. See Appendix A: "sentiment and themes left blank so
      // your AI classifier fills them on import."
    },
  });
}

export async function getFeedbackById(workspaceId: string, id: string) {
  return prisma.feedback.findFirst({
    where: { id, workspaceId },
    include: {
      feedbackThemes: {
        include: { theme: { select: { id: true, name: true, color: true } } },
      },
    },
  });
}

/**
 * C4 AC4: status workflow, changeable inline. Scoped with findFirst before
 * update rather than a bare `update({ where: { id } })`, so a request for
 * an out-of-workspace id fails as "not found" instead of ever reaching a
 * cross-tenant row.
 */
export async function updateFeedbackStatus(
  workspaceId: string,
  id: string,
  status: FeedbackStatus
) {
  const existing = await prisma.feedback.findFirst({ where: { id, workspaceId } });
  if (!existing) return null;

  return prisma.feedback.update({
    where: { id },
    data: { status },
  });
}

export interface NewFeedbackRecord {
  content: string;
  channel: Feedback["channel"];
  customerLabel?: string | null;
  sourceRef?: string | null;
  createdAt?: Date;
}

/**
 * Used by both CSV import (C3 AC2) and the simulated channels (C3 AC3) -
 * both are "insert a batch of raw feedback into this workspace," they just
 * source that batch differently. Callers normalize their own row shape
 * (CsvRow, SimulatedFeedbackItem) into NewFeedbackRecord before calling, so
 * this function doesn't need to know about either source format.
 */
export async function bulkCreateFeedback(workspaceId: string, items: NewFeedbackRecord[]) {
  if (items.length === 0) return { count: 0 };

  return prisma.feedback.createMany({
    data: items.map((item) => ({
      workspaceId,
      content: item.content,
      channel: item.channel,
      customerLabel: item.customerLabel || null,
      sourceRef: item.sourceRef || null,
      createdAt: item.createdAt,
    })),
  });
}

export interface PaginatedFeedback {
  items: Feedback[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * C4: the real inbox query - server-side pagination (AC1), filters across
 * channel/sentiment/theme/status/date range (AC2), and full-text search
 * (AC3). When `search` is absent, this runs through Prisma's ordinary
 * type-safe query builder. When present, it drops to raw SQL for the whole
 * query - `to_tsvector(...) @@ plainto_tsquery(...)` is genuine PostgreSQL
 * full-text search (word-aware, not a `contains` substring match), and
 * Prisma's query builder has no API surface for it, so this is the one
 * deliberate, well-scoped exception to "always use the ORM." Every
 * fragment is built with `Prisma.sql`/`Prisma.join`, which parameterizes
 * values the same way tagged-template `$queryRaw` does elsewhere - no
 * string concatenation of user input ever reaches the query text.
 */
export async function listFeedbackPaginated(
  workspaceId: string,
  filters: FeedbackFilters
): Promise<PaginatedFeedback> {
  const { page, pageSize, channel, sentiment, status, themeId, from, to, search } = filters;
  const skip = (page - 1) * pageSize;

  if (search) {
    return listFeedbackWithSearch(workspaceId, filters, skip);
  }

  const where: Prisma.FeedbackWhereInput = {
    workspaceId,
    ...(channel && { channel }),
    ...(status && { status }),
    ...(sentiment === "UNCLASSIFIED" ? { sentiment: null } : sentiment ? { sentiment } : {}),
    ...(themeId && { feedbackThemes: { some: { themeId } } }),
    ...((from || to) && {
      createdAt: {
        ...(from && { gte: from }),
        ...(to && { lte: to }),
      },
    }),
  };

  const [items, total] = await Promise.all([
    prisma.feedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.feedback.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

async function listFeedbackWithSearch(
  workspaceId: string,
  filters: FeedbackFilters,
  skip: number
): Promise<PaginatedFeedback> {
  const { pageSize, channel, sentiment, status, themeId, from, to, search, page } = filters;

  const conditions: Prisma.Sql[] = [
    Prisma.sql`f."workspaceId" = ${workspaceId}`,
    Prisma.sql`to_tsvector('english', f.content) @@ plainto_tsquery('english', ${search})`,
  ];
  if (channel) conditions.push(Prisma.sql`f.channel = ${channel}::"Channel"`);
  if (status) conditions.push(Prisma.sql`f.status = ${status}::"FeedbackStatus"`);
  if (sentiment === "UNCLASSIFIED") {
    conditions.push(Prisma.sql`f.sentiment IS NULL`);
  } else if (sentiment) {
    conditions.push(Prisma.sql`f.sentiment = ${sentiment}::"Sentiment"`);
  }
  if (from) conditions.push(Prisma.sql`f."createdAt" >= ${from}`);
  if (to) conditions.push(Prisma.sql`f."createdAt" <= ${to}`);
  if (themeId) {
    conditions.push(
      Prisma.sql`EXISTS (SELECT 1 FROM feedback_themes ft WHERE ft."feedbackId" = f.id AND ft."themeId" = ${themeId})`
    );
  }

  const whereClause = Prisma.join(conditions, " AND ");

  const [items, countResult] = await Promise.all([
    prisma.$queryRaw<Feedback[]>`
      SELECT f.* FROM feedback f
      WHERE ${whereClause}
      ORDER BY f."createdAt" DESC
      LIMIT ${pageSize} OFFSET ${skip}
    `,
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint as count FROM feedback f
      WHERE ${whereClause}
    `,
  ]);

  const total = Number(countResult[0]?.count ?? 0);

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
