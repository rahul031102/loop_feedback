import { TrendingUp } from "lucide-react";
import { requireAuth } from "@/lib/rbac";
import { getThemeTrends } from "@/lib/services/theme.service";
import { TrendsPeriodSelector } from "@/components/trends/trends-period-selector";
import { ThemeTrendCard } from "@/components/trends/theme-trend-card";

export const dynamic = "force-dynamic";

const VALID_PERIODS = new Set([7, 30, 90]);

export default async function TrendsPage({ searchParams }: { searchParams: { period?: string } }) {
  const { workspaceId } = await requireAuth();

  const requested = Number(searchParams.period ?? 30);
  const period = VALID_PERIODS.has(requested) ? requested : 30;

  const trends = await getThemeTrends(workspaceId, period);
  const spikingCount = trends.filter((t) => t.isSpiking).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-fg">Trends</h1>
          <p className="mt-1 text-sm text-fg-3">
            {trends.length === 0
              ? "Themes appear here once feedback is classified."
              : spikingCount > 0
                ? `${spikingCount} ${spikingCount === 1 ? "theme is" : "themes are"} spiking this period.`
                : "No themes are spiking this period."}
          </p>
        </div>
        <TrendsPeriodSelector current={period} />
      </div>

      {trends.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-base-2 px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-base-3">
            <TrendingUp className="h-5 w-5 text-fg-3" aria-hidden="true" />
          </div>
          <div>
            <p className="font-medium text-fg">No themes yet</p>
            <p className="mt-1 max-w-sm text-sm text-fg-3">
              Run AI processing from the Inbox to classify feedback into themes - trends and spike
              detection will appear here once that&apos;s done.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {trends.map((trend) => (
            <ThemeTrendCard key={trend.id} trend={trend} />
          ))}
        </div>
      )}
    </div>
  );
}
