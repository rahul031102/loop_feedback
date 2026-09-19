import type { PeriodStats, VoCNarrativeResponse } from "@/lib/validations/reports";
import { vocNarrativeResponseSchema } from "@/lib/validations/reports";
import { FALLBACK_THEME } from "@/lib/local-classifier";

/**
 * Local, dependency-free replacement for lib/ai.ts's `generateVoCNarrative`.
 * Same job (AI4: narrate the already-computed period stats into an
 * executive summary + recommended actions) done with template-composed
 * prose instead of a hosted model - no ANTHROPIC_API_KEY, no network call.
 * Every number, theme name, and quote count in the output comes directly
 * from the `PeriodStats` this function is handed (computed in
 * lib/services/report.service.ts from real database records) - nothing is
 * invented, and stats are never re-derived or restated differently here.
 */

export type VoCNarrativeResult =
  | { success: true; data: VoCNarrativeResponse }
  | { success: false; error: string };

function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

function describeVolumeTrend(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? "up from none in the prior period" : "unchanged (none in either period)";
  const delta = current - previous;
  if (delta === 0) return "unchanged from the prior period";
  const changePct = Math.round((Math.abs(delta) / previous) * 100);
  return delta > 0 ? `up ${changePct}% from the prior period` : `down ${changePct}% from the prior period`;
}

/**
 * If there's no feedback in the selected period at all, say so plainly
 * instead of generating a narrative and recommendations from nothing.
 */
function insufficientDataResult(): VoCNarrativeResult {
  const data: VoCNarrativeResponse = {
    narrative:
      "There isn't enough feedback in this period to generate a meaningful summary. " +
      "No feedback items fall within the selected date range, so sentiment, themes, and " +
      "quotes can't be computed for it. Try selecting a longer reporting period, or add " +
      "more feedback for this workspace first.",
    recommendedActions: [
      "Select a longer reporting period, or add more feedback for this workspace before generating a report.",
    ],
  };
  return { success: true, data };
}

export async function generateLocalVoCNarrative(stats: PeriodStats): Promise<VoCNarrativeResult> {
  const {
    totalItems,
    previousPeriodTotalItems,
    sentimentBreakdown,
    previousSentimentBreakdown,
    topThemes,
    representativeQuotes,
  } = stats;

  if (totalItems === 0) {
    return insufficientDataResult();
  }

  const paragraphs: string[] = [];

  // --- Volume ---
  paragraphs.push(
    `This period saw ${totalItems} piece${totalItems === 1 ? "" : "s"} of feedback, ` +
      `${describeVolumeTrend(totalItems, previousPeriodTotalItems)} ` +
      `(${previousPeriodTotalItems} in the prior period of equal length).`
  );

  // --- Sentiment overview + shift ---
  const positivePct = pct(sentimentBreakdown.positive, totalItems);
  const neutralPct = pct(sentimentBreakdown.neutral, totalItems);
  const negativePct = pct(sentimentBreakdown.negative, totalItems);

  const prevTotal =
    previousSentimentBreakdown.positive +
    previousSentimentBreakdown.neutral +
    previousSentimentBreakdown.negative +
    previousSentimentBreakdown.unclassified;
  const prevPositivePct = pct(previousSentimentBreakdown.positive, prevTotal);
  const prevNegativePct = pct(previousSentimentBreakdown.negative, prevTotal);

  let sentimentShift = "held roughly steady";
  if (prevTotal > 0) {
    const posDelta = positivePct - prevPositivePct;
    const negDelta = negativePct - prevNegativePct;
    if (negDelta >= 5 && negDelta > posDelta) sentimentShift = "worsened";
    else if (posDelta >= 5 && posDelta > negDelta) sentimentShift = "improved";
  }

  paragraphs.push(
    `Sentiment breaks down as ${positivePct}% positive, ${neutralPct}% neutral, and ${negativePct}% negative` +
      `${
        sentimentBreakdown.unclassified > 0
          ? ` (${sentimentBreakdown.unclassified} item${sentimentBreakdown.unclassified === 1 ? "" : "s"} not yet classified)`
          : ""
      }. ` +
      (prevTotal > 0
        ? `Compared to the prior period (${prevPositivePct}% positive, ${prevNegativePct}% negative), overall sentiment has ${sentimentShift}.`
        : "There's no prior-period data yet to compare sentiment against.")
  );

  // --- Top themes ---
  if (topThemes.length > 0) {
    const themeParts = topThemes.slice(0, 5).map((t) => {
      let trendNote: string | null = null;
      if (t.previousCount === 0 && t.count > 0) trendNote = "new this period";
      else if (t.previousCount > 0) {
        if (t.count > t.previousCount) trendNote = `up from ${t.previousCount}`;
        else if (t.count < t.previousCount) trendNote = `down from ${t.previousCount}`;
        else trendNote = "steady";
      }
      return `${t.name} (${t.count}${trendNote ? `, ${trendNote}` : ""})`;
    });
    const topTheme = topThemes[0];
    paragraphs.push(
      `The most discussed theme${topThemes.length === 1 ? " was" : "s were"} ${themeParts.join(", ")}.` +
        (topTheme
          ? ` ${topTheme.name} accounts for the largest share of this period's classified feedback.`
          : "")
    );
  }

  // --- Notable quotes context (counts only here - the verbatim quotes
  // themselves are already rendered separately from `representativeQuotes`,
  // this just gives the narrative a pointer to them) ---
  const positiveQuotes = representativeQuotes.filter((q) => q.sentiment === "POSITIVE");
  const negativeQuotes = representativeQuotes.filter((q) => q.sentiment === "NEGATIVE");
  if (positiveQuotes.length > 0 || negativeQuotes.length > 0) {
    const bits: string[] = [];
    if (positiveQuotes.length > 0) {
      bits.push(
        `${positiveQuotes.length} positive quote${positiveQuotes.length === 1 ? "" : "s"} highlighting what's working well`
      );
    }
    if (negativeQuotes.length > 0) {
      bits.push(
        `${negativeQuotes.length} negative quote${negativeQuotes.length === 1 ? "" : "s"} pointing to areas of friction`
      );
    }
    paragraphs.push(`Notable feedback below includes ${bits.join(" and ")} - see the verbatim quotes for specifics.`);
  }

  const narrative = paragraphs.join("\n\n").slice(0, 2900);

  // --- Recommended actions, grounded in the actual negative/spiking themes ---
  // The "General Feedback" fallback bucket (unmatched-keyword catch-all) is
  // excluded here - "investigate the rise in General Feedback" isn't an
  // actionable recommendation the way naming a real theme is. It's still
  // included in the narrative's theme mentions above, since that's just
  // reporting the real distribution, not prescribing an action.
  const actionableThemes = topThemes.filter((t) => t.name !== FALLBACK_THEME);

  const actions: string[] = [];

  const growingThemes = actionableThemes.filter((t) => t.previousCount > 0 && t.count > t.previousCount);
  const newThemes = actionableThemes.filter((t) => t.previousCount === 0 && t.count > 0);

  for (const t of growingThemes.slice(0, 2)) {
    if (actions.length >= 6) break;
    actions.push(`Investigate the rise in "${t.name}" feedback (${t.count} items this period, up from ${t.previousCount}).`);
  }
  for (const t of newThemes.slice(0, 2)) {
    if (actions.length >= 6) break;
    actions.push(`Look into "${t.name}", a newly emerging theme this period (${t.count} item${t.count === 1 ? "" : "s"}).`);
  }

  if (negativePct >= 30 && actions.length < 6) {
    const topTheme = actionableThemes[0];
    actions.push(
      topTheme
        ? `Prioritize addressing negative feedback, particularly around "${topTheme.name}" (${negativePct}% of this period's feedback is negative).`
        : `Prioritize addressing negative feedback - it makes up ${negativePct}% of this period's items.`
    );
  }

  if (sentimentBreakdown.unclassified > 0 && actions.length < 6) {
    actions.push(
      `Run classification on the ${sentimentBreakdown.unclassified} unclassified feedback item${
        sentimentBreakdown.unclassified === 1 ? "" : "s"
      } so they're reflected in future reports.`
    );
  }

  if (actions.length === 0) {
    actions.push(
      positivePct > negativePct
        ? "Sentiment is trending positive - continue current priorities and keep monitoring for shifts next period."
        : "Continue monitoring feedback volume and sentiment; no sharp shifts were detected this period."
    );
  }

  const data: VoCNarrativeResponse = {
    narrative,
    recommendedActions: actions.slice(0, 6).map((a) => a.slice(0, 300)),
  };

  try {
    return { success: true, data: vocNarrativeResponseSchema.parse(data) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Report narrative generation failed.",
    };
  }
}
