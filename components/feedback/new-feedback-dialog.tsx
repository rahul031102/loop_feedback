"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CHANNEL_LABELS } from "@/lib/labels";

type FormErrors = Partial<Record<"content" | "channel" | "sourceRef" | "customerLabel", string>>;

export function NewFeedbackDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  function open() {
    setErrors({});
    setFormError(null);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      content: formData.get("content"),
      channel: formData.get("channel"),
      sourceRef: formData.get("sourceRef"),
      customerLabel: formData.get("customerLabel"),
    };

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details) {
          const fieldErrors: FormErrors = {};
          for (const [key, messages] of Object.entries(data.details)) {
            fieldErrors[key as keyof FormErrors] = (messages as string[])[0];
          }
          setErrors(fieldErrors);
        } else {
          setFormError(data.error ?? "Something went wrong. Please try again.");
        }
        return;
      }

      close();
      event.currentTarget.reset();
      router.refresh();
    } catch {
      setFormError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button onClick={open} type="button">
        <Plus className="h-4 w-4" aria-hidden="true" />
        New feedback
      </Button>

      <dialog
        ref={dialogRef}
        className="w-full max-w-lg rounded-lg border border-border p-0 backdrop:bg-black/60"
        onClose={() => setIsSubmitting(false)}
      >
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold text-fg">Add feedback</h2>
            <button
              type="button"
              onClick={close}
              className="rounded-md p-1 text-fg-3 hover:bg-base-2 hover:text-fg"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 px-5 py-4">
            {formError && (
              <p className="rounded-md bg-negative-bg px-3 py-2 text-sm text-negative" role="alert">
                {formError}
              </p>
            )}

            <div>
              <Label htmlFor="content">Feedback content</Label>
              <textarea
                id="content"
                name="content"
                rows={4}
                required
                maxLength={5000}
                placeholder="What did the customer say?"
                className="w-full resize-none rounded-md border border-border bg-base-2 px-3 py-2 text-sm text-fg placeholder:text-fg-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
                aria-invalid={Boolean(errors.content)}
              />
              <FieldError message={errors.content} />
            </div>

            <div>
              <Label htmlFor="channel">Channel</Label>
              <Select id="channel" name="channel" required defaultValue="" error={errors.channel}>
                <option value="" disabled>
                  Select a channel
                </option>
                {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <FieldError message={errors.channel} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerLabel">Customer (optional)</Label>
                <Input id="customerLabel" name="customerLabel" placeholder="Acme Inc." />
              </div>
              <div>
                <Label htmlFor="sourceRef">Reference (optional)</Label>
                <Input id="sourceRef" name="sourceRef" placeholder="TICKET-1042" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Add feedback
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
