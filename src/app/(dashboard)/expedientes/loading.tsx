import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div>
      <div className="mb-4">
        <Skeleton className="h-6 w-36 mb-2" />
        <Skeleton className="h-4 w-28" />
      </div>

      <Skeleton className="h-10 w-full max-w-lg mb-4 rounded-control" />

      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-card border border-line p-4 flex items-center gap-4">
            <Skeleton className="h-4 w-1/5" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-1/6" />
          </div>
        ))}
      </div>
    </div>
  );
}
