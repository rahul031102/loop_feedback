"use client";

import { useEffect, useState } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import { SentimentBadge, StatusBadge, ChannelBadge } from "@/components/feedback/badges";
import { formatDateTime } from "@/lib/utils";
import type { Feedback, Theme } from "@prisma/client";

interface DetailResponse extends Feedback {
  feedbackThemes: { theme: Pick<Theme, "id" | "name" | "color"> }[];
}

interface FeedbackDetailDialogProps {
  feedbackId: string;
  onClose: () => void;
}

/**
 * Fixes a real gap the M4 self-check surfaced: the inbox table truncates
 * content to 2 lines (`line-clamp-2`) with no way to read the rest, even
 * though feedback content can run up to 5,000 characters. This is the fix -
 * click any row's content to see it in full, along with every field the
 * table doesn't have room for (theme links, sentiment score, feature area,
 * source ref, exact timestamps).
 */
export function FeedbackDetailDialog({ feedbackId, onClose }: FeedbackDetailDialogProps) {
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/feedback/${feedbackId}`);
        const data = await response.json();
        if (cancelled) return;

        if (!response.ok) {
          setError(data.error ?? "Couldn't load this item.");
          return;
        }
        setDetail(data.feedback);
      } catch {
        if (!cancelled) setError("Couldn't reach the server. Check your connection and try again.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [feedbackId]);

  // Escape key closes, matching the native <dialog> behavior used
  // elsewhere in the app (new-feedback-dialog, csv-import-dialog, etc.)
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Feedback detail"
        className="relative z-10 max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-lg border border-border bg-base-2 shadow-lg"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-base-2 px-5 py-4">
          <h2 className="text-base font-semibold text-fg">Feedback detail</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-fg-3 hover:bg-base-2 hover:text-fg"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-fg-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          )}

          {!isLoading && error && (
            <div className="flex items-center gap-2 rounded-md bg-negative-bg px-3 py-2.5 text-sm text-negative">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {!isLoading && detail && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <ChannelBadge channel={detail.channel} />
                <SentimentBadge sentiment={detail.sentiment} />
                <StatusBadge status={detail.status} />
                {detail.sentimentScore !== null && (
                  <span className="font-mono text-xs text-fg-3">
                    score {detail.sentimentScore.toFixed(2)}
                  </span>
                )}
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-fg-3">
                  Content
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg">
                  {detail.content}
                </p>
              </div>

              {detail.feedbackThemes.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-fg-3">
                    Themes
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.feedbackThemes.map(({ theme }) => (
                      <span
                        key={theme.id}
                        className="label-pill border border-border bg-base text-fg-2"
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: theme.color }}
                          aria-hidden="true"
                        />
                        {theme.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 text-sm">
                <DetailField label="Customer" value={detail.customerLabel ?? "—"} />
                <DetailField label="Reference" value={detail.sourceRef ?? "—"} />
                <DetailField label="Feature area" value={detail.featureArea ?? "—"} />
                <DetailField label="Received" value={formatDateTime(detail.createdAt)} mono />
                <DetailField label="Last updated" value={formatDateTime(detail.updatedAt)} mono />
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-fg-3">{label}</dt>
      <dd className={mono ? "font-mono text-xs text-fg-2" : "text-fg-2"}>{value}</dd>
    </div>
  );
}
