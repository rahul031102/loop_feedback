"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CHANNEL_LABELS, STATUS_LABELS, SENTIMENT_LABELS } from "@/lib/labels";

interface ThemeOption {
  id: string;
  name: string;
}

const FILTER_KEYS = ["channel", "sentiment", "status", "themeId", "from", "to", "search"] as const;

export function InboxFilters({ themes }: { themes: ThemeOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [searchText, setSearchText] = useState(searchParams.get("search") ?? "");

  // Debounced so search doesn't fire a request on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchText !== (searchParams.get("search") ?? "")) {
        updateParam("search", searchText);
      }
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page"); // any filter change resets to page 1
    startTransition(() => router.push(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  const hasActiveFilters = FILTER_KEYS.some((key) => searchParams.get(key));

  function clearAll() {
    setSearchText("");
    startTransition(() => router.push(pathname, { scroll: false }));
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-base-2/40 px-5 py-3">
      <div className="relative min-w-[220px] flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-3"
          aria-hidden="true"
        />
        <Input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search feedback content..."
          className="pl-9"
          aria-label="Search feedback"
        />
      </div>

      <Select
        value={searchParams.get("channel") ?? ""}
        onChange={(e) => updateParam("channel", e.target.value)}
        className="w-auto min-w-[150px]"
        aria-label="Filter by channel"
      >
        <option value="">All channels</option>
        {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>

      <Select
        value={searchParams.get("sentiment") ?? ""}
        onChange={(e) => updateParam("sentiment", e.target.value)}
        className="w-auto min-w-[140px]"
        aria-label="Filter by sentiment"
      >
        <option value="">All sentiment</option>
        {Object.entries(SENTIMENT_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
        <option value="UNCLASSIFIED">Unclassified</option>
      </Select>

      <Select
        value={searchParams.get("status") ?? ""}
        onChange={(e) => updateParam("status", e.target.value)}
        className="w-auto min-w-[130px]"
        aria-label="Filter by status"
      >
        <option value="">All statuses</option>
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>

      <Select
        value={searchParams.get("themeId") ?? ""}
        onChange={(e) => updateParam("themeId", e.target.value)}
        className="w-auto min-w-[140px]"
        aria-label="Filter by theme"
      >
        <option value="">All themes</option>
        {themes.map((theme) => (
          <option key={theme.id} value={theme.id}>
            {theme.name}
          </option>
        ))}
      </Select>

      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          value={searchParams.get("from") ?? ""}
          onChange={(e) => updateParam("from", e.target.value)}
          className="w-auto"
          aria-label="From date"
        />
        <span className="text-fg-3">–</span>
        <Input
          type="date"
          value={searchParams.get("to") ?? ""}
          onChange={(e) => updateParam("to", e.target.value)}
          className="w-auto"
          aria-label="To date"
        />
      </div>

      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-fg-3 hover:bg-base-2 hover:text-fg"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Clear
        </button>
      )}
    </div>
  );
}
