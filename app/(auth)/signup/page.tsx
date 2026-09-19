import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Create your workspace</h1>
      <p className="mt-1 text-sm text-fg-3">
        You&apos;ll be the workspace admin — invite your team once you&apos;re in.
      </p>

      <div className="mt-7">
        <SignupForm />
      </div>

      <p className="mt-6 text-center text-sm text-fg-3">
        Already have a workspace?{" "}
        <Link href="/login" className="font-medium text-primary hover:text-primary-2">
          Sign in
        </Link>
      </p>
    </div>
  );
}
