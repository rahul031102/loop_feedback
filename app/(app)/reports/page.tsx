import Link from "next/link";
import { FileText, ChevronRight } from "lucide-react";
import { requireAuth } from "@/lib/rbac";
import { listReports } from "@/lib/services/report.service";
import { GenerateReportDialog } from "@/components/reports/generate-report-dialog";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const { workspaceId } = await requireAuth();
  const reports = await listReports(workspaceId);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-fg">Reports</h1>
          <p className="mt-1 text-sm text-fg-3">
            Voice-of-Customer digests, ready to forward to leadership.
          </p>
        </div>
        <GenerateReportDialog />
      </div>

      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-base-2 px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-base-3">
            <FileText className="h-5 w-5 text-fg-3" aria-hidden="true" />
          </div>
          <div>
            <p className="font-medium text-fg">No reports yet</p>
            <p className="mt-1 text-sm text-fg-3">
              Generate your first Voice-of-Customer report above.
            </p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border bg-base-2">
          {reports.map((report) => (
            <Link
              key={report.id}
              href={`/reports/${report.id}`}
              className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-base-2/60"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-fg">{report.title}</p>
                <p className="mt-0.5 text-xs text-fg-3">
                  Generated {formatDate(report.createdAt)} by {report.generatedBy.name}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-fg-3" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
