import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-9 w-40 rounded-control" />
      </div>

      <div className="rounded-card border border-line bg-white overflow-hidden">
        <div className="border-b border-line bg-surface/60 p-3">
          <Skeleton className="h-3 w-full max-w-sm" />
        </div>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-line/60 last:border-0">
            <Skeleton className="h-4 w-1/5" />
            {Array.from({ length: 5 }).map((_, j) => (
              <Skeleton key={j} className="h-6 w-6 rounded-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
