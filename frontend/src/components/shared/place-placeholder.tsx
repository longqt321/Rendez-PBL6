import type { PlaceCategory } from "@/features/places/types/place"
import { CATEGORY_META } from "@/features/places/lib/category-meta"

interface PlacePlaceholderProps {
  category?: PlaceCategory

  name?: string

  label?: string
}

/**
 * Băm chuỗi thành số nguyên 32 bit ổn định (FNV-1a).
 * Dùng để mỗi địa điểm có một bố cục riêng nhưng không đổi giữa các lần render.
 */
function hashString(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** Lấy các tham số bố cục từ tên địa điểm: góc gradient, vị trí hai mảng màu, độ lệch tông. */
function layoutFromSeed(seed: string) {
  const hash = hashString(seed)
  return {
    angle: 100 + (hash % 80),
    // Lệch tông trong khoảng ±14° để hai quán cùng hạng mục không trùng màu.
    hue: (hash % 29) - 14,
    // Lệch độ sáng ±7% tạo khác biệt về sắc độ.
    lift: (hash >> 26) % 15,
    blobAX: 12 + ((hash >> 3) % 60),
    blobAY: 8 + ((hash >> 9) % 45),
    blobBX: 40 + ((hash >> 15) % 55),
    blobBY: 45 + ((hash >> 21) % 50),
    ringX: 55 + ((hash >> 5) % 40),
    ringY: 10 + ((hash >> 11) % 40),
  }
}

/**
 * Ảnh thay thế cho địa điểm chưa có ảnh thật.
 *
 * Thay vì một gradient trơn, khối này dựng một "thẻ hạng mục": biểu tượng loại hình,
 * tên địa điểm và nhãn hạng mục. Bố cục (góc gradient, vị trí mảng màu) sinh từ tên
 * địa điểm nên hai quán cùng hạng mục vẫn khác nhau về thị giác.
 */
export function PlacePlaceholder({ category, name, label }: PlacePlaceholderProps) {
  const meta = category ? CATEGORY_META[category] : undefined
  const seed = name?.trim() || label || category || "rendez"
  const layout = layoutFromSeed(seed)

  const describedAs = label ?? name ?? meta?.label ?? category

  const content = (
    <div
      aria-hidden="true"
      className="@container relative size-full overflow-hidden bg-muted"
      style={{ "--pc": meta?.color ?? "var(--muted-foreground)" } as React.CSSProperties}
    >
      {/* Lớp trang trí: gradient chéo + hai mảng màu + vòng tròn, vị trí lấy từ seed. */}
      <div
        className="absolute inset-0"
        style={{
          filter: `hue-rotate(${layout.hue}deg) saturate(1.15) brightness(${(1 + layout.lift / 100).toFixed(2)})`,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(${layout.angle}deg, color-mix(in oklab, var(--pc) 92%, #0a0c10), color-mix(in oklab, var(--pc) 44%, #0a0c10) 74%)`,
          }}
        />
        <div
          className="absolute size-[70%] rounded-full blur-2xl"
          style={{
            left: `${layout.blobAX}%`,
            top: `${layout.blobAY}%`,
            background: `radial-gradient(circle, color-mix(in oklab, var(--pc) 70%, transparent), transparent 70%)`,
          }}
        />
        <div
          className="absolute size-[45%] rounded-full blur-xl"
          style={{
            left: `${layout.blobBX}%`,
            top: `${layout.blobBY}%`,
            background: `radial-gradient(circle, color-mix(in oklab, var(--pc) 55%, transparent), transparent 70%)`,
          }}
        />
        {/* Vòng tròn mảnh tạo nhịp thị giác khác nhau giữa các quán cùng hạng mục. */}
        <div
          className="absolute size-[58%] rounded-full border border-current opacity-25"
          style={{ left: `${layout.ringX}%`, top: `${layout.ringY}%`, color: "var(--pc)" }}
        />
      </div>

      {/* Nội dung: biểu tượng hạng mục + tên + nhãn. Ẩn chữ khi khung quá nhỏ (popup bản đồ). */}
      <div className="relative flex size-full flex-col items-center justify-center gap-1 px-3 text-center">
        {meta ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-[26%] max-h-10 min-h-5 max-w-10 text-white/70"
            dangerouslySetInnerHTML={{ __html: meta.icon }}
          />
        ) : null}
        {name ? (
          <span className="line-clamp-2 max-w-[92%] text-[0.8rem] leading-tight font-semibold text-white @max-[110px]:hidden">
            {name}
          </span>
        ) : null}
        {meta ? (
          <span className="text-[0.6rem] font-medium tracking-wider text-white/60 uppercase @max-[110px]:hidden">
            {meta.label}
          </span>
        ) : null}
      </div>
    </div>
  )

  if (describedAs === undefined) return content

  return (
    <div role="img" aria-label={describedAs} className="size-full">
      {content}
    </div>
  )
}
