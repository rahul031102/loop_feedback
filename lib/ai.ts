import Anthropic from "@anthropic-ai/sdk";
import {
  classificationResponseSchema,
  askResponseSchema,
  type ClassificationResponse,
  type AskResponse,
} from "@/lib/validations/ai";
import {
  vocNarrativeResponseSchema,
  type VoCNarrativeResponse,
  type PeriodStats,
} from "@/lib/validations/reports";

// Section 05: "AI - Anthropic Claude API (claude-sonnet-4-6) - Classification,
// summarisation, and Q&A." Used verbatim per the brief. If your account's
// available models differ, this is the one line to change.
const MODEL = "claude-sonnet-4-6";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Copy .env.example to .env.local and add your key."
    );
  }
  if (!client) {
    client = new Anthropic({ apiKey });
  }
  return client;
}

function extractTextContent(message: Anthropic.Message): string {
  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content.");
  }
  return textBlock.text;
}

/**
 * Section 9.1: "Strip any stray markdown fences, parse, validate." Claude
 * is instructed not to wrap output in fences, but models do this often
 * enough in practice that handling it defensively is worth the few lines.
 */
function stripMarkdownFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

export type ClassifyResult =
  | { success: true; data: ClassificationResponse }
  | { success: false; error: string };

/**
 * AI1: structured classification. Section 9.1's exact recommended pattern -
 * send the content plus existing theme names (so Claude reuses them rather
 * than inventing near-duplicates every time), ask for JSON only, validate
 * with Zod, retry once on a parse/validation failure, then give up and let
 * the caller leave the item flagged for manual review (AC4) rather than
 * save anything unvalidated (AC2).
 */
export async function classifyFeedback(
  content: string,
  existingThemeNames: string[]
): Promise<ClassifyResult> {
  const prompt = buildClassificationPrompt(content, existingThemeNames);

  let lastError = "Unknown error";

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const message = await getClient().messages.create({
        model: MODEL,
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      });

      const raw = extractTextContent(message);
      const cleaned = stripMarkdownFences(raw);
      const parsed = JSON.parse(cleaned);
      const validated = classificationResponseSchema.parse(parsed);

      return { success: true, data: validated };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Classification failed";
      // Loop again for attempt 2; otherwise fall through and report failure.
    }
  }

  return { success: false, error: lastError };
}

function buildClassificationPrompt(content: string, existingThemeNames: string[]): string {
  const themesList =
    existingThemeNames.length > 0
      ? existingThemeNames.map((t) => `- ${t}`).join("\n")
      : "(none yet - propose sensible ones)";

  return `You are classifying a single piece of customer feedback for a product team.

Feedback:
"""
${content}
"""

Existing themes in this workspace (reuse one of these if it genuinely fits, rather than creating a near-duplicate):
${themesList}

Return ONLY a JSON object (no markdown fences, no commentary before or after) with exactly these fields:
{
  "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE",
  "sentimentScore": <number from -1 (very negative) to 1 (very positive)>,
  "themes": [<1 to 2 short theme names - prefer an existing theme above when it fits, otherwise propose one new concise 2-4 word theme name>],
  "featureArea": "<a short 2-4 word label for the specific product area this is about>",
  "rationale": "<one sentence explaining the classification>"
}`;
}

export type AskResult = { success: true; data: AskResponse } | { success: false; error: string };

export interface RetrievedItem {
  index: number;
  id: string;
  content: string;
  channel: string;
  customerLabel: string | null;
}

/**
 * AI3: retrieval-grounded Q&A. The caller has already done the retrieval
 * (lib/services/search.service.ts) - this function's only job is to answer
 * strictly from the items it's given (AC4: "must not invent feedback that
 * is not in the data"). Items are numbered so Claude can cite by index
 * rather than by free-text reference, which the app then resolves back to
 * real feedback records (AC3).
 */
export async function answerFromFeedback(
  question: string,
  items: RetrievedItem[]
): Promise<AskResult> {
  if (items.length === 0) {
    return {
      success: true,
      data: {
        answer:
          "There's no feedback in this workspace yet that relates to this question. Try asking something else, or add more feedback first.",
        citedIndexes: [],
        hasSufficientContext: false,
      },
    };
  }

  const prompt = buildAskPrompt(question, items);

  try {
    const message = await getClient().messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = extractTextContent(message);
    const cleaned = stripMarkdownFences(raw);
    const parsed = JSON.parse(cleaned);
    const validated = askResponseSchema.parse(parsed);

    // Defensive clamp: never let a cited index point outside what was
    // actually retrieved, regardless of what the model returns.
    const validIndexes = new Set(items.map((i) => i.index));
    validated.citedIndexes = validated.citedIndexes.filter((i) => validIndexes.has(i));

    return { success: true, data: validated };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate an answer",
    };
  }
}

function buildAskPrompt(question: string, items: RetrievedItem[]): string {
  const context = items
    .map(
      (item) =>
        `[${item.index}] (${item.channel}${item.customerLabel ? `, ${item.customerLabel}` : ""}): "${item.content}"`
    )
    .join("\n");

  return `You are answering a question about customer feedback for a product team, using ONLY the feedback excerpts provided below. Do not use any outside knowledge or invent feedback that isn't listed.

Question: "${question}"

Retrieved feedback (numbered):
${context}

Instructions:
- Answer only from the excerpts above. If they don't actually address the question, say so plainly rather than guessing.
- Cite which excerpts (by number) your answer draws on.
- Be concise and specific - reference what customers actually said, not vague generalities.

Return ONLY a JSON object (no markdown fences, no commentary) with exactly these fields:
{
  "answer": "<your answer, 2-5 sentences>",
  "citedIndexes": [<the numbers of the excerpts your answer actually draws on>],
  "hasSufficientContext": <true if the excerpts genuinely let you answer the question, false if they don't really address it>
}`;
}

export type VoCNarrativeResult =
  | { success: true; data: VoCNarrativeResponse }
  | { success: false; error: string };

/**
 * AI4: writes the prose narrative and recommended actions around
 * already-computed period stats (report.service.ts). Section 9.3:
 * "Pre-compute the period's stats... in code, then ask Claude to write the
 * narrative around those numbers. This keeps the report accurate and
 * cheap, and stops the model from hallucinating figures." Every number in
 * the prompt below is one this app already computed and trusts; Claude is
 * never asked to produce or verify a number, only to interpret ones it's
 * given.
 */
export async function generateVoCNarrative(stats: PeriodStats): Promise<VoCNarrativeResult> {
  const prompt = buildVoCPrompt(stats);

  try {
    const message = await getClient().messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = extractTextContent(message);
    const cleaned = stripMarkdownFences(raw);
    const parsed = JSON.parse(cleaned);
    const validated = vocNarrativeResponseSchema.parse(parsed);

    return { success: true, data: validated };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Report narrative generation failed",
    };
  }
}

function buildVoCPrompt(stats: PeriodStats): string {
  const { sentimentBreakdown, previousSentimentBreakdown, topThemes, representativeQuotes } = stats;

  const themesList = topThemes
    .map((t) => {
      const delta = t.previousCount > 0 ? t.count - t.previousCount : null;
      const trend =
        delta === null
          ? t.previousCount === 0 && t.count > 0
            ? "(new this period)"
            : ""
          : delta > 0
            ? `(up from ${t.previousCount})`
            : delta < 0
              ? `(down from ${t.previousCount})`
              : "(unchanged)";
      return `- ${t.name}: ${t.count} items ${trend}`;
    })
    .join("\n");

  const quotesList = representativeQuotes
    .map(
      (q) => `- "${q.content}" (${q.channel}${q.sentiment ? `, ${q.sentiment.toLowerCase()}` : ""})`
    )
    .join("\n");

  return `You are writing the narrative section of a Voice-of-Customer report for a product team's leadership. Every number below has already been computed and verified - use them exactly as given. Do not invent, estimate, or restate them differently. Your job is only to interpret them in prose and suggest actions.

Volume: ${stats.totalItems} items this period (${stats.previousPeriodTotalItems} in the prior period of equal length).

Sentiment this period: ${sentimentBreakdown.positive} positive, ${sentimentBreakdown.neutral} neutral, ${sentimentBreakdown.negative} negative, ${sentimentBreakdown.unclassified} unclassified.
Sentiment prior period: ${previousSentimentBreakdown.positive} positive, ${previousSentimentBreakdown.neutral} neutral, ${previousSentimentBreakdown.negative} negative, ${previousSentimentBreakdown.unclassified} unclassified.

Top themes this period:
${themesList || "(none)"}

Representative verbatim quotes:
${quotesList || "(none)"}

Write a narrative a Head of Product could forward to leadership without editing - direct, specific, grounded in the numbers and quotes above, no generic filler. Return ONLY a JSON object (no markdown fences, no commentary) with exactly these fields:
{
  "narrative": "<2-4 short paragraphs summarizing what happened this period - lead with the most important shift, reference specific themes and the sentiment change, avoid restating every number in prose form>",
  "recommendedActions": [<1 to 6 short, specific, actionable recommendations grounded in what the data above actually shows - not generic advice>]
}`;
}
