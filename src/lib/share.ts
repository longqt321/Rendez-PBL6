/**
 * Kết quả một lần chia sẻ liên kết.
 *
 * - `shared`: người dùng đã chia sẻ qua hộp thoại hệ điều hành (Web Share API).
 * - `copied`: trình duyệt không hỗ trợ Web Share → đã sao chép vào clipboard.
 * - `cancelled`: người dùng tự đóng hộp thoại chia sẻ (không phải lỗi).
 * - `failed`: cả hai đường đều không dùng được (thường do thiếu quyền clipboard).
 */
export type ShareResult = "shared" | "copied" | "cancelled" | "failed"

interface ShareLinkOptions {
  title: string
  /** Đường dẫn tương đối (`/collections/c-01`) hoặc URL tuyệt đối. */
  url: string
}

/**
 * Chia sẻ một liên kết.
 *
 * Ưu tiên `navigator.share` (mobile + Safari); nếu không có thì sao chép vào
 * clipboard. Không ném lỗi ra ngoài — người gọi chỉ cần đọc `ShareResult` để
 * hiện toast phù hợp.
 */
export async function shareLink({ title, url }: ShareLinkOptions): Promise<ShareResult> {
  const absoluteUrl = new URL(url, window.location.origin).toString()

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title, url: absoluteUrl })
      return "shared"
    } catch (error) {
      // Đóng hộp thoại chia sẻ là hành vi bình thường — không fallback sang copy.
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled"
    }
  }

  try {
    await navigator.clipboard.writeText(absoluteUrl)
    return "copied"
  } catch {
    return "failed"
  }
}

interface ShareTextOptions {
  title: string
  text: string
  /** Đường dẫn tương đối (`/trips/t-01`) hoặc URL tuyệt đối; nối vào cuối text khi sao chép. */
  url?: string
}

/**
 * Chia sẻ NỘI DUNG (lịch trình, kết quả chia tiền...) — khác `shareLink` chỉ
 * chia sẻ URL: người nhận không cần cài app vẫn đọc được nội dung.
 *
 * Ưu tiên `navigator.share` (mobile + Safari); nếu không có thì sao chép nội
 * dung vào clipboard. Không ném lỗi ra ngoài — người gọi chỉ cần đọc
 * `ShareResult` để hiện toast phù hợp.
 */
export async function shareText({ title, text, url }: ShareTextOptions): Promise<ShareResult> {
  const absoluteUrl = url ? new URL(url, window.location.origin).toString() : undefined

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text, ...(absoluteUrl ? { url: absoluteUrl } : {}) })
      return "shared"
    } catch (error) {
      // Đóng hộp thoại chia sẻ là hành vi bình thường — không fallback sang copy.
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled"
    }
  }

  const clipboardText = absoluteUrl ? `${text}\n${absoluteUrl}` : text

  try {
    await navigator.clipboard.writeText(clipboardText)
    return "copied"
  } catch {
    return "failed"
  }
}
