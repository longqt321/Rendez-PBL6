import { Spinner } from "@/components/ui/spinner"

/**
 * Fallback của `Suspense` khi chunk route đang tải (code-split theo route).
 * Giữ layout ổn định: chiều cao giống vùng nội dung, spinner căn giữa.
 */
export function PageLoading() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <Spinner className="size-6 text-muted-foreground" aria-label="Đang tải trang" />
    </div>
  )
}
