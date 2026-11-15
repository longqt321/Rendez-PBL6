export type ShareResult = "shared" | "copied" | "cancelled" | "failed"

interface ShareLinkOptions {
  title: string

  url: string
}

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
