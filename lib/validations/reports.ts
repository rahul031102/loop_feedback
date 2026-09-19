import { z } from "zod";

export interface PeriodSentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
  unclassified: number;
}

export interface ReportThemeStat {
  id: string;
  name: string;
  color: string;
  count: number;
  previousCount: number;
}

export interface RepresentativeQuote {
  content: string;
  channel: string;
  sentiment: string | null;
  customerLabel: string | null;
}

export interface PeriodStats {
  totalItems: number;
  previousPeriodTotalItems: number;
  sentimentBreakdown: PeriodSentimentBreakdown;
  previousSentimentBreakdown: PeriodSentimentBreakdown;
  topThemes: ReportThemeStat[];
  representativeQuotes: RepresentativeQuote[];
}

export interface VoCReportContent extends PeriodStats {
  narrative: string;
  recommendedActions: string[];
}

/**
 * AI4 AC2: "summarises top themes, sentiment shifts, notable verbatim
 * quotes, and recommended actions." This is what Claude's narrative
 * response is validated against - it only ever produces `narrative` and
 * `recommendedActions`; every number in the report comes from
 * computePeriodStats, never from the model (Section 9.3).
 */
export const vocNarrativeResponseSchema = z.object({
  narrative: z.string().trim().min(1).max(3000),
  recommendedActions: z.array(z.string().trim().min(1).max(300)).min(1).max(6),
});
export type VoCNarrativeResponse = z.infer<typeof vocNarrativeResponseSchema>;

// AI4 AC1: "One click generates a report for a chosen period."
export const generateReportSchema = z.object({
  periodDays: z.coerce
    .number()
    .int()
    .refine((n) => [7, 30, 90].includes(n), {
      message: "Period must be 7, 30, or 90 days",
    }),
});
export type GenerateReportInput = z.infer<typeof generateReportSchema>;
