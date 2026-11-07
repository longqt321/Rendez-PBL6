import { Share2Icon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { shareLink } from "@/lib/share"

interface ShareButtonProps {
  /** Tiêu đề gửi kèm khi chia sẻ qua hệ điều hành. */
  title: string
  /** Đường dẫn tương đối (`/collections/c-01`) — hàm chia sẻ tự ghép origin. */
  url: string
  /** Nhãn nút; mặc định "Chia sẻ". */
  label?: string
  size?: "sm" | "default"
}

/**
 * Nút chia sẻ dùng chung.
 *
 * Trên mobile ưu tiên hộp thoại hệ điều hành; ở desktop fallback sang sao chép
 * liên kết. Toast nói rõ đã làm gì để người dùng không phải đoán.
 */
export function ShareButton({ title, url, label = "Chia sẻ", size = "sm" }: ShareButtonProps) {
  async function handleShare() {
    const result = await shareLink({ title, url })

    if (result === "copied") toast.success("Đã sao chép liên kết")
    else if (result === "shared") toast.success("Đã mở hộp thoại chia sẻ")
    else if (result === "failed") toast.error("Không sao chép được liên kết")
  }

  return (
    <Button variant="outline" size={size} onClick={() => void handleShare()}>
      <Share2Icon />
      {label}
    </Button>
  )
}
