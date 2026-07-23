import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <Skeleton className="h-6 w-28 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-9 w-36 rounded-control" />
      </div>

      <Skeleton className="h-10 w-full max-w-md mb-4 rounded-control" />

      <div className="rounded-card border border-line bg-white overflow-hidden">
        <div className="border-b border-line bg-surface/60 p-3">
          <Skeleton className="h-3 w-full max-w-xs" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-6 p-4 border-b border-line/60 last:border-0">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-1/6" />
          </div>
        ))}
      </div>
    </div>
  );
}
