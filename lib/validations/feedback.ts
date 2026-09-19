import { z } from "zod";
import { Channel, Sentiment, FeedbackStatus } from "@prisma/client";

// C3 AC1: "Single-entry form with validation (content required, channel
// selected)." sourceRef and customerLabel are optional context fields from
// the data model (Section 07) - not required by the acceptance criteria.
export const createFeedbackSchema = z.object({
  content: z.string().trim().min(1, "Feedback content is required").max(5000),
  channel: z.nativeEnum(Channel, { errorMap: () => ({ message: "Select a channel" }) }),
  sourceRef: z.string().trim().max(200).optional().or(z.literal("")),
  customerLabel: z.string().trim().max(200).optional().or(z.literal("")),
});
export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;

export const listFeedbackQuerySchema = z.object({
  take: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListFeedbackQuery = z.infer<typeof listFeedbackQuerySchema>;

// C4: "Filter by channel, sentiment, theme, status, and date range" +
// "Full-text search over feedback content" + "Server-side pagination."
// Every field optional except pagination, which defaults sensibly.
export const feedbackFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  channel: z.nativeEnum(Channel).optional(),
  sentiment: z.union([z.nativeEnum(Sentiment), z.literal("UNCLASSIFIED")]).optional(),
  status: z.nativeEnum(FeedbackStatus).optional(),
  themeId: z.string().min(1).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  search: z.string().trim().max(200).optional(),
});
export type FeedbackFilters = z.infer<typeof feedbackFiltersSchema>;

// C4 AC4: "Status workflow: NEW -> REVIEWED -> ACTIONED, changeable
// inline." Any status is settable directly (not enforced as strictly
// sequential) - Section 08 doesn't require forward-only transitions, and a
// hard-sequential state machine would make correcting a misclick
// impossible without an escape hatch the brief never asks for.
export const updateFeedbackStatusSchema = z.object({
  status: z.nativeEnum(FeedbackStatus, { errorMap: () => ({ message: "Select a status" }) }),
});
export type UpdateFeedbackStatusInput = z.infer<typeof updateFeedbackStatusSchema>;

// C3 AC2: "CSV upload parses rows and reports how many imported / how many
// failed." Columns per Appendix A: "content, channel, customer_label,
// created_at - with sentiment and themes left blank."
export const csvRowSchema = z.object({
  content: z.string().trim().min(1, "content is required"),
  channel: z.nativeEnum(Channel, {
    errorMap: () => ({ message: `channel must be one of: ${Object.values(Channel).join(", ")}` }),
  }),
  customer_label: z.string().trim().max(200).optional().or(z.literal("")),
  created_at: z.coerce.date().optional(),
});
export type CsvRow = z.infer<typeof csvRowSchema>;
