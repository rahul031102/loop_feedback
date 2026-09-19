"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-base px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-negative-bg">
        <AlertTriangle className="h-6 w-6 text-negative" aria-hidden="true" />
      </div>
      <div>
        <h1 className="text-lg font-semibold text-fg">Something went wrong</h1>
        <p className="mt-1 max-w-sm text-sm text-fg-3">
          An unexpected error occurred. You can try again, or head back to the Inbox.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-fg-3">Reference: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={reset}
          className="rounded-md border border-border bg-base-2 px-4 py-2 text-sm font-medium text-fg hover:bg-base-3"
        >
          Try again
        </button>
        <a
          href="/inbox"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
        >
          Back to Inbox
        </a>
      </div>
    </div>
  );
}
