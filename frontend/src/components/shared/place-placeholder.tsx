import type { PlaceCategory } from "@/features/places/types/place"

/**
 * Placeholder tối giản cho địa điểm chưa có ảnh thật (quyết định D-050).
 *
 * Thay cho bộ ảnh minh hoạ theo nhóm loại hình: nền gradient trầm (token
 * theme, tự đổi theo sáng/tối), chữ cái đầu tên quán cỡ lớn và tên quán —
 * gọn, không tải file, không gây cảm giác đây là ảnh thật.
 */

interface PlacePlaceholderProps {
  /** Loại địa điểm — chỉ dùng cho nhãn đọc màn hình khi không có tên. */
  category?: PlaceCategory
  /**
   * Tên địa điểm — hiện chữ cái đầu + tên. Bỏ trống (ví dụ ảnh bìa hồ sơ)
   * thì chỉ hiện nền gradient.
   */
  name?: string
  /**
   * Mô tả cho trình đọc màn hình. Có nhãn (hoặc có tên) thì khung được công bố
   * như một ảnh (`role="img"`); không có thì coi là trang trí.
   */
  label?: string
}

export function PlacePlaceholder({ category, name, label }: PlacePlaceholderProps) {
  const initial = name?.trim().charAt(0).toUpperCase() ?? ""

  const content = (
    <div
      aria-hidden="true"
      className="flex size-full flex-col items-center justify-center gap-1.5 bg-linear-to-br from-muted to-secondary/70 px-3 text-center"
    >
      {initial ? (
        <span className="text-2xl font-semibold tracking-tight text-muted-foreground/70">
          {initial}
        </span>
      ) : null}
      {name ? (
        <span className="line-clamp-2 text-xs font-medium text-muted-foreground">{name}</span>
      ) : null}
    </div>
  )

  const describedAs = label ?? name ?? category

  if (describedAs === undefined) return content

  return (
    <div role="img" aria-label={describedAs} className="size-full">
      {content}
    </div>
  )
}
