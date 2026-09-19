"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Radio, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SIMULATED_SOURCES, type SimulatedSource } from "@/lib/simulated-channels";

export function SimulateChannelMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [pending, setPending] = useState<SimulatedSource | null>(null);
  const [justSynced, setJustSynced] = useState<{ source: string; count: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  async function handleSync(source: SimulatedSource) {
    setPending(source);
    setJustSynced(null);
    try {
      const response = await fetch("/api/feedback/channel-sim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      const data = await response.json();
      if (response.ok) {
        setJustSynced({ source: data.source, count: data.imported });
        router.refresh();
      }
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <Radio className="h-4 w-4" aria-hidden="true" />
        Simulate channel
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 z-20 mt-2 w-72 rounded-lg border border-border bg-base-2 p-1.5 shadow-lg"
          >
            {SIMULATED_SOURCES.map((source) => (
              <button
                key={source.id}
                role="menuitem"
                disabled={pending !== null}
                onClick={() => handleSync(source.id)}
                className="flex w-full flex-col items-start gap-0.5 rounded-md px-3 py-2 text-left hover:bg-base-2 disabled:opacity-60"
              >
                <span className="text-sm font-medium text-fg">
                  {pending === source.id ? "Syncing…" : source.label}
                </span>
                <span className="text-xs text-fg-3">{source.description}</span>
              </button>
            ))}
            {justSynced && (
              <div className="mt-1 flex items-center gap-1.5 border-t border-border px-3 py-2 text-xs text-positive">
                <Check className="h-3.5 w-3.5" />
                Added {justSynced.count} items from {justSynced.source}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
