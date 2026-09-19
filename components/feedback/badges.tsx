import type { Sentiment, FeedbackStatus, Channel } from "@prisma/client";
import { SENTIMENT_LABELS, STATUS_LABELS, CHANNEL_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function SentimentBadge({ sentiment }: { sentiment: Sentiment | null }) {
  if (!sentiment) {
    return (
      <span className="label-pill border border-border bg-base-3 text-fg-3">
        <span className="h-1.5 w-1.5 rounded-full bg-fg-3" />
        Unclassified
      </span>
    );
  }

  const styles: Record<Sentiment, string> = {
    POSITIVE: "bg-positive-bg text-positive",
    NEUTRAL: "bg-neutral-bg text-neutral",
    NEGATIVE: "bg-negative-bg text-negative",
  };

  const dot: Record<Sentiment, string> = {
    POSITIVE: "bg-positive",
    NEUTRAL: "bg-neutral",
    NEGATIVE: "bg-negative",
  };

  return (
    <span className={cn("label-pill", styles[sentiment])}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot[sentiment])} />
      {SENTIMENT_LABELS[sentiment]}
    </span>
  );
}

export function StatusBadge({ status }: { status: FeedbackStatus }) {
  const styles: Record<FeedbackStatus, string> = {
    NEW: "bg-accent-50 text-accent",
    REVIEWED: "bg-warning-bg text-warning",
    ACTIONED: "bg-positive-bg text-positive",
  };

  return <span className={cn("label-pill", styles[status])}>{STATUS_LABELS[status]}</span>;
}

export function ChannelBadge({ channel }: { channel: Channel }) {
  return (
    <span className="label-pill border border-border bg-base text-fg-2">
      {CHANNEL_LABELS[channel]}
    </span>
  );
}
