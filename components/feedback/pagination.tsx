"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
}

export function Pagination({ page, totalPages, total, pageSize }: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function goTo(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    startTransition(() => router.push(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  if (total === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm">
      <p className="text-fg-3">
        Showing <span className="font-medium text-fg">{start}</span>–
        <span className="font-medium text-fg">{end}</span> of{" "}
        <span className="font-medium text-fg">{total.toLocaleString()}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md text-fg-2",
            page <= 1 ? "opacity-40" : "hover:bg-base-2"
          )}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="px-2 font-mono text-xs text-fg-3">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => goTo(page + 1)}
          disabled={page >= totalPages}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md text-fg-2",
            page >= totalPages ? "opacity-40" : "hover:bg-base-2"
          )}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
