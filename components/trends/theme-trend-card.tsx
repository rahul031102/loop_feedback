import Link from "next/link";
import { Flame, ArrowUp, ArrowDown, Minus } from "lucide-react";
import type { ThemeTrend } from "@/lib/services/theme.service";

export function ThemeTrendCard({ trend }: { trend: ThemeTrend }) {
  return (
    <Link
      href={`/inbox?themeId=${trend.id}`}
      className="flex flex-col gap-3 rounded-lg border border-border bg-base-2 p-4 transition-colors hover:border-accent/40 hover:bg-base-2/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
            style={{ backgroundColor: trend.color }}
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-fg">{trend.name}</span>
        </div>
        {trend.isSpiking && (
          <span className="label-pill flex-shrink-0 bg-negative-bg text-negative">
            <Flame className="h-3 w-3" />
            Spiking
          </span>
        )}
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-2xl font-semibold text-fg">{trend.currentCount}</p>
          <p className="text-xs text-fg-3">this period</p>
        </div>
        <PercentChangeIndicator
          percentChange={trend.percentChange}
          previousCount={trend.previousCount}
        />
      </div>
    </Link>
  );
}

function PercentChangeIndicator({
  percentChange,
  previousCount,
}: {
  percentChange: number | null;
  previousCount: number;
}) {
  if (percentChange === null) {
    return previousCount === 0 ? (
      <span className="text-xs font-medium text-accent">New</span>
    ) : null;
  }

  if (percentChange === 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-fg-3">
        <Minus className="h-3 w-3" />
        No change
      </span>
    );
  }

  const isUp = percentChange > 0;
  return (
    <span
      className={`flex items-center gap-0.5 text-xs font-medium ${isUp ? "text-negative" : "text-positive"}`}
    >
      {isUp ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(percentChange)}% vs. prior period
    </span>
  );
}
