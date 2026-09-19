import { LayoutList, TrendingDown, CalendarClock } from "lucide-react";
import { requireAuth } from "@/lib/rbac";
import { getDashboardStats, type DashboardRangeDays } from "@/lib/services/dashboard.service";
import { StatCard } from "@/components/dashboard/stat-card";
import { DateRangeSelector } from "@/components/dashboard/date-range-selector";
import { VolumeChart } from "@/components/dashboard/volume-chart";
import { SentimentChart } from "@/components/dashboard/sentiment-chart";
import { ThemesChart } from "@/components/dashboard/themes-chart";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const VALID_RANGES = new Set([7, 30, 90]);

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  const { workspaceId } = await requireAuth();

  const requestedRange = Number(searchParams.range ?? 30);
  const range = (VALID_RANGES.has(requestedRange) ? requestedRange : 30) as DashboardRangeDays;

  const stats = await getDashboardStats(workspaceId, range);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-fg">Dashboard</h1>
          <p className="mt-1 text-sm text-fg-3">The shape of your feedback, at a glance.</p>
        </div>
        <DateRangeSelector current={range} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={`Items in the last ${range} days`}
          value={stats.totalItems.toLocaleString()}
          icon={LayoutList}
        />
        <StatCard
          label="Negative sentiment"
          value={`${stats.negativePercent}%`}
          icon={TrendingDown}
          tone={stats.negativePercent > 25 ? "negative" : "default"}
        />
        <StatCard
          label="New this week"
          value={stats.newThisWeek.toLocaleString()}
          icon={CalendarClock}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Volume over time</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.volumeOverTime.length === 0 ? (
              <EmptyChartState message="No feedback in this window yet." />
            ) : (
              <VolumeChart data={stats.volumeOverTime} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sentiment breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <SentimentChart data={stats.sentimentBreakdown} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Top themes</CardTitle>
          </CardHeader>
          <CardContent>
            <ThemesChart data={stats.topThemes} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center text-sm text-fg-3">{message}</div>
  );
}
