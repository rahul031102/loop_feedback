"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function GenerateReportDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open() {
    setError(null);
    dialogRef.current?.showModal();
  }

  function close() {
    if (!isSubmitting) dialogRef.current?.close();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodDays: Number(formData.get("periodDays")) }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Couldn't generate the report. Please try again.");
        return;
      }

      dialogRef.current?.close();
      router.push(`/reports/${data.report.id}`);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button onClick={open} type="button">
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        Generate report
      </Button>

      <dialog
        ref={dialogRef}
        className="w-full max-w-sm rounded-lg border border-border p-0 backdrop:bg-black/60"
      >
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold text-fg">Generate a report</h2>
            <button
              type="button"
              onClick={close}
              disabled={isSubmitting}
              className="rounded-md p-1 text-fg-3 hover:bg-base-2 hover:text-fg disabled:opacity-50"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 px-5 py-4">
            {error && (
              <p className="rounded-md bg-negative-bg px-3 py-2 text-sm text-negative" role="alert">
                {error}
              </p>
            )}
            <div>
              <Label htmlFor="periodDays">Period</Label>
              <Select id="periodDays" name="periodDays" defaultValue="30">
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </Select>
            </div>
            <p className="text-xs text-fg-3">
              Summarizes top themes, sentiment shifts, notable quotes, and recommended actions for
              the period you choose - generated from your actual feedback data.
            </p>
          </div>

          <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
            <Button type="button" variant="outline" onClick={close} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Generate
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
