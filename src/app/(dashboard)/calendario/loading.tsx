import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <Skeleton className="h-6 w-56 mb-2" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-9 w-40 rounded-control" />
      </div>

      <div className="bg-white rounded-card border border-line p-4 mb-4">
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>

      <div className="bg-white rounded-card border border-line p-4 space-y-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-[10px]" />
        ))}
      </div>
    </div>
  );
}
