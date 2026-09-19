import { requireAuth } from "@/lib/rbac";
import { AskLoopPanel } from "@/components/ask/ask-loop-panel";

export const dynamic = "force-dynamic";

export default async function AskPage() {
  await requireAuth();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-fg">Ask LOOP</h1>
        <p className="mt-1 text-sm text-fg-3">
          Ask a plain-English question - answers are grounded in your actual feedback, with the
          specific items cited so you can verify them.
        </p>
      </div>

      <AskLoopPanel />
    </div>
  );
}
