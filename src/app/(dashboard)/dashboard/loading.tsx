import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-6 w-40 mb-2" />
        <Skeleton className="h-4 w-56" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-card border border-line p-5 space-y-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-7 w-1/2" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-card border border-line p-6 space-y-2.5">
            <Skeleton className="h-4 w-1/3 mb-2" />
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-10 w-full rounded-[10px]" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
