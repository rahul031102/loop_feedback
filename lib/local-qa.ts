import { Prisma, Sentiment, type Feedback } from "@prisma/client";
import { prisma } from "@/lib/db";
import { THEME_RULES, countMatches } from "@/lib/local-classifier";

/**
 * Local, dependency-free replacement for the Ask LOOP pipeline that used to
 * live in lib/services/search.service.ts (Voyage embeddings) + lib/ai.ts's
 * `answerFromFeedback` (Anthropic Claude). Same job - AI3's "retrieve the
 * most relevant feedback, then answer strictly from it" - done with
 * keyword/rule-based retrieval and a template-composed answer instead of a
 * hosted model. No network call, no API key, nothing invented: every
 * number and quote in the answer comes directly from what was retrieved
 * from the database for this workspace.
 *
 * This intentionally does not touch search.service.ts or its Voyage-based
 * embeddings - those simply go unused by Ask LOOP now.
 */

// ---------------------------------------------------------------------------
// Question understanding
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "is",
  "are",
  "am",
  "was",
  "were",
  "be",
  "been",
  "being",
  "what",
  "whats",
  "which",
  "who",
  "whom",
  "whose",
  "when",
  "where",
  "why",
  "how",
  "do",
  "does",
  "did",
  "doing",
  "done",
  "should",
  "would",
  "could",
  "can",
  "will",
  "shall",
  "may",
  "might",
  "must",
  "we",
  "us",
  "our",
  "ours",
  "you",
  "your",
  "yours",
  "i",
  "me",
  "my",
  "mine",
  "they",
  "them",
  "their",
  "theirs",
  "he",
  "him",
  "his",
  "she",
  "her",
  "hers",
  "it",
  "its",
  "this",
  "that",
  "these",
  "those",
  "and",
  "or",
  "but",
  "if",
  "then",
  "than",
  "so",
  "because",
  "as",
  "of",
  "in",
  "on",
  "at",
  "to",
  "for",
  "with",
  "about",
  "regarding",
  "related",
  "from",
  "by",
  "saying",
  "say",
  "says",
  "said",
  "ask",
  "asking",
  "asked",
  "feedback",
  "users",
  "user",
  "customers",
  "customer",
  "people",
  "person",
  "main",
  "most",
  "more",
  "very",
  "really",
  "just",
  "actually",
  "kind",
  "sort",
  "type",
  "things",
  "thing",
  "stuff",
  "overall",
  "currently",
  "recently",
  "lately",
  "there",
  "here",
  "not",
  "no",
  "yes",
  "any",
  "some",
  "all",
  "every",
  "up",
  "down",
  "out",
  "over",
  "under",
  "again",
  "further",
  "once",
]);

const NEGATIVE_STEMS = [
  "complain",
  "problem",
  "issue",
  "wrong",
  "frustrat",
  "negative",
  "dislike",
  "hate",
  "bad",
  "worst",
  "improve",
  "fix",
  "broken",
  "struggl",
  "difficult",
  "hard",
  "annoy",
  "pain",
  "concern",
  "unhapp",
  "upset",
  "angry",
  "poor",
  "critic",
];

const POSITIVE_STEMS = [
  "like",
  "love",
  "positive",
  "prais",
  "good",
  "best",
  "great",
  "appreciat",
  "enjoy",
  "favorite",
  "favourit",
  "happy",
  "satisf",
  "impress",
  "glad",
  "delight",
];

const FREQUENCY_STEMS = [
  "mention",
  "often",
  "common",
  "frequent",
  "recurring",
  "top issue",
  "top complaint",
  "most requested",
];

const SENTIMENT_OVERVIEW_STEMS = [
  "sentiment",
  "how do customers feel",
  "how are customers feeling",
  "overall feeling",
  "how happy",
];

interface QuestionIntents {
  negative: boolean;
  positive: boolean;
  frequency: boolean;
  sentimentOverview: boolean;
}

function detectIntents(questionLower: string): QuestionIntents {
  const hasStem = (stems: string[]) => stems.some((stem) => questionLower.includes(stem));
  const negative = hasStem(NEGATIVE_STEMS);
  return {
    negative,
    // If a question somehow trips both lists, treat it as a negative/complaint
    // question - "what should we improve" is a more actionable read than "positive".
    positive: !negative && hasStem(POSITIVE_STEMS),
    frequency: hasStem(FREQUENCY_STEMS),
    sentimentOverview: hasStem(SENTIMENT_OVERVIEW_STEMS),
  };
}

const ALL_INTENT_STEMS = [
  ...NEGATIVE_STEMS,
  ...POSITIVE_STEMS,
  ...FREQUENCY_STEMS,
  ...SENTIMENT_OVERVIEW_STEMS,
];

/** Words left over after stripping stopwords and intent-signal words - what the question is actually *about*. */
function extractTopicKeywords(questionLower: string): string[] {
  const cleaned = questionLower.replace(/[^a-z0-9\s]/g, " ");
  const tokens = cleaned.split(/\s+/).filter(Boolean);

  const keywords: string[] = [];
  for (const token of tokens) {
    if (token.length < 3) continue;
    if (STOPWORDS.has(token)) continue;
    if (ALL_INTENT_STEMS.some((stem) => token.startsWith(stem))) continue;
    keywords.push(token);
  }
  return [...new Set(keywords)];
}

interface TopicMatch {
  themeIds: string[];
  themeNames: string[];
}

/**
 * Resolves a question to real Theme rows in this workspace, two ways:
 * an existing theme's own name appearing in the question, or a THEME_RULES
 * keyword appearing in the question (resolved to whatever real Theme row
 * that rule's canonical name maps to, if any exists yet).
 */
async function resolveTopicThemes(workspaceId: string, questionLower: string): Promise<TopicMatch> {
  const themes = await prisma.theme.findMany({
    where: { workspaceId },
    select: { id: true, name: true },
  });

  const matched = new Map<string, string>();

  for (const theme of themes) {
    if (theme.name.length >= 3 && questionLower.includes(theme.name.toLowerCase())) {
      matched.set(theme.id, theme.name);
    }
  }

  for (const rule of THEME_RULES) {
    const ruleHit = rule.keywords.some((keyword) => countMatches(questionLower, keyword) > 0);
    if (!ruleHit) continue;
    const existing = themes.find((t) => t.name.toLowerCase() === rule.name.toLowerCase());
    if (existing) matched.set(existing.id, existing.name);
  }

  return { themeIds: [...matched.keys()], themeNames: [...matched.values()] };
}

// ---------------------------------------------------------------------------
// Retrieval + answer composition
// ---------------------------------------------------------------------------

type FeedbackWithThemes = Feedback & {
  feedbackThemes: { themeId: string; theme: { id: string; name: string; color: string } }[];
};

const MAX_CANDIDATES = 300;
const MAX_CITED = 8;

export interface LocalAskOutcome {
  answer: string;
  citedIndexes: number[];
  hasSufficientContext: boolean;
  /** Items referenced by citedIndexes, in the same order. */
  orderedItems: Feedback[];
}

function excerpt(text: string, max = 160): string {
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

/**
 * AI3, done locally: understand the question well enough to filter to
 * relevant feedback (by theme/keyword and, where implied, by sentiment),
 * then compose an answer strictly from what was actually retrieved -
 * counts, theme names, and a verbatim excerpt or two, never anything
 * invented. Mirrors the shape the Claude-backed version used to return
 * (`AskResponse`-compatible: answer / citedIndexes / hasSufficientContext)
 * so callers (lib/services/ai-processing.service.ts's `askLoop`) barely
 * had to change.
 */
export async function answerQuestionLocally(
  workspaceId: string,
  question: string
): Promise<LocalAskOutcome> {
  const questionLower = question.toLowerCase();
  const intents = detectIntents(questionLower);
  const topicKeywords = extractTopicKeywords(questionLower);
  const { themeIds, themeNames } = await resolveTopicThemes(workspaceId, questionLower);
  const hasTopic = themeIds.length > 0 || topicKeywords.length > 0;

  let sentimentFilter: Sentiment | null = null;
  if (intents.negative) sentimentFilter = Sentiment.NEGATIVE;
  else if (intents.positive) sentimentFilter = Sentiment.POSITIVE;

  const orConditions: Prisma.FeedbackWhereInput[] = [];
  if (themeIds.length > 0) {
    orConditions.push({ feedbackThemes: { some: { themeId: { in: themeIds } } } });
  }
  for (const keyword of topicKeywords) {
    orConditions.push({ content: { contains: keyword, mode: "insensitive" } });
  }

  const include = { feedbackThemes: { include: { theme: true } } };

  let candidates: FeedbackWithThemes[] = await prisma.feedback.findMany({
    where: {
      workspaceId,
      ...(sentimentFilter ? { sentiment: sentimentFilter } : {}),
      ...(orConditions.length > 0 ? { OR: orConditions } : {}),
    },
    include,
    orderBy: { createdAt: "desc" },
    take: MAX_CANDIDATES,
  });

  // A sentiment-scoped topic search that comes back empty doesn't
  // necessarily mean there's no feedback on the topic - relax the
  // sentiment filter so we can still say something useful.
  let relaxedSentiment = false;
  if (candidates.length === 0 && sentimentFilter && hasTopic) {
    candidates = await prisma.feedback.findMany({
      where: { workspaceId, ...(orConditions.length > 0 ? { OR: orConditions } : {}) },
      include,
      orderBy: { createdAt: "desc" },
      take: MAX_CANDIDATES,
    });
    relaxedSentiment = candidates.length > 0;
  }

  // A fully generic question ("how is sentiment", "main complaints") has no
  // topic to filter by - fall back to the workspace's overall feedback
  // (still respecting any sentiment filter) so there's something to summarize.
  if (candidates.length === 0 && !hasTopic) {
    candidates = await prisma.feedback.findMany({
      where: { workspaceId, ...(sentimentFilter ? { sentiment: sentimentFilter } : {}) },
      include,
      orderBy: { createdAt: "desc" },
      take: MAX_CANDIDATES,
    });
  }

  if (candidates.length === 0) {
    return {
      answer: hasTopic
        ? `There's no feedback in this workspace yet that matches that${
            sentimentFilter ? ` (looking for ${sentimentFilter.toLowerCase()} feedback)` : ""
          }. Try a different question, or add more feedback first.`
        : "There's no feedback in this workspace yet that relates to this question. Try asking something else, or add more feedback first.",
      citedIndexes: [],
      hasSufficientContext: false,
      orderedItems: [],
    };
  }

  // Rank by relevance: keyword hits in the content, a bonus for a direct
  // theme match, and a small recency tiebreaker (candidates already come
  // back newest-first from the query above).
  const scored = candidates.map((item, idx) => {
    const contentLower = item.content.toLowerCase();
    let score = 0;
    for (const keyword of topicKeywords) score += countMatches(contentLower, keyword);
    if (themeIds.length > 0 && item.feedbackThemes.some((ft) => themeIds.includes(ft.themeId))) {
      score += 2;
    }
    score += Math.max(0, 50 - idx) * 0.001;
    return { item, score };
  });
  scored.sort((a, b) => b.score - a.score);

  const orderedItems: FeedbackWithThemes[] = scored.map((s) => s.item);
  const topItems = orderedItems.slice(0, MAX_CITED);

  // --- Aggregate stats over every candidate (not just the cited subset) ---
  const sentimentCounts = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0, unclassified: 0 };
  for (const item of candidates) {
    if (item.sentiment === Sentiment.POSITIVE) sentimentCounts.POSITIVE++;
    else if (item.sentiment === Sentiment.NEUTRAL) sentimentCounts.NEUTRAL++;
    else if (item.sentiment === Sentiment.NEGATIVE) sentimentCounts.NEGATIVE++;
    else sentimentCounts.unclassified++;
  }

  const themeTally = new Map<string, number>();
  for (const item of candidates) {
    for (const ft of item.feedbackThemes) {
      themeTally.set(ft.theme.name, (themeTally.get(ft.theme.name) ?? 0) + 1);
    }
  }
  const topThemesRanked = [...themeTally.entries()].sort((a, b) => b[1] - a[1]);

  const total = candidates.length;
  const topicLabel = themeNames[0] ?? topicKeywords[0] ?? null;

  const parts: string[] = [];

  if (intents.sentimentOverview) {
    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
    parts.push(
      `Across ${total} piece${total === 1 ? "" : "s"} of feedback${topicLabel ? ` about ${topicLabel}` : ""}, ` +
        `${pct(sentimentCounts.POSITIVE)}% is positive, ${pct(sentimentCounts.NEUTRAL)}% neutral, and ${pct(
          sentimentCounts.NEGATIVE
        )}% negative` +
        `${sentimentCounts.unclassified > 0 ? ` (${sentimentCounts.unclassified} not yet classified)` : ""}.`
    );
    const topTheme = topThemesRanked[0];
    if (topTheme) {
      parts.push(
        `The most discussed theme is ${topTheme[0]}, mentioned in ${topTheme[1]} item${topTheme[1] === 1 ? "" : "s"}.`
      );
    }
  } else if (intents.negative) {
    parts.push(
      `Found ${total} negative feedback item${total === 1 ? "" : "s"}${topicLabel ? ` about ${topicLabel}` : ""}` +
        `${relaxedSentiment ? " (no exact match on sentiment, showing related feedback instead)" : ""}.`
    );
    if (topThemesRanked.length > 0) {
      const top3 = topThemesRanked
        .slice(0, 3)
        .map(([name, count]) => `${name} (${count})`)
        .join(", ");
      parts.push(`Most frequently mentioned: ${top3}.`);
    }
    const example = topItems[0];
    if (example) parts.push(`For example: "${excerpt(example.content)}"`);
  } else if (intents.positive) {
    parts.push(
      `Found ${total} positive feedback item${total === 1 ? "" : "s"}${topicLabel ? ` about ${topicLabel}` : ""}.`
    );
    if (topThemesRanked.length > 0) {
      const top3 = topThemesRanked
        .slice(0, 3)
        .map(([name, count]) => `${name} (${count})`)
        .join(", ");
      parts.push(`Customers most often praise: ${top3}.`);
    }
    const example = topItems[0];
    if (example) parts.push(`For example: "${excerpt(example.content)}"`);
  } else if (topicLabel) {
    parts.push(
      `Found ${total} feedback item${total === 1 ? "" : "s"} about ${topicLabel}: ${sentimentCounts.POSITIVE} positive, ` +
        `${sentimentCounts.NEUTRAL} neutral, ${sentimentCounts.NEGATIVE} negative` +
        `${sentimentCounts.unclassified > 0 ? `, ${sentimentCounts.unclassified} unclassified` : ""}.`
    );
    const example = topItems[0];
    if (example) parts.push(`For example: "${excerpt(example.content)}"`);
  } else {
    parts.push(
      `Found ${total} feedback item${total === 1 ? "" : "s"}: ${sentimentCounts.POSITIVE} positive, ` +
        `${sentimentCounts.NEUTRAL} neutral, ${sentimentCounts.NEGATIVE} negative` +
        `${sentimentCounts.unclassified > 0 ? `, ${sentimentCounts.unclassified} unclassified` : ""}.`
    );
    if (topThemesRanked.length > 0) {
      const top3 = topThemesRanked
        .slice(0, 3)
        .map(([name, count]) => `${name} (${count})`)
        .join(", ");
      parts.push(`Most common themes: ${top3}.`);
    }
  }

  if (intents.frequency && topThemesRanked.length > 0) {
    const ranked = topThemesRanked
      .slice(0, 5)
      .map(([name, count], i) => `${i + 1}. ${name} — ${count}`)
      .join("; ");
    parts.push(`Ranked by frequency: ${ranked}.`);
  }

  return {
    answer: parts.join(" "),
    citedIndexes: topItems.map((_, i) => i),
    hasSufficientContext: true,
    orderedItems: topItems,
  };
}
