import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-6 w-64 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="bg-white rounded-card border border-line border-dashed p-12 max-w-3xl flex flex-col items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-9 w-32 rounded-control" />
      </div>
    </div>
  );
}
