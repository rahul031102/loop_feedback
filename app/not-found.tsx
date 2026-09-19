import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-base px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-base-3">
        <SearchX className="h-6 w-6 text-fg-3" aria-hidden="true" />
      </div>
      <div>
        <h1 className="text-lg font-semibold text-fg">Page not found</h1>
        <p className="mt-1 text-sm text-fg-3">
          The page you&apos;re looking for doesn&apos;t exist, or you don&apos;t have access to it.
        </p>
      </div>
      <Link
        href="/inbox"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
      >
        Back to Inbox
      </Link>
    </div>
  );
}
