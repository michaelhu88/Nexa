export function ProjectSkeleton() {
  return (
    <div className="bg-nexa-elements-background-depth-2 rounded-xl border border-nexa-elements-borderColor animate-pulse">
      {/* Thumbnail skeleton */}
      <div className="h-32 bg-nexa-elements-background-depth-1 rounded-t-xl" />

      {/* Content skeleton */}
      <div className="p-4">
        {/* Title */}
        <div className="h-5 bg-nexa-elements-background-depth-1 rounded mb-2" />

        {/* Description */}
        <div className="space-y-2 mb-3">
          <div className="h-3 bg-nexa-elements-background-depth-1 rounded" />
          <div className="h-3 bg-nexa-elements-background-depth-1 rounded w-3/4" />
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between">
          <div className="h-3 bg-nexa-elements-background-depth-1 rounded w-20" />
          <div className="h-3 bg-nexa-elements-background-depth-1 rounded w-16" />
        </div>
      </div>
    </div>
  );
}
