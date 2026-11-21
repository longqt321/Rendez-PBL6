import type { PlaceCategory } from "@/features/places/types/place"
import { CATEGORY_META } from "@/features/places/lib/category-meta"

interface PlacePlaceholderProps {
  category?: PlaceCategory
  name?: string
  label?: string
}

/**
 * Băm chuỗi thành số nguyên 32 bit ổn định (FNV-1a).
 * Tạo biến thể màu sắc & đường nét riêng cho từng địa điểm.
 */
function hashString(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.codePointAt(index) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function layoutFromSeed(seed: string) {
  const hash = hashString(seed)
  return {
    angle: 115 + (hash % 55),
    hue: (hash % 24) - 12,
    lift: (hash >> 24) % 10,
    circleX: 62 + ((hash >> 5) % 30),
    circleY: 12 + ((hash >> 11) % 32),
  }
}

/**
 * Poster nghệ thuật thay thế cho địa điểm chưa có ảnh thật ("Danang Culinary Stamp").
 * Thay cho khối xám đơn điệu: kết hợp sắc độ hạng mục, họa tiết tọa độ bản đồ Đà Nẵng,
 * biểu tượng vector và tên quán bằng font Display.
 */
export function PlacePlaceholder({ category, name, label }: Readonly<PlacePlaceholderProps>) {
  const meta = category ? CATEGORY_META[category] : undefined
  const seed = name?.trim() || label || category || "rendez"
  const layout = layoutFromSeed(seed)
  const describedAs = label ?? name ?? meta?.label ?? category

  const content = (
    <div
      aria-hidden="true"
      className="@container relative size-full overflow-hidden bg-muted"
      style={{ "--pc": meta?.color ?? "var(--primary)" } as React.CSSProperties}
    >
      <div
        className="absolute inset-0"
        style={{
          filter: `hue-rotate(${layout.hue}deg) saturate(0.95) brightness(${1 + layout.lift / 100})`,
          background: `linear-gradient(${layout.angle}deg, color-mix(in oklab, var(--pc) 82%, var(--foreground)), color-mix(in oklab, var(--pc) 48%, var(--foreground)) 65%, color-mix(in oklab, var(--pc) 32%, var(--background)))`,
        }}
      />

      {/* Họa tiết lưới tọa độ bản đồ & vòng tròn trang trí chìm */}
      <svg
        viewBox="0 0 320 200"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 size-full opacity-20"
      >
        <path
          d="M0 150 Q 90 120, 175 155 T 320 130"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          className="text-primary-foreground"
        />
        <path
          d="M0 175 Q 110 140, 210 170 T 320 155"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.9"
          strokeDasharray="4 4"
          className="text-primary-foreground"
        />
      </svg>

      <div
        className="pointer-events-none absolute size-[64%] rounded-full border border-current opacity-20"
        style={{
          left: `${layout.circleX}%`,
          top: `${layout.circleY}%`,
          color: "var(--primary-foreground)",
        }}
      />

      {/* Khung tem nhãn trung tâm */}
      <div className="relative flex size-full flex-col items-center justify-center gap-1.5 px-4 text-center text-primary-foreground">
        {meta ? (
          <div className="grid size-11 place-items-center rounded-full border border-current/30 bg-background/15 backdrop-blur-xs @max-[110px]:size-7">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5 @max-[110px]:size-3.5"
              dangerouslySetInnerHTML={{ __html: meta.icon }}
            />
          </div>
        ) : null}

        {name ? (
          <span className="line-clamp-2 max-w-[92%] font-display text-sm leading-snug font-semibold tracking-tight drop-shadow-xs @max-[110px]:hidden">
            {name}
          </span>
        ) : null}

        {meta ? (
          <span className="text-xs font-medium tracking-wider uppercase opacity-80 @max-[140px]:hidden">
            {meta.label} · Đà Nẵng
          </span>
        ) : null}
      </div>
    </div>
  )

  if (!describedAs) return content

  return (
    <div role="img" aria-label={describedAs} className="size-full">
      {content}
    </div>
  )
}
