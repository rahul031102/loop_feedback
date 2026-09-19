"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ROLE_LABELS } from "@/lib/labels";

type FormErrors = Partial<Record<"name" | "email" | "password" | "role", string>>;

export function AddMemberDialog() {
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
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      role: formData.get("role"),
    };

    try {
      const response = await fetch("/api/workspace/members", {
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
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        Add member
      </Button>

      <dialog
        ref={dialogRef}
        className="w-full max-w-md rounded-lg border border-border p-0 backdrop:bg-black/60"
        onClose={() => setIsSubmitting(false)}
      >
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold text-fg">Add a teammate</h2>
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
            <p className="rounded-md bg-accent-50 px-3 py-2 text-sm text-accent">
              LOOP doesn&apos;t send invite emails. Set a temporary password here and share it with
              your teammate directly - they can change it after signing in.
            </p>

            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" name="name" required placeholder="Jordan Lee" error={errors.name} />
              <FieldError message={errors.name} />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="jordan@company.com"
                error={errors.email}
              />
              <FieldError message={errors.email} />
            </div>

            <div>
              <Label htmlFor="password">Temporary password</Label>
              <Input
                id="password"
                name="password"
                type="text"
                required
                minLength={8}
                placeholder="At least 8 characters"
                error={errors.password}
              />
              <FieldError message={errors.password} />
            </div>

            <div>
              <Label htmlFor="role">Role</Label>
              <Select id="role" name="role" required defaultValue="ANALYST" error={errors.role}>
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <FieldError message={errors.role} />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Add member
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
