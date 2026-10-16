import { Skeleton } from "@/components/ui/skeleton";

export function CardSkeleton() {
  return (
    <div className="w-44 shrink-0 sm:w-52" aria-hidden="true">
      <Skeleton className="aspect-video w-full rounded-lg" />
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="mt-1.5 h-3 w-2/3" />
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="mt-8 space-y-3">
      <Skeleton className="h-6 w-40" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function HeroSkeleton() {
  return <Skeleton className="aspect-[16/11] w-full rounded-2xl sm:aspect-[21/9]" aria-hidden="true" />;
}

export function GridSkeleton({ count = 12 }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <Skeleton className="aspect-video w-full rounded-lg" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-1.5 h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}