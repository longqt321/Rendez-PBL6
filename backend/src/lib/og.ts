import { html } from "hono/html"
import { env } from "../env"
import type { PlaceDto } from "./places"
import type { PostDto } from "./posts"

/**
 * Dựng HTML meta Open Graph cho bot preview (Facebook/Zalo/Messenger…).
 *
 * nginx sniff User-Agent rồi proxy 2 route `/discover/:id`, `/post/:id` sang
 * API; người dùng thường vẫn nhận SPA tĩnh như cũ. Meta trả cho bot là ĐÚNG nội
 * dung thật của trang (tên quán, caption, ảnh thật) — không phải cloaking.
 *
 * Escape HTML: dùng tagged template `html` của `hono/html` cho MỌI giá trị nội
 * suy từ DB — không nối chuỗi, không `raw()`. Ảnh phải qua whitelist scheme
 * (`https://`, `APP_ORIGIN`, đường dẫn nội bộ `/`); scheme lạ rơi về ảnh mặc định.
 *
 * CSP `default-src 'none'` của `secureHeaders` (app.ts) áp cho cả route này là
 * chủ ý: HTML preview chỉ có thẻ meta, không tải JS/CSS/font nào.
 */

const DEFAULT_TITLE = "Rendez — Ăn gì hôm nay ở Đà Nẵng?"
const DEFAULT_DESCRIPTION =
  "Khám phá, lưu và chia sẻ địa điểm ăn uống ở Đà Nẵng cùng bạn bè — bản đồ, phòng đi ăn và bỏ phiếu chọn quán."
/** Ảnh mặc định nằm trong `frontend/public/` — phục vụ bởi container web. */
const FALLBACK_IMAGE = "/og-image.png"
/** Độ dài description hiển thị gọn trong preview mạng xã hội. */
const MAX_DESCRIPTION_LENGTH = 160

export interface OgMeta {
  title: string
  description: string
  /** Đường dẫn công khai của trang (`/discover/<id>`, `/post/<id>`). */
  path: string
  /** URL ảnh gốc (có thể tương đối) — `null` = dùng ảnh mặc định. */
  image: string | null
  type: "website" | "article"
  /** Epoch giây của `updatedAt`/`createdAt` — gắn `?v=` để bust cache preview. */
  version: number
}

/** Meta mặc định khi quán/bài không tồn tại hoặc chưa publish (status 404). */
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

/**
 * Cắt caption về tối đa `max` ký tự, cắt tại khoảng trắng gần nhất và không
 * cắt đôi cặp surrogate (emoji) — preview không bị nửa ký tự lỗi.
 */
export function truncateDescription(text: string, max = MAX_DESCRIPTION_LENGTH): string {
  if (text.length <= max) return text

  let cut = text.slice(0, max)
  // Ký tự cuối là nửa đầu của cặp surrogate → bỏ để không đứt emoji.
  const lastCode = cut.charCodeAt(cut.length - 1)
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
  if (raw.startsWith(env.APP_ORIGIN)) return raw
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
