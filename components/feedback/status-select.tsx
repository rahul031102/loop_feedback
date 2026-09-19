"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FeedbackStatus } from "@prisma/client";
import { STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<FeedbackStatus, string> = {
  NEW: "bg-accent-50 text-accent",
  REVIEWED: "bg-warning-bg text-warning",
  ACTIONED: "bg-positive-bg text-positive",
};

export function StatusSelect({
  feedbackId,
  status,
}: {
  feedbackId: string;
  status: FeedbackStatus;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [current, setCurrent] = useState(status);
  const [hasError, setHasError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleChange(next: FeedbackStatus) {
    const previous = current;
    setCurrent(next); // optimistic - most status changes succeed, and this
    setHasError(false); // keeps the UI feeling immediate rather than laggy
    setIsSaving(true);

    try {
      const response = await fetch(`/api/feedback/${feedbackId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!response.ok) {
        setCurrent(previous);
        setHasError(true);
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setCurrent(previous);
      setHasError(true);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <select
      value={current}
      disabled={isSaving}
      onChange={(e) => handleChange(e.target.value as FeedbackStatus)}
      aria-label="Change status"
      className={cn(
        "label-pill cursor-pointer appearance-none border-0 pr-6 transition-opacity",
        "focus:outline-none focus:ring-2 focus:ring-accent/40",
        STATUS_STYLES[current],
        isSaving && "opacity-60",
        hasError && "ring-2 ring-negative"
      )}
    >
      {Object.entries(STATUS_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
