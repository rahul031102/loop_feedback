"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProcessingState {
  status: "idle" | "checking" | "running" | "done";
  total: number;
  remaining: number;
}

export function ProcessPendingBanner({ canProcess }: { canProcess: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<ProcessingState>({
    status: "checking",
    total: 0,
    remaining: 0,
  });

  const checkPending = useCallback(async () => {
    try {
      const response = await fetch("/api/feedback/process-pending");
      const data = await response.json();
      setState((prev) => ({
        status: "idle",
        total: prev.status === "running" ? prev.total : data.remaining,
        remaining: data.remaining,
      }));
    } catch {
      setState((prev) => ({ ...prev, status: "idle" }));
    }
  }, []);

  useEffect(() => {
    checkPending();
  }, [checkPending]);

  async function runProcessing() {
    setState((prev) => ({ ...prev, status: "running", total: prev.remaining }));

    // Batch-polling loop: keep calling the endpoint (10 items per call,
    // per ai-processing.service.ts) until nothing's left. This is a
    // client-driven loop rather than a server-side background job because
    // Section 05 doesn't specify a job queue - see that service's own
    // comment for the reasoning.
    let remaining = state.remaining;
    while (remaining > 0) {
      try {
        const response = await fetch("/api/feedback/process-pending", { method: "POST" });
        const data = await response.json();
        remaining = data.remaining;
        setState((prev) => ({ ...prev, remaining }));
      } catch {
        break;
      }
    }

    setState((prev) => ({ ...prev, status: "done" }));
    router.refresh();
  }

  if (state.status === "checking" || (state.status === "idle" && state.remaining === 0)) {
    return null;
  }

  if (state.status === "done") {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-positive/30 bg-positive-bg px-4 py-3 text-sm text-positive">
        <Sparkles className="h-4 w-4 flex-shrink-0" />
        AI processing complete - sentiment, themes, and search are up to date.
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary-50 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-fg">
        <Sparkles className="h-4 w-4 flex-shrink-0 text-primary" />
        {state.status === "running" ? (
          <span>
            Processing feedback with Claude…{" "}
            <span className="font-mono text-xs text-fg-3">
              {state.total - state.remaining} / {state.total}
            </span>
          </span>
        ) : (
          <span>
            <span className="font-medium">{state.remaining}</span>{" "}
            {state.remaining === 1 ? "item needs" : "items need"} AI classification &amp; embedding
          </span>
        )}
      </div>

      {canProcess &&
        (state.status === "running" ? (
          <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-primary" />
        ) : (
          <Button size="sm" variant="outline" onClick={runProcessing}>
            Run AI processing
          </Button>
        ))}
    </div>
  );
}
