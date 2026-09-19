import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAuth } from "@/lib/rbac";
import { getReportById } from "@/lib/services/report.service";
import { formatDate } from "@/lib/utils";
import { PrintButton } from "@/components/reports/print-button";
import type { VoCReportContent } from "@/lib/validations/reports";

export const dynamic = "force-dynamic";

export default async function ReportDetailPage({ params }: { params: { id: string } }) {
  const { workspaceId } = await requireAuth();
  const report = await getReportById(workspaceId, params.id);

  if (!report) {
    notFound();
  }

  const content = report.contentJson as unknown as VoCReportContent;
  const { sentimentBreakdown, previousSentimentBreakdown, topThemes, representativeQuotes } =
    content;

  return (
    <div className="report-print mx-auto max-w-3xl">
      <div className="no-print mb-6 flex items-center justify-between">
        <Link href="/reports" className="flex items-center gap-1.5 text-sm text-fg-3 hover:text-fg">
          <ArrowLeft className="h-3.5 w-3.5" />
          All reports
        </Link>
        <PrintButton />
      </div>

      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-wide text-fg-3">Voice of Customer</p>
        <h1 className="mt-1 text-2xl font-semibold text-fg">{report.title}</h1>
        <p className="mt-2 text-sm text-fg-3">
          {formatDate(report.periodStart)} – {formatDate(report.periodEnd)} · Generated{" "}
          {formatDate(report.createdAt)} by {report.generatedBy.name}
        </p>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatBlock
          label="Total feedback"
          value={content.totalItems}
          previous={content.previousPeriodTotalItems}
        />
        <StatBlock
          label="Positive"
          value={sentimentBreakdown.positive}
          previous={previousSentimentBreakdown.positive}
          tone="positive"
        />
        <StatBlock
          label="Negative"
          value={sentimentBreakdown.negative}
          previous={previousSentimentBreakdown.negative}
          tone="negative"
        />
        <StatBlock
          label="Unclassified"
          value={sentimentBreakdown.unclassified}
          previous={previousSentimentBreakdown.unclassified}
        />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-3">Summary</h2>
        <div className="space-y-3 text-fg">
          {content.narrative.split(/\n\n+/).map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </section>

      {topThemes.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-3">
            Top themes
          </h2>
          <div className="space-y-2">
            {topThemes.map((theme) => (
              <div
                key={theme.id}
                className="flex items-center justify-between rounded-md border border-border px-4 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: theme.color }}
                    aria-hidden="true"
                  />
                  <span className="text-sm text-fg">{theme.name}</span>
                </div>
                <span className="font-mono text-sm text-fg-2">
                  {theme.count}
                  {theme.previousCount > 0 && (
                    <span className="text-fg-3"> / {theme.previousCount} prior</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {representativeQuotes.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-3">
            What customers said
          </h2>
          <div className="space-y-3">
            {representativeQuotes.map((quote, i) => (
              <blockquote
                key={i}
                className="border-l-2 border-primary py-1 pl-4 text-sm italic text-fg-2"
              >
                &ldquo;{quote.content}&rdquo;
                <footer className="mt-1 text-xs not-italic text-fg-3">
                  {quote.customerLabel ?? "Anonymous"} ·{" "}
                  {quote.channel.replace(/_/g, " ").toLowerCase()}
                </footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-3">
          Recommended actions
        </h2>
        <ul className="list-inside list-disc space-y-1.5 text-fg">
          {content.recommendedActions.map((action, i) => (
            <li key={i}>{action}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function StatBlock({
  label,
  value,
  previous,
  tone,
}: {
  label: string;
  value: number;
  previous: number;
  tone?: "positive" | "negative";
}) {
  const delta = value - previous;
  return (
    <div className="rounded-lg border border-border bg-base-2 p-3.5">
      <p
        className={`font-mono text-xl font-semibold ${
          tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : "text-fg"
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-fg-3">{label}</p>
      {previous > 0 && (
        <p className="mt-0.5 text-xs text-fg-3">
          {delta > 0 ? "+" : ""}
          {delta} vs. prior period
        </p>
      )}
    </div>
  );
}
