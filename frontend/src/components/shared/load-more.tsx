import type { Ref } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

interface LoadMoreProps {
  readonly hasNextPage: boolean
  readonly isFetchingNextPage: boolean
  readonly onLoadMore: () => unknown
  readonly sentinelRef?: Ref<HTMLDivElement>
  readonly loadingLabel?: string
  readonly endMessage?: string
  readonly className?: string
}

export function LoadMore({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  sentinelRef,
  loadingLabel = "Đang tải thêm dữ liệu",
  endMessage,
  className,
}: LoadMoreProps) {
  return (
    <>
      {sentinelRef ? <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" /> : null}
      <div className={cn("mt-6 flex justify-center", className)}>
        {hasNextPage ? (
          <Button variant="outline" onClick={onLoadMore} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? <Spinner aria-label={loadingLabel} /> : null}
            {isFetchingNextPage ? "Đang tải…" : "Tải thêm"}
          </Button>
        ) : endMessage ? (
          <p className="text-center text-sm text-muted-foreground">{endMessage}</p>
        ) : null}
      </div>
    </>
  )
}
