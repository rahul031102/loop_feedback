import type { Feedback } from "@prisma/client";
import { prisma } from "@/lib/db";
import { classifyFeedbackLocally } from "@/lib/local-classifier";
import { answerQuestionLocally } from "@/lib/local-qa";
import { embedText, storeFeedbackEmbedding } from "@/lib/services/search.service";
import { listThemes, findOrCreateTheme, setFeedbackThemes } from "@/lib/services/theme.service";
import type { AskResponse } from "@/lib/validations/ai";

/**
 * AI1 AC1/AC3: classify one item and store the result on the record - not
 * recomputed on every page load, per AC3. Classification itself
 * (classifyFeedbackLocally) is a local, synchronous, keyword/rule-based
 * function - no ANTHROPIC_API_KEY, no network call, so it doesn't fail the
 * way a hosted-model call could. This function stays async and keeps its
 * shape (fetch existing themes, classify, persist) so every caller below
 * (processPendingBatch, reclassifyFeedback, processSingleFeedbackItem)
 * keeps working unchanged.
 */
async function classifyAndStoreFeedback(workspaceId: string, feedback: Feedback): Promise<void> {
  const existingThemes = await listThemes(workspaceId);
  const { sentiment, sentimentScore, themes, featureArea } = classifyFeedbackLocally(
    feedback.content,
    existingThemes.map((t) => t.name)
  );

  // AI2 AC4: resolve each returned theme name to a real Theme row, reusing
  // an existing one when it matches or creating a new one otherwise.
  const themeRecords = await Promise.all(
    themes.map((name) => findOrCreateTheme(workspaceId, name))
  );

  await prisma.feedback.update({
    where: { id: feedback.id },
    data: { sentiment, sentimentScore, featureArea },
  });

  await setFeedbackThemes(
    feedback.id,
    themeRecords.map((t) => ({ themeId: t.id, confidence: 1.0 }))
  );
}

async function embedAndStoreFeedback(feedback: Feedback): Promise<void> {
  if (!process.env.VOYAGE_API_KEY) return;
  const vector = await embedText(feedback.content, "document");
  await storeFeedbackEmbedding(feedback.id, vector);
}

/**
 * AI1 AC4: "A manual 're-classify' action exists for corrections." Runs
 * unconditionally (unlike the batch processor, which skips items that are
 * already classified) - re-classifying is meant to override, not to be a
 * no-op if something already exists.
 */
export async function reclassifyFeedback(
  workspaceId: string,
  feedbackId: string
): Promise<{ success: boolean; error?: string }> {
  const feedback = await prisma.feedback.findFirst({ where: { id: feedbackId, workspaceId } });
  if (!feedback) {
    return { success: false, error: "Feedback item not found." };
  }

  try {
    await classifyAndStoreFeedback(workspaceId, feedback);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Classification failed.",
    };
  }
}

/**
 * Best-effort classify+embed for exactly one just-created item, used by the
 * single-entry creation path (C3 AC1) where "on ingestion" (AI1 AC1) can
 * reasonably mean "synchronously, before responding" - one Claude call plus
 * one Voyage call is fast enough not to meaningfully delay a form
 * submission. Never throws: if AI processing fails, the feedback item has
 * still been created successfully and simply stays pending, to be picked
 * up by processPendingBatch or a manual re-classify - a failed
 * classification must never fail the underlying create.
 */
export async function processSingleFeedbackItem(
  workspaceId: string,
  feedback: Feedback
): Promise<void> {
  await Promise.allSettled([
    classifyAndStoreFeedback(workspaceId, feedback),
    embedAndStoreFeedback(feedback),
  ]);
}

async function findPendingFeedbackIds(workspaceId: string, limit: number): Promise<string[]> {
  const hasVoyage = Boolean(process.env.VOYAGE_API_KEY);
  if (hasVoyage) {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT f.id FROM feedback f
      LEFT JOIN embeddings e ON e."feedbackId" = f.id
      WHERE f."workspaceId" = ${workspaceId}
        AND (f.sentiment IS NULL OR e.id IS NULL)
      ORDER BY f."createdAt" ASC
      LIMIT ${limit}
    `;
    return rows.map((r) => r.id);
  }
  return findUnclassifiedFeedbackIds(workspaceId, limit);
}

export async function countPendingFeedback(workspaceId: string): Promise<number> {
  const hasVoyage = Boolean(process.env.VOYAGE_API_KEY);
  if (hasVoyage) {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint as count FROM feedback f
      LEFT JOIN embeddings e ON e."feedbackId" = f.id
      WHERE f."workspaceId" = ${workspaceId} AND (f.sentiment IS NULL OR e.id IS NULL)
    `;
    return Number(rows[0]?.count ?? 0);
  }
  return prisma.feedback.count({
    where: { workspaceId, sentiment: null },
  });
}

export interface ProcessPendingResult {
  processed: number;
  failed: number;
  remaining: number;
}

const CONCURRENCY = 3;

/**
 * Processes the oldest still-pending items (queued for AI classification,
 * per C3 AC4 - and, alongside it, embedding for AI3). "Pending" covers both
 * newly-ingested items and the seed data itself (Section 10, Day 12:
 * "back-fill classification across seeded data"), since both are simply
 * rows where sentiment is still null - there's no separate code path for
 * "old" vs "new" unclassified feedback.
 *
 * Runs in small concurrent chunks rather than one-at-a-time (slow) or all
 * at once (risks tripping API rate limits and, in a serverless deployment,
 * the function's execution time limit on a large backfill) - the caller is
 * expected to call this repeatedly until `remaining` reaches 0, which is
 * the batch-polling pattern used throughout this app for bulk work in the
 * absence of a dedicated job queue (Section 05 doesn't specify one).
 */
export async function processPendingBatch(
  workspaceId: string,
  batchSize: number = 10
): Promise<ProcessPendingResult> {
  const ids = await findPendingFeedbackIds(workspaceId, batchSize);
  if (ids.length === 0) {
    return { processed: 0, failed: 0, remaining: 0 };
  }

  const items = await prisma.feedback.findMany({ where: { id: { in: ids }, workspaceId } });

  let processed = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const chunk = items.slice(i, i + CONCURRENCY);

    const results = await Promise.allSettled(
      chunk.map(async (item) => {
        const needsClassification = item.sentiment === null;
        const needsEmbedding =
          Boolean(process.env.VOYAGE_API_KEY) &&
          (await prisma.embedding.count({ where: { feedbackId: item.id } })) === 0;

        await Promise.all([
          needsClassification ? classifyAndStoreFeedback(workspaceId, item) : Promise.resolve(),
          needsEmbedding ? embedAndStoreFeedback(item) : Promise.resolve(),
        ]);
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") processed++;
      else failed++;
    }
  }

  const remaining = await countPendingFeedback(workspaceId);
  return { processed, failed, remaining };
}

async function findUnclassifiedFeedbackIds(workspaceId: string, limit: number): Promise<string[]> {
  const rows = await prisma.feedback.findMany({
    where: { workspaceId, sentiment: null },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  return rows.map((r) => r.id);
}

/**
 * Sentiment/theme-only backfill (no embedding). This is what actually
 * guarantees the Dashboard has real data, called from
 * dashboard.service.ts on every load and from the bulk-ingestion routes
 * right after insert.
 *
 * It's kept separate from processPendingBatch (which is embedding-aware
 * and driven by the Inbox's "Run AI processing" banner) for one important
 * reason: processPendingBatch's "pending" definition is `sentiment IS NULL
 * OR embedding IS NULL`, so if VOYAGE_API_KEY isn't set, embedding always
 * fails and every item looks "pending" forever - fine for a manual banner,
 * but wrong for something that runs automatically on every dashboard
 * load, since it would never converge and would waste a request-per-item
 * loop each time. Classification itself (classifyFeedbackLocally) has no
 * external dependency and no API key requirement, so this loop only looks
 * at `sentiment IS NULL` and reliably finishes.
 */
export async function classifyAllPendingFeedback(
  workspaceId: string,
  batchSize: number = 25
): Promise<{ classified: number; failed: number }> {
  let classified = 0;
  let failed = 0;

  // Bounded rather than "while(true)": up to 40 * 25 = 1000 items per
  // call, which comfortably covers this app's demo/seed-sized workspaces,
  // while guaranteeing this can never loop forever if something about a
  // specific item is persistently failing to classify.
  for (let i = 0; i < 40; i++) {
    const ids = await findUnclassifiedFeedbackIds(workspaceId, batchSize);
    if (ids.length === 0) break;

    const items = await prisma.feedback.findMany({ where: { id: { in: ids }, workspaceId } });
    const results = await Promise.allSettled(
      items.map((item) => classifyAndStoreFeedback(workspaceId, item))
    );

    for (const result of results) {
      if (result.status === "fulfilled") classified++;
      else failed++;
    }

    // A pass where nothing succeeded means something is wrong with these
    // specific items (not just "there's more to do") - stop instead of
    // retrying the same failures for the remaining 39 iterations.
    if (results.every((r) => r.status === "rejected")) break;
  }

  return { classified, failed };
}

/**
 * AI3: the full retrieve-then-answer pipeline (Section 9.2 / Figure 4),
 * now done entirely locally (lib/local-qa.ts) - no ANTHROPIC_API_KEY, no
 * VOYAGE_API_KEY, no network call. Retrieval matches the question against
 * feedback content/themes (and, where the question implies it, sentiment);
 * the answer is composed from real counts, theme names, and a verbatim
 * excerpt or two - never invented, never a hardcoded response.
 */
export async function askLoop(
  workspaceId: string,
  question: string
): Promise<{ response: AskResponse; citedFeedback: Feedback[] }> {
  const { answer, citedIndexes, hasSufficientContext, orderedItems } = await answerQuestionLocally(
    workspaceId,
    question
  );

  const citedFeedback = citedIndexes
    .map((i) => orderedItems[i])
    .filter((i): i is Feedback => Boolean(i));

  return {
    response: { answer, citedIndexes, hasSufficientContext },
    citedFeedback,
  };
}
