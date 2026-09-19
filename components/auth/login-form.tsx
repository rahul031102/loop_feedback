"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/inbox";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return; // guards against double-submit on a slow network
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        rememberMe: formData.get("rememberMe") ? "true" : "false",
        redirect: false,
      });

      if (result?.error) {
        setError("That email and password combination doesn't match our records.");
        setIsSubmitting(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p
          className="flex items-start gap-2 rounded-lg border border-negative/25 bg-negative-bg px-3 py-2.5 text-sm text-negative"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          icon={<Mail className="h-4 w-4" aria-hidden="true" />}
          placeholder="you@company.com"
        />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="pr-10"
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
      </div>

      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-fg-2">
          <input
            type="checkbox"
            name="rememberMe"
            className="h-4 w-4 rounded border-border bg-base-2 text-primary accent-primary focus:ring-primary/40"
          />
          Remember me
        </label>
        <a
          href="/forgot-password"
          className="text-sm font-medium text-primary hover:text-primary-2"
        >
          Forgot password?
        </a>
      </div>

      <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
        Sign in
      </Button>
    </form>
  );
}
