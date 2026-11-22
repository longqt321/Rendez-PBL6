import { LocateFixedIcon, NavigationIcon, XIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

export function FilterPill({
  label,
  variant = "include",
  onRemove,
}: Readonly<{
  label: string
  variant?: "include" | "exclude"
  onRemove: () => void
}>) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 gap-1 rounded-full pr-1 pl-2.5 text-xs",
        variant === "exclude"
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-primary/40 bg-primary/10 text-primary",
      )}
    >
      <span>{label}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={onRemove}
        aria-label={`Gỡ ${label}`}
        className="size-4 rounded-full"
      >
        <XIcon className="size-3" aria-hidden="true" />
      </Button>
    </Badge>
  )
}

export function NearbyButtonIcon({
  isLocating,
  isNearbyActive,
}: Readonly<{ isLocating: boolean; isNearbyActive: boolean }>) {
  if (isLocating) {
    return <Spinner className="size-4" aria-label="Đang xác định vị trí" />
  }
  if (isNearbyActive) {
    return <LocateFixedIcon className="size-4" />
  }
  return <NavigationIcon className="size-4 text-primary" />
}
