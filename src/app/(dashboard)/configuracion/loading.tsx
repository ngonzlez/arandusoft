import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-6 w-36 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="flex gap-1 border-b border-line mb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-32 mb-1" />
        ))}
      </div>

      <div className="bg-white rounded-card border border-line p-6 space-y-4 max-w-2xl">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full rounded-control" />
          </div>
        ))}
      </div>
    </div>
  );
}
