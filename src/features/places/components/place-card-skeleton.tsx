import { Skeleton } from "@/components/ui/skeleton"

export function PlaceCardSkeleton({ imageHeight = 320 }: { imageHeight?: number }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-md border border-border/20 bg-card">
      <Skeleton className="w-full rounded-none" style={{ height: imageHeight }} />
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-1/2" />
      </div>
    </div>
  )
}
