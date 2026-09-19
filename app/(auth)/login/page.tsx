import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Welcome back</h1>
      <p className="mt-1 text-sm text-fg-3">Sign in to continue to LOOP.</p>

      <div className="mt-7">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>

      <p className="mt-6 text-center text-sm text-fg-3">
        Don&apos;t have a workspace yet?{" "}
        <Link href="/signup" className="font-medium text-primary hover:text-primary-2">
          Create one
        </Link>
      </p>
    </div>
  );
}
