"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImportResult {
  imported: number;
  failed: number;
  errors: { row: number; errors: string[] }[];
}

export function CsvImportDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  function open() {
    setResult(null);
    setFormError(null);
    setFileName(null);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
    if (result) router.refresh();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setFormError("Choose a CSV file first.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/feedback/import", { method: "POST", body: formData });
      const data = await response.json();

      if (!response.ok && response.status !== 422) {
        setFormError(data.error ?? "Something went wrong importing that file.");
        return;
      }

      setResult({ imported: data.imported, failed: data.failed, errors: data.errors ?? [] });
    } catch {
      setFormError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button onClick={open} type="button" variant="outline">
        <Upload className="h-4 w-4" aria-hidden="true" />
        Import CSV
      </Button>

      <dialog
        ref={dialogRef}
        className="w-full max-w-lg rounded-lg border border-border p-0 backdrop:bg-black/60"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-fg">Import feedback from CSV</h2>
          <button
            type="button"
            onClick={close}
            className="rounded-md p-1 text-fg-3 hover:bg-base-2 hover:text-fg"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          {!result ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <p
                  className="rounded-md bg-negative-bg px-3 py-2 text-sm text-negative"
                  role="alert"
                >
                  {formError}
                </p>
              )}

              <p className="text-sm text-fg-2">
                Columns: <code className="rounded bg-base-2 px-1 py-0.5 text-xs">content</code>,{" "}
                <code className="rounded bg-base-2 px-1 py-0.5 text-xs">channel</code>,{" "}
                <code className="rounded bg-base-2 px-1 py-0.5 text-xs">customer_label</code>{" "}
                (optional),{" "}
                <code className="rounded bg-base-2 px-1 py-0.5 text-xs">created_at</code>{" "}
                (optional). First row must be the header.
              </p>

              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border px-6 py-8 text-center hover:border-accent">
                <Upload className="h-5 w-5 text-fg-3" aria-hidden="true" />
                <span className="text-sm text-fg-2">
                  {fileName ?? "Click to choose a .csv file"}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                />
              </label>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={close}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSubmitting}>
                  Upload
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex flex-1 items-center gap-3 rounded-md bg-positive-bg px-4 py-3">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-positive" />
                  <div>
                    <p className="text-lg font-semibold text-positive">{result.imported}</p>
                    <p className="text-xs text-positive">imported</p>
                  </div>
                </div>
                <div className="flex flex-1 items-center gap-3 rounded-md bg-negative-bg px-4 py-3">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 text-negative" />
                  <div>
                    <p className="text-lg font-semibold text-negative">{result.failed}</p>
                    <p className="text-xs text-negative">failed</p>
                  </div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-md border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-base-2">
                      <tr>
                        <th className="px-3 py-2 font-medium text-fg-3">Row</th>
                        <th className="px-3 py-2 font-medium text-fg-3">Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {result.errors.map((e) => (
                        <tr key={e.row}>
                          <td className="px-3 py-1.5 font-mono text-fg-2">{e.row}</td>
                          <td className="px-3 py-1.5 text-fg-2">{e.errors.join("; ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end">
                <Button type="button" onClick={close}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
