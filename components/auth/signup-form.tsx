"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Building2, User, Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";

type FormErrors = Partial<Record<"name" | "email" | "password" | "workspaceName", string>>;

export function SignupForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrors({});
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      workspaceName: formData.get("workspaceName"),
    };

    let response: Response;
    try {
      response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      setFormError("Couldn't reach the server. Check your connection and try again.");
      setIsSubmitting(false);
      return;
    }

    // The server always returns JSON (see app/api/auth/signup/route.ts), but
    // parsing defensively means a proxy/hosting error page or a dropped
    // connection produces a clean message instead of an uncaught
    // "Unexpected end of JSON input".
    let data: Record<string, unknown> | null = null;
    try {
      data = await response.json();
    } catch {
      setFormError(
        response.ok
          ? "Something went wrong. Please try again."
          : `Something went wrong (${response.status}). Please try again.`
      );
      setIsSubmitting(false);
      return;
    }

    if (!response.ok) {
      if (data?.details) {
        const fieldErrors: FormErrors = {};
        for (const [key, messages] of Object.entries(data.details as Record<string, string[]>)) {
          fieldErrors[key as keyof FormErrors] = messages[0];
        }
        setErrors(fieldErrors);
      } else {
        setFormError((data?.error as string) ?? "Something went wrong. Please try again.");
      }
      setIsSubmitting(false);
      return;
    }

    // Account created - sign in immediately so C1's "then log in
    // securely" flows into a single motion rather than a second screen.
    try {
      const signInResult = await signIn("credentials", {
        email: payload.email,
        password: payload.password,
        rememberMe: "true",
        redirect: false,
      });

      if (signInResult?.error) {
        setFormError("Account created, but automatic sign-in failed. Please sign in manually.");
        router.push("/login");
        return;
      }

      router.push("/inbox");
      router.refresh();
    } catch {
      setFormError("Account created, but automatic sign-in failed. Please sign in manually.");
      router.push("/login");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formError && (
        <p
          className="flex items-start gap-2 rounded-lg border border-negative/25 bg-negative-bg px-3 py-2.5 text-sm text-negative"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          {formError}
        </p>
      )}

      <div>
        <Label htmlFor="workspaceName">Workspace name</Label>
        <Input
          id="workspaceName"
          name="workspaceName"
          required
          placeholder="Acme Inc."
          error={errors.workspaceName}
          icon={<Building2 className="h-4 w-4" aria-hidden="true" />}
        />
        <FieldError message={errors.workspaceName} />
      </div>

      <div>
        <Label htmlFor="name">Your name</Label>
        <Input
          id="name"
          name="name"
          required
          placeholder="Jordan Lee"
          error={errors.name}
          icon={<User className="h-4 w-4" aria-hidden="true" />}
        />
        <FieldError message={errors.name} />
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
          error={errors.email}
          icon={<Mail className="h-4 w-4" aria-hidden="true" />}
        />
        <FieldError message={errors.email} />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            className="pr-10"
            error={errors.password}
            icon={<Lock className="h-4 w-4" aria-hidden="true" />}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-3 transition-colors hover:text-fg-2"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <FieldError message={errors.password} />
        {!errors.password && <p className="mt-1.5 text-xs text-fg-3">At least 8 characters.</p>}
      </div>

      <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
        Create workspace
      </Button>
    </form>
  );
}
