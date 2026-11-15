import { Share2Icon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { shareLink } from "@/lib/share"

interface ShareButtonProps {
  title: string

  url: string

  label?: string
  size?: "sm" | "default"
}

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
