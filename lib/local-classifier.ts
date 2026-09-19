import { Sentiment } from "@prisma/client";
import type { ClassificationResponse } from "@/lib/validations/ai";

/**
 * Local, dependency-free replacement for lib/ai.ts's `classifyFeedback`.
 *
 * AI1/AI2 only require that every feedback item ends up with a sentiment,
 * a sentiment score, 1-2 themes, and a feature area - they don't require
 * those to come from a hosted LLM. This module produces the exact same
 * shape (`ClassificationResponse`, validated by the existing
 * `classificationResponseSchema`) using a keyword/rule-based approach that
 * runs synchronously, in-process, with no network call and no API key.
 *
 * Ask LOOP (AI3, lib/local-qa.ts) and the VoC report narrative (AI4,
 * lib/local-report.ts) are local for the same reason and reuse
 * `THEME_RULES`/`countMatches` from this file. Nothing in this app calls
 * lib/ai.ts (Anthropic) anymore.
 */

// ---------------------------------------------------------------------------
// Sentiment lexicon
// ---------------------------------------------------------------------------

// Multi-word phrases are checked before single words so common negations
// and qualifiers ("not working", "no issues") are scored as the phrase
// they actually are, rather than via their (misleading) component words.
const POSITIVE_PHRASES: Array<[string, number]> = [
  ["no issues", 1.2],
  ["no problems", 1.2],
  ["not bad", 0.6],
  ["works great", 1.4],
  ["works well", 1.2],
  ["easy to use", 1.2],
  ["love it", 1.4],
  ["highly recommend", 1.4],
  ["well done", 1.0],
  ["thank you", 0.8],
];

const NEGATIVE_PHRASES: Array<[string, number]> = [
  ["not working", 1.4],
  ["not working properly", 1.4],
  ["doesn't work", 1.4],
  ["does not work", 1.4],
  ["can't find", 1.0],
  ["cannot find", 1.0],
  ["hard to use", 1.2],
  ["difficult to use", 1.2],
  ["waste of time", 1.4],
  ["waste of money", 1.4],
  ["not happy", 1.2],
  ["not impressed", 1.1],
  ["keeps crashing", 1.4],
  ["too expensive", 1.2],
  ["no longer works", 1.3],
];

const POSITIVE_WORDS: Array<[string, number]> = [
  ["love", 1.3],
  ["loved", 1.3],
  ["loving", 1.2],
  ["great", 1.1],
  ["awesome", 1.3],
  ["excellent", 1.3],
  ["amazing", 1.3],
  ["fantastic", 1.3],
  ["wonderful", 1.2],
  ["perfect", 1.2],
  ["best", 1.1],
  ["happy", 1.0],
  ["pleased", 1.0],
  ["satisfied", 1.0],
  ["impressed", 1.1],
  ["intuitive", 1.0],
  ["smooth", 0.9],
  ["seamless", 1.0],
  ["fast", 0.8],
  ["reliable", 0.9],
  ["helpful", 0.9],
  ["easy", 0.8],
  ["nice", 0.7],
  ["good", 0.7],
  ["solid", 0.7],
  ["delight", 1.0],
  ["delighted", 1.1],
  ["enjoy", 0.9],
  ["enjoying", 0.9],
  ["favorite", 1.0],
  ["recommend", 1.0],
  ["appreciate", 0.9],
  ["kudos", 1.0],
  ["improved", 0.8],
  ["better", 0.6],
];

const NEGATIVE_WORDS: Array<[string, number]> = [
  ["hate", 1.4],
  ["terrible", 1.4],
  ["awful", 1.4],
  ["horrible", 1.4],
  ["worst", 1.4],
  ["broken", 1.2],
  ["bug", 1.0],
  ["buggy", 1.1],
  ["crash", 1.2],
  ["crashes", 1.2],
  ["crashed", 1.2],
  ["crashing", 1.2],
  ["slow", 0.9],
  ["laggy", 1.0],
  ["lag", 0.8],
  ["frustrating", 1.2],
  ["frustrated", 1.2],
  ["annoying", 1.1],
  ["confusing", 1.0],
  ["difficult", 0.8],
  ["disappointed", 1.2],
  ["disappointing", 1.2],
  ["issue", 0.7],
  ["issues", 0.7],
  ["problem", 0.8],
  ["problems", 0.8],
  ["error", 0.8],
  ["errors", 0.8],
  ["fails", 1.0],
  ["failed", 1.0],
  ["failure", 1.0],
  ["poor", 1.0],
  ["unusable", 1.3],
  ["missing", 0.7],
  ["lacking", 0.8],
  ["expensive", 0.9],
  ["overpriced", 1.1],
  ["downtime", 1.0],
  ["outage", 1.1],
  ["unreliable", 1.2],
  ["useless", 1.3],
  ["stuck", 0.8],
  ["blocked", 0.8],
  ["delay", 0.7],
  ["delayed", 0.7],
  ["regression", 0.9],
  ["angry", 1.1],
  ["upset", 1.0],
  ["worse", 1.0],
  ["regressed", 0.9],
];

/** Escapes a literal string for safe use inside a RegExp. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Exported so other local (non-AI-API) features - namely Ask LOOP's
 * retrieval (lib/local-qa.ts) - can reuse the exact same word/phrase
 * matching rules as classification, instead of maintaining a second,
 * possibly-inconsistent copy of "does this text mention X."
 */
export function countMatches(haystack: string, needle: string): number {
  // Word-boundary match for single tokens; phrases (already containing a
  // space) match on their literal sequence, which is boundary enough.
  const pattern = needle.includes(" ")
    ? escapeRegExp(needle)
    : `\\b${escapeRegExp(needle)}\\w*`; // \w* so "crash" also catches "crashes"/"crashing"
  const re = new RegExp(pattern, "gi");
  const matches = haystack.match(re);
  return matches ? matches.length : 0;
}

interface SentimentResult {
  sentiment: Sentiment;
  score: number;
  signalCount: number;
}

function scoreSentiment(content: string): SentimentResult {
  const text = content.toLowerCase();

  let positiveScore = 0;
  let negativeScore = 0;
  let signalCount = 0;

  for (const [phrase, weight] of POSITIVE_PHRASES) {
    const hits = countMatches(text, phrase);
    if (hits > 0) {
      positiveScore += hits * weight;
      signalCount += hits;
    }
  }
  for (const [phrase, weight] of NEGATIVE_PHRASES) {
    const hits = countMatches(text, phrase);
    if (hits > 0) {
      negativeScore += hits * weight;
      signalCount += hits;
    }
  }
  for (const [word, weight] of POSITIVE_WORDS) {
    const hits = countMatches(text, word);
    if (hits > 0) {
      positiveScore += hits * weight;
      signalCount += hits;
    }
  }
  for (const [word, weight] of NEGATIVE_WORDS) {
    const hits = countMatches(text, word);
    if (hits > 0) {
      negativeScore += hits * weight;
      signalCount += hits;
    }
  }

  const total = positiveScore + negativeScore;
  if (total === 0) {
    return { sentiment: Sentiment.NEUTRAL, score: 0, signalCount: 0 };
  }

  // Normalized to [-1, 1]: how lopsided the signal is, not just its volume.
  const raw = (positiveScore - negativeScore) / total;
  const score = Math.max(-1, Math.min(1, Number(raw.toFixed(2))));

  let sentiment: Sentiment = Sentiment.NEUTRAL;
  if (score >= 0.2) sentiment = Sentiment.POSITIVE;
  else if (score <= -0.2) sentiment = Sentiment.NEGATIVE;

  return { sentiment, score, signalCount };
}

// ---------------------------------------------------------------------------
// Theme extraction
// ---------------------------------------------------------------------------

export interface ThemeRule {
  name: string;
  keywords: string[];
}

/**
 * Exported alongside `countMatches` for the same reason - Ask LOOP's local
 * retrieval (lib/local-qa.ts) matches a question against these same theme
 * keyword lists to figure out what topic someone's asking about, rather
 * than duplicating this list.
 */
export const THEME_RULES: ThemeRule[] = [
  { name: "Performance & Speed", keywords: ["slow", "speed", "performance", "lag", "laggy", "loading", "load time", "responsive", "snappy", "fast", "quick", "faster"] },
  { name: "Bugs & Stability", keywords: ["bug", "crash", "crashes", "crashed", "crashing", "broken", "glitch", "freeze", "freezes", "unstable", "exception", "error"] },
  { name: "UI & Usability", keywords: ["interface", "layout", "navigation", "confusing", "intuitive", "sidebar", "dark mode", "hard to find", "redesign", "ui", "ux", "usability"] },
  { name: "Pricing & Billing", keywords: ["price", "pricing", "expensive", "cost", "billing", "invoice", "subscription", "plan", "overpriced", "discount", "refund"] },
  { name: "Onboarding", keywords: ["onboarding", "setup", "getting started", "sign up", "signup", "tutorial", "welcome", "first time"] },
  { name: "Customer Support", keywords: ["support", "response time", "customer service", "help desk", "ticket", "agent", "support team"] },
  { name: "Feature Requests", keywords: ["would love", "feature request", "wish", "please add", "missing feature", "need a way to", "could you add", "suggestion"] },
  { name: "Integrations & API", keywords: ["integration", "api", "webhook", "zapier", "sso", "single sign-on", "connect to", "third-party"] },
  { name: "Import & Export", keywords: ["import", "export", "csv", "pdf export", "download report", "upload"] },
  { name: "Search & Reporting", keywords: ["search", "filter", "report", "reporting", "analytics", "chart", "dashboard"] },
  { name: "Mobile Experience", keywords: ["mobile", "app store", "ios", "android", "phone", "tablet"] },
  { name: "Reliability & Uptime", keywords: ["downtime", "outage", "uptime", "unreliable", "unavailable", "server error", "500 error"] },
  { name: "Documentation", keywords: ["docs", "documentation", "guide", "help article", "faq", "instructions"] },
  { name: "Security & Privacy", keywords: ["security", "privacy", "data breach", "gdpr", "encryption", "permissions", "access control"] },
  { name: "AI Classification Accuracy", keywords: ["classification", "misclassified", "auto-classif", "theme accuracy", "sentiment accuracy", "ai suggestion"] },
];

/**
 * Exported so lib/local-report.ts can exclude this catch-all bucket from
 * "recommended actions" - telling someone to "investigate the rise in
 * General Feedback" isn't actionable the way naming a real theme is.
 */
export const FALLBACK_THEME = "General Feedback";

interface ThemeMatch {
  name: string;
  hits: number;
}

function scoreThemes(content: string): ThemeMatch[] {
  const text = content.toLowerCase();

  const matches: ThemeMatch[] = THEME_RULES.map((rule) => {
    let hits = 0;
    for (const keyword of rule.keywords) {
      hits += countMatches(text, keyword);
    }
    return { name: rule.name, hits };
  }).filter((m) => m.hits > 0);

  matches.sort((a, b) => b.hits - a.hits);
  return matches;
}

/**
 * Reuses an existing theme's exact name/casing when the workspace already
 * has a theme that matches what we detected, mirroring the "reuse one of
 * these if it genuinely fits" guidance the Claude-based prompt used to
 * follow. `findOrCreateTheme` (theme.service.ts) already does its own
 * case-insensitive matching on whatever name is returned here, so this is
 * a light best-effort pass, not the only thing preventing duplicates.
 */
function resolveThemeName(candidate: string, existingThemeNames: string[]): string {
  const match = existingThemeNames.find(
    (existing) => existing.toLowerCase() === candidate.toLowerCase()
  );
  return match ?? candidate;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Synchronous, local equivalent of lib/ai.ts's `classifyFeedback` - same
 * output shape, no network call, no API key. Never throws for normal
 * string input, so callers don't need the retry/failure handling the
 * Claude-backed version needed.
 */
export function classifyFeedbackLocally(
  content: string,
  existingThemeNames: string[]
): ClassificationResponse {
  const { sentiment, score, signalCount } = scoreSentiment(content);
  const themeMatches = scoreThemes(content);

  const topThemes =
    themeMatches.length > 0
      ? themeMatches.slice(0, 2).map((m) => resolveThemeName(m.name, existingThemeNames))
      : [FALLBACK_THEME];

  const featureArea = topThemes[0] ?? FALLBACK_THEME;

  const rationale =
    themeMatches.length > 0
      ? `Local keyword analysis found ${signalCount} sentiment signal(s) and matched the "${topThemes[0]}" theme (sentiment score ${score.toFixed(2)}).`
      : `Local keyword analysis found ${signalCount} sentiment signal(s); no specific theme keywords matched, so this was filed under "${FALLBACK_THEME}" (sentiment score ${score.toFixed(2)}).`;

  return {
    sentiment,
    sentimentScore: score,
    themes: topThemes,
    featureArea,
    rationale,
  };
}
