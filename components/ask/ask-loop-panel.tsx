"use client";

import { useState, type FormEvent } from "react";
import { MessageCircleQuestion, Send, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChannelBadge } from "@/components/feedback/badges";
import { formatDate } from "@/lib/utils";
import type { Feedback } from "@prisma/client";

interface AskResult {
  answer: string;
  hasSufficientContext: boolean;
  citedFeedback: Feedback[];
}

const EXAMPLE_QUESTIONS = [
  "What are users saying about onboarding?",
  "Are customers asking for SSO?",
  "What's frustrating people about the mobile app?",
];

export function AskLoopPanel() {
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AskResult | null>(null);
  const [askedQuestion, setAskedQuestion] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!question.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/insights/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Couldn't answer that question. Please try again.");
        return;
      }

      setAskedQuestion(question);
      setResult(data);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <MessageCircleQuestion
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-3"
            aria-hidden="true"
          />
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What are users saying about onboarding?"
            maxLength={500}
            className="h-11 w-full rounded-md border border-border bg-base-2 pl-10 pr-3 text-sm text-fg placeholder:text-fg-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
        <Button type="submit" size="lg" isLoading={isLoading} disabled={!question.trim()}>
          <Send className="h-4 w-4" aria-hidden="true" />
          Ask
        </Button>
      </form>

      {!result && !error && !isLoading && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => setQuestion(q)}
              className="rounded-full border border-border bg-base-2 px-3 py-1.5 text-xs text-fg-2 hover:border-accent/40 hover:bg-accent-50"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-negative/30 bg-negative-bg px-4 py-3 text-sm text-negative">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-base-2 p-5">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-fg-3">
              {askedQuestion}
            </p>
            <p className="text-fg">{result.answer}</p>
            {!result.hasSufficientContext && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-fg-3">
                <AlertCircle className="h-3.5 w-3.5" />
                The existing feedback doesn&apos;t fully address this yet.
              </p>
            )}
          </div>

          {result.citedFeedback.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-fg-3">
                Grounded in {result.citedFeedback.length}{" "}
                {result.citedFeedback.length === 1 ? "item" : "items"}
              </p>
              <div className="space-y-2">
                {result.citedFeedback.map((item) => (
                  <a
                    key={item.id}
                    href={`/inbox?search=${encodeURIComponent(item.content.slice(0, 40))}`}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border bg-base-2 p-3.5 text-sm hover:border-accent/40 hover:bg-base-2/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-fg-2">{item.content}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <ChannelBadge channel={item.channel} />
                        {item.customerLabel && (
                          <span className="text-xs text-fg-3">{item.customerLabel}</span>
                        )}
                        <span className="text-xs text-fg-3">·</span>
                        <span className="text-xs text-fg-3">{formatDate(item.createdAt)}</span>
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-fg-3" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
