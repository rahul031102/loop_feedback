import { Channel, Role, FeedbackStatus, Sentiment } from "@prisma/client";

export const CHANNEL_LABELS: Record<Channel, string> = {
  SUPPORT_TICKET: "Support ticket",
  APP_STORE_REVIEW: "App store review",
  NPS_SURVEY: "NPS survey",
  CSAT_SURVEY: "CSAT survey",
  SALES_CALL_NOTE: "Sales call note",
  COMMUNITY_POST: "Community post",
  SOCIAL_MENTION: "Social mention",
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  ANALYST: "Analyst",
  VIEWER: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ADMIN: "Manages members and roles, full access to feedback.",
  ANALYST: "Ingests and manages feedback.",
  VIEWER: "Read-only access to feedback.",
};

export const STATUS_LABELS: Record<FeedbackStatus, string> = {
  NEW: "New",
  REVIEWED: "Reviewed",
  ACTIONED: "Actioned",
};

export const SENTIMENT_LABELS: Record<Sentiment, string> = {
  POSITIVE: "Positive",
  NEUTRAL: "Neutral",
  NEGATIVE: "Negative",
};
