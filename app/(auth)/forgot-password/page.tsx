import Link from "next/link";
import { ShieldQuestion } from "lucide-react";

export const metadata = {
  title: "Reset your password — LOOP",
};

/**
 * Honest placeholder rather than a fake "check your email" flow: LOOP has
 * no email/SMTP infrastructure configured (see README - invites and
 * temporary passwords are shared out of band by an admin, same as
 * Section 4.2's own scope note), so there's nothing to actually send yet.
 * This tells people the real, current path to regain access instead of
 * pretending a reset email went out.
 */
export default function ForgotPasswordPage() {
  return (
    <div>
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary">
        <ShieldQuestion className="h-5 w-5" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Reset your password</h1>
      <p className="mt-3 text-sm leading-relaxed text-fg-2">
        LOOP doesn&apos;t send password-reset emails yet — there&apos;s no email service configured
        for this workspace. For now, the fastest way back in is to ask your workspace&apos;s admin:
        they can see your account under{" "}
        <span className="font-medium text-fg">Settings → Members</span>, and re-provision your
        access with a new temporary password.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-fg-2">
        If you&apos;re the only admin and you&apos;re locked out, whoever manages the
        workspace&apos;s database can reset it for you directly.
      </p>

      <Link
        href="/login"
        className="mt-6 inline-flex text-sm font-medium text-primary hover:text-primary-2"
      >
        ← Back to sign in
      </Link>
    </div>
  );
}
