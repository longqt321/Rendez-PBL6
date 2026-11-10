import type { PlaceCategory } from "@/features/places/types/place"

/**
 * Ảnh minh hoạ hệ thống cho địa điểm chưa có ảnh thật (quyết định D-050).
 *
 * Vẽ bằng SVG inline để tự đổi màu theo theme (sáng/tối) và không cần tải file.
 * Nguyên tắc:
 * - **Mỗi loại quán một hình riêng**, nhưng mọi quán cùng loại dùng chung một
 *   hình — không sinh theo từng quán (tránh cảm giác đây là ảnh thật).
 * - Nét mảnh, màu trầm (`currentColor` + opacity thấp) để lùi lại sau ảnh thật.
 * - Không chứa tên quán, không chứa chữ — nhãn "Ảnh minh hoạ" do `CoverImage`
 *   vẽ đè lên, một chỗ duy nhất.
 */

const STROKE = 2.2

/**
 * Khung chung cho mọi hình.
 *
 * `preserveAspectRatio="xMidYMid meet"` để hình **không bị cắt** khi khung cha
 * rộng/thấp bất kỳ; phần thừa hai bên lộ nền `bg-muted` của khung cha (cùng màu
 * với nền hình nên liền mạch).
 */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 120 120"
      role="presentation"
      aria-hidden="true"
      className="size-full text-muted-foreground"
      preserveAspectRatio="xMidYMid meet"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      >
        {children}
      </g>
    </svg>
  )
}

/** Quán cà phê — tách cà phê trên bàn, ghế và chậu cây nhỏ. */
function Cafe() {
  return (
    <Frame>
      {/* mặt bàn */}
      <path d="M18 86h84" opacity="0.7" />
      {/* tách + đĩa lót */}
      <path d="M44 62h30v10a15 15 0 0 1-30 0z" />
      <path d="M74 64h6a7 7 0 0 1 0 14h-6" />
      <ellipse cx="59" cy="84" rx="22" ry="3.5" />
      {/* hơi nước */}
      <path d="M52 54c3-4 0-7 3-11M64 54c3-4 0-7 3-11" opacity="0.55" />
      {/* ghế */}
      <path d="M24 86v14M24 92h14M38 86v14" opacity="0.7" />
      {/* chậu cây */}
      <path d="M92 86v-8h12v8" opacity="0.7" />
      <path d="M98 78c-4-4-4-9 0-13 4 4 4 9 0 13z" opacity="0.7" />
    </Frame>
  )
}

/** Quán ăn — bát cơm với đũa và hơi nóng. */
function Restaurant() {
  return (
    <Frame>
      <path d="M18 84h84" opacity="0.7" />
      {/* bát */}
      <path d="M38 66h44a22 22 0 0 1-44 0z" />
      <path d="M34 66h52" />
      {/* cơm trong bát */}
      <path d="M44 66c4-8 24-8 28 0" opacity="0.6" />
      {/* hơi nóng */}
      <path d="M54 54c3-5-1-8 2-13M66 54c3-5-1-8 2-13" opacity="0.5" />
      {/* đũa */}
      <path d="M78 40l16 24M84 38l16 24" opacity="0.65" />
    </Frame>
  )
}

/** Ăn vặt — xe hàng rong có dù che và ghế nhựa. */
function StreetFood() {
  return (
    <Frame>
      <path d="M16 92h88" opacity="0.7" />
      {/* thân xe */}
      <path d="M34 62h48v22H34z" />
      <path d="M34 70h48" opacity="0.6" />
      {/* dù */}
      <path d="M28 46h60" />
      <path d="M28 46c6-12 54-12 60 0" opacity="0.7" />
      <path d="M58 34v-6" opacity="0.7" />
      {/* bánh xe */}
      <circle cx="44" cy="88" r="5" />
      <circle cx="72" cy="88" r="5" />
      {/* ghế nhựa */}
      <path d="M92 92v-14h12" opacity="0.7" />
    </Frame>
  )
}

/** Tiệm bánh — kệ bánh với ổ bánh mì và mái hiên. */
function Bakery() {
  return (
    <Frame>
      {/* mái hiên */}
      <path d="M22 40h76" />
      <path d="M22 40l10-10h56l10 10" opacity="0.7" />
      {/* kệ */}
      <path d="M26 74h68M26 92h68" opacity="0.7" />
      {/* bánh mì */}
      <path d="M38 74c0-10 6-16 15-16s15 6 15 16" />
      <path d="M46 62l4 6M56 60l4 7" opacity="0.5" />
      {/* ổ bánh tròn */}
      <ellipse cx="80" cy="68" rx="12" ry="8" />
      <path d="M74 66l4 3M82 65l4 3" opacity="0.5" />
      {/* khay dưới */}
      <path d="M40 92v-6h44v6" opacity="0.6" />
    </Frame>
  )
}

/** Tráng miệng — ly chè nhiều tầng với thìa. */
function Dessert() {
  return (
    <Frame>
      <path d="M18 92h84" opacity="0.7" />
      {/* ly */}
      <path d="M42 44h36l-5 40a8 8 0 0 1-8 7H55a8 8 0 0 1-8-7z" />
      {/* tầng chè */}
      <path d="M45 58h30M47 70h26" opacity="0.6" />
      {/* kem trên miệng ly */}
      <path d="M48 44c0-8 6-12 12-12s12 4 12 12" opacity="0.75" />
      {/* thìa */}
      <path d="M84 40l-8 30" opacity="0.65" />
      <ellipse cx="85" cy="37" rx="4" ry="6" opacity="0.65" />
    </Frame>
  )
}

/** Quán bar — quầy bar, chai ly và đèn treo. */
function Bar() {
  return (
    <Frame>
      {/* đèn treo */}
      <path d="M40 18v10M80 18v10" opacity="0.6" />
      <path d="M32 28h16l-4 8H36zM72 28h16l-4 8H76z" opacity="0.75" />
      {/* quầy */}
      <path d="M18 78h84" />
      <path d="M26 78v22M94 78v22" opacity="0.6" />
      {/* chai */}
      <path d="M44 78V60h6v18" opacity="0.75" />
      <path d="M45.5 60v-8h3v8" opacity="0.6" />
      {/* ly cocktail */}
      <path d="M62 62h16l-8 10z" opacity="0.75" />
      <path d="M70 72v6M65 78h10" opacity="0.6" />
      {/* ly thấp */}
      <path d="M84 68h10v10H84z" opacity="0.7" />
    </Frame>
  )
}

const ILLUSTRATIONS: Record<PlaceCategory, () => React.ReactElement> = {
  cafe: Cafe,
  restaurant: Restaurant,
  "street-food": StreetFood,
  bakery: Bakery,
  dessert: Dessert,
  bar: Bar,
}

interface PlacePlaceholderProps {
  category: PlaceCategory
  /**
   * Mô tả cho trình đọc màn hình. Có nhãn thì SVG được công bố như một ảnh
   * (`role="img"`); không có thì coi là trang trí.
   */
  label?: string
}

export function PlacePlaceholder({ category, label }: PlacePlaceholderProps) {
  const Illustration = ILLUSTRATIONS[category]

  if (!label) return <Illustration />

  return (
    <div role="img" aria-label={label} className="size-full">
      <Illustration />
    </div>
  )
}
