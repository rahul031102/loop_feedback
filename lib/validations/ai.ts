import { z } from "zod";
import { Sentiment } from "@prisma/client";

/**
 * AI1 AC2: "Output is strictly structured (JSON) and validated before
 * saving." This is what Claude's classification response is checked
 * against - if it doesn't match, the item is flagged for manual review
 * rather than saved with unvalidated data (Section 9.1: "fall back
 * gracefully if parsing fails").
 */
export const classificationResponseSchema = z.object({
  sentiment: z.nativeEnum(Sentiment),
  sentimentScore: z.number().min(-1).max(1),
  themes: z.array(z.string().trim().min(1).max(60)).min(1).max(3),
  featureArea: z.string().trim().min(1).max(60),
  rationale: z.string().trim().min(1).max(300),
});
export type ClassificationResponse = z.infer<typeof classificationResponseSchema>;

// AI3 AC1: "A chat-style box accepts questions like 'What are users saying
// about onboarding?'"
export const askQuestionSchema = z.object({
  question: z.string().trim().min(3, "Ask a more specific question").max(500),
});
export type AskQuestionInput = z.infer<typeof askQuestionSchema>;

/**
 * AI3 AC1's example ("What are users saying about onboarding?") - Claude
 * is asked to return this exact shape so the app can reliably tell which
 * retrieved items actually backed the answer (AC3) versus which were
 * retrieved but not used, rather than trusting free text to say so.
 */
export const askResponseSchema = z.object({
  answer: z.string().trim().min(1),
  citedIndexes: z.array(z.number().int().min(0)),
  hasSufficientContext: z.boolean(),
});
export type AskResponse = z.infer<typeof askResponseSchema>;
