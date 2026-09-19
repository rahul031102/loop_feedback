import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "default" | "negative";
}) {
  return (
    <div className="glass flex items-center gap-4 rounded-2xl px-5 py-4 shadow-card transition-colors hover:border-border-2">
      <div
        className={cn(
          "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl",
          tone === "negative" ? "bg-negative-bg text-negative" : "bg-accent-50 text-accent"
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <p className="font-mono text-2xl font-semibold text-fg">{value}</p>
        <p className="text-sm text-fg-3">{label}</p>
      </div>
    </div>
  );
}
