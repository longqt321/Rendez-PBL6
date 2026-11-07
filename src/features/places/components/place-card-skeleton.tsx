import { Skeleton } from "@/components/ui/skeleton"

export function PlaceCardSkeleton({ imageHeight = 320 }: { imageHeight?: number }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-[0.25rem] border-2 border-foreground/20 bg-card">
      <Skeleton className="w-full rounded-none" style={{ height: imageHeight }} />
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}
