import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Skeleton className="h-6 w-28" />
          <Skeleton className="mt-2 h-4 w-36" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="divide-y divide-border rounded-lg border border-border bg-base-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-1.5 h-3 w-52" />
            </div>
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}
