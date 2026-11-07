import { PaletteIcon, TypeIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSkin } from "@/app/providers/skin-context"

export function SkinToggle() {
  const { skin, setSkin } = useSkin()
  const isRetro = skin === "retro"

  return (
    <Button
      variant="outline"
      size="icon-sm"
      aria-label={isRetro ? "Chuyển về giao diện mặc định" : "Chuyển sang giao diện retro"}
      title={isRetro ? "Giao diện: Retro" : "Giao diện: Mặc định"}
      onClick={() => setSkin(isRetro ? "default" : "retro")}
    >
      {isRetro ? <TypeIcon /> : <PaletteIcon />}
    </Button>
  )
}
