import { requireAuth } from "@/lib/rbac";
import { listFeedbackPaginated } from "@/lib/services/feedback.service";
import { listThemes } from "@/lib/services/theme.service";
import { feedbackFiltersSchema } from "@/lib/validations/feedback";
import { FeedbackTable } from "@/components/feedback/feedback-table";
import { InboxFilters } from "@/components/feedback/inbox-filters";
import { Pagination } from "@/components/feedback/pagination";
import { NewFeedbackDialog } from "@/components/feedback/new-feedback-dialog";
import { CsvImportDialog } from "@/components/feedback/csv-import-dialog";
import { SimulateChannelMenu } from "@/components/feedback/simulate-channel-menu";
import { ProcessPendingBanner } from "@/components/feedback/process-pending-banner";

export const dynamic = "force-dynamic";

interface InboxPageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export default async function InboxPage({ searchParams }: InboxPageProps) {
  const { workspaceId, role } = await requireAuth();

  // Next.js gives searchParams values as string | string[] | undefined;
  // our filters are always single values, so flatten arrays defensively
  // before handing off to Zod.
  const flatParams = Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ])
  );
  const filters = feedbackFiltersSchema.parse(flatParams);

  const [{ items, total, page, pageSize, totalPages }, themes] = await Promise.all([
    listFeedbackPaginated(workspaceId, filters),
    listThemes(workspaceId),
  ]);

  const hasActiveFilters = Boolean(
    filters.channel ||
      filters.sentiment ||
      filters.status ||
      filters.themeId ||
      filters.from ||
      filters.to ||
      filters.search
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-fg">Inbox</h1>
          <p className="mt-1 text-sm text-fg-3">
            {total.toLocaleString()} {total === 1 ? "item" : "items"} in this workspace
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SimulateChannelMenu />
          <CsvImportDialog />
          <NewFeedbackDialog />
        </div>
      </div>

      <ProcessPendingBanner canProcess={role === "ADMIN" || role === "ANALYST"} />

      <div className="rounded-lg border border-border bg-base-2">
        <InboxFilters themes={themes} />
        <FeedbackTable items={items} role={role} hasActiveFilters={hasActiveFilters} />
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} />
      </div>
    </div>
  );
}
