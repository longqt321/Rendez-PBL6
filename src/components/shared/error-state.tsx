import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

interface ErrorStateProps {
  /** Tiêu đề ngắn nêu rõ thứ không tải được ("Không tải được bài đăng"). */
  title: string
  /** Mô tả thêm — mặc định nhắc kiểm tra kết nối. */
  description?: string
  /** Có truyền thì hiện nút thử lại; không truyền thì chỉ hiện thông báo (vd 404). */
  onRetry?: () => void
  retryLabel?: string
  /** Cỡ nút — `sm` cho khối lỗi nằm trong tab/khu vực hẹp. */
  size?: "sm" | "default"
  /** Icon minh hoạ (lucide) đặt phía trên tiêu đề. */
  icon?: ReactNode
  /** `bordered` cho khối lỗi đứng riêng; `plain` khi nằm trong tab. */
  variant?: "bordered" | "plain"
  className?: string
  /** Thay cho nút thử lại khi cần hành động khác (vd link về trang trước). */
  children?: ReactNode
}

/**
 * Khối trạng thái lỗi tải dữ liệu — dùng chung cho mọi trang.
 *
 * Trước đây khối `Empty + "Kiểm tra kết nối rồi thử lại." + nút "Thử lại"` bị
 * copy ở 13 vị trí; nay chỉ còn một chỗ định nghĩa.
 */
export function ErrorState({
  title,
  description = "Kiểm tra kết nối rồi thử lại.",
  onRetry,
  retryLabel = "Thử lại",
  size,
  icon,
  variant = "bordered",
  className,
  children,
}: ErrorStateProps) {
  return (
    <Empty
      className={cn(variant === "bordered" && "border border-dashed border-border", className)}
    >
      <EmptyHeader>
        {icon ? <EmptyMedia variant="icon">{icon}</EmptyMedia> : null}
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {children ??
        (onRetry ? (
          <Button variant="outline" size={size} onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null)}
    </Empty>
  )
}
