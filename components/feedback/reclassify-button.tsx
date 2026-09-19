"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function ReclassifyButton({ feedbackId }: { feedbackId: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    setHasError(false);
    try {
      const response = await fetch(`/api/feedback/${feedbackId}/classify`, { method: "POST" });
      if (!response.ok) {
        setHasError(true);
        return;
      }
      router.refresh();
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      title="Re-classify with AI"
      aria-label="Re-classify with AI"
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md text-fg-3 transition-colors hover:bg-base-2 hover:text-fg disabled:opacity-50",
        hasError && "text-negative"
      )}
    >
      <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
    </button>
  );
}
