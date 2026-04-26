interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = "", style }: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer rounded-[6px] ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] p-5 flex flex-col gap-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-20 mt-1" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

export function StatCardGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-0">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-5 py-[13px] border-b border-[var(--border)]"
        >
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-5 w-16 rounded-[6px]" />
          <Skeleton className="h-5 w-14 rounded-[6px]" />
        </div>
      ))}
    </div>
  );
}

export function TranscriptCardSkeleton() {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] p-5 flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <Skeleton className="h-3 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-14 rounded-[6px]" />
          <Skeleton className="h-3 w-10" />
        </div>
      </div>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}
