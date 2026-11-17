import { html } from "hono/html"
import { env } from "../env"
import type { PlaceDto } from "./places"
import type { PostDto } from "./posts"

const DEFAULT_TITLE = "Rendez — Ăn gì hôm nay ở Đà Nẵng?"
const DEFAULT_DESCRIPTION =
  "Khám phá, lưu và chia sẻ địa điểm ăn uống ở Đà Nẵng cùng bạn bè — bản đồ, phòng đi ăn và bỏ phiếu chọn quán."

const FALLBACK_IMAGE = "/og-image.png"

const MAX_DESCRIPTION_LENGTH = 160

export interface OgMeta {
  title: string
  description: string

  path: string

  image: string | null
  type: "website" | "article"

  version: number
}

export function notFoundOgMeta(path: string): OgMeta {
  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    path,
    image: null,
    type: "website",
    version: Math.floor(Date.now() / 1000),
  }
}

export function truncateDescription(text: string, max = MAX_DESCRIPTION_LENGTH): string {
  if (text.length <= max) return text

  let cut = text.slice(0, max)
  // Ký tự cuối là nửa đầu của cặp surrogate → bỏ để không đứt emoji.
  const lastCode = cut.codePointAt(cut.length - 1) ?? 0
  if (lastCode >= 0xd800 && lastCode <= 0xdbff) cut = cut.slice(0, -1)

  const lastSpace = cut.lastIndexOf(" ")
  if (lastSpace > 0) cut = cut.slice(0, lastSpace)

  return `${cut}…`
}

/**
 * Whitelist scheme ảnh: `https://`, `APP_ORIGIN` (cho phép http ở dev), hoặc
 * đường dẫn nội bộ bắt đầu bằng `/`. Mọi scheme khác (`javascript:`, `data:`…)
 * trả `null` để rơi về ảnh mặc định.
 */
export function safeImageUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  if (raw.startsWith("/")) return raw
  if (raw.startsWith("https://")) return raw
  // So khớp prefix chặt: `APP_ORIGIN` đúng nguyên vẹn hoặc kèm `/` ngay sau.
  // Dùng `startsWith(APP_ORIGIN)` thô sẽ cho phép `http://localhost:5173.evil.com/x.png`.
  if (raw === env.APP_ORIGIN || raw.startsWith(`${env.APP_ORIGIN}/`)) return raw
  return null
}

/** Tuyệt đối hoá ảnh theo `APP_ORIGIN` rồi gắn `?v=<epoch>` để bust cache preview. */
export function absoluteImageUrl(raw: string | null | undefined, version: number): string {
  const url = safeImageUrl(raw) ?? FALLBACK_IMAGE
  const absolute = url.startsWith("/") ? `${env.APP_ORIGIN}${url}` : url
  const separator = absolute.includes("?") ? "&" : "?"
  return `${absolute}${separator}v=${version}`
}

/** Meta cho trang quán: tên quán + địa chỉ (kèm điểm nếu có đánh giá). */
export function placeOgMeta(place: PlaceDto, version: number): OgMeta {
  const address = [place.address, place.district, place.city].filter(Boolean).join(", ")
  const rating = place.reviewCount > 0 ? ` (rating ★ ${place.rating.toFixed(1)})` : ""

  return {
    title: place.name,
    description: address.length > 0 ? `${address}${rating}` : DEFAULT_DESCRIPTION,
    path: `/discover/${place.id}`,
    image: place.imageUrl ?? null,
    type: "website",
    version,
  }
}

/**
 * Meta cho bài đăng: ưu tiên địa điểm (nếu có), ảnh đầu tiên của bài → ảnh
 * địa điểm → ảnh mặc định. `version` là epoch `createdAt` của bài.
 */
export function postOgMeta(post: PostDto, version: number): OgMeta {
  const caption = post.caption.trim()

  return {
    title: post.place ? `Bài viết tại ${post.place.name}` : `${post.author.name} kiểm tra quán`,
    description: caption.length > 0 ? truncateDescription(caption) : "Xem bài viết trên Rendez",
    path: `/post/${post.id}`,
    image: post.images[0] ?? post.place?.imageUrl ?? null,
    type: "article",
    version,
  }
}

/** HTML chỉ gồm bộ thẻ meta — không nhúng bundle JS (xem tài liệu thiết kế). */
export async function renderOgHtml(meta: OgMeta): Promise<string> {
  const url = `${env.APP_ORIGIN}${meta.path}`
  const image = absoluteImageUrl(meta.image, meta.version)

  // `html` trả `HtmlEscapedString` (đối tượng String có cờ `isEscaped`) — ép về
  // primitive string để nơi dùng so sánh/nối chuỗi không bị lệch kiểu.
  const rendered = await html`<!doctype html>
    <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${meta.title}</title>
        <meta name="description" content="${meta.description}" />
        <meta property="og:site_name" content="Rendez" />
        <meta property="og:type" content="${meta.type}" />
        <meta property="og:title" content="${meta.title}" />
        <meta property="og:description" content="${meta.description}" />
        <meta property="og:url" content="${url}" />
        <meta property="og:image" content="${image}" />
        <meta property="og:locale" content="vi_VN" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${meta.title}" />
        <meta name="twitter:description" content="${meta.description}" />
        <meta name="twitter:image" content="${image}" />
        <link rel="canonical" href="${url}" />
      </head>
      <body>
        <div id="root"></div>
      </body>
    </html>`

  return String(rendered)
}
