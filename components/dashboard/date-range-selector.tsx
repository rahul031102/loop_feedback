"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const RANGES = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

export function DateRangeSelector({ current }: { current: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function setRange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", value);
    startTransition(() => router.push(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  return (
    <div className="inline-flex rounded-md border border-border bg-base-2 p-0.5">
      {RANGES.map((r) => (
        <button
          key={r.value}
          onClick={() => setRange(r.value)}
          className={cn(
            "rounded px-3 py-1.5 text-sm font-medium transition-colors",
            current === Number(r.value)
              ? "bg-gradient-primary text-white shadow-sm"
              : "text-fg-2 hover:bg-base-3/60"
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
