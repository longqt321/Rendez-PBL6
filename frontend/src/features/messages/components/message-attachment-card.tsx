import { Link } from "react-router"
import { BookmarkIcon, MapPinIcon, UsersIcon } from "lucide-react"
import type { MessageAttachment } from "@rendez/schema"
import { cn } from "@/lib/utils"

interface MessageAttachmentCardProps {
  readonly attachment: MessageAttachment
  readonly isMine: boolean
}

export function MessageAttachmentCard({ attachment, isMine }: MessageAttachmentCardProps) {
  let link = `/places/${attachment.id}`
  let typeLabel = "Địa điểm"
  let Icon = MapPinIcon

  if (attachment.type === "collection") {
    link = `/collections/${attachment.id}`
    typeLabel = "Bộ sưu tập"
    Icon = BookmarkIcon
  } else if (attachment.type === "room") {
    link = `/rooms/${attachment.id}`
    typeLabel = "Phòng nhóm"
    Icon = UsersIcon
  }

  return (
    <Link
      to={link}
      className={cn(
        "mt-2 block overflow-hidden rounded-surface border text-left transition-colors",
        isMine
          ? "border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"
          : "border-border/70 bg-card/90 text-card-foreground hover:bg-muted/60",
      )}
    >
      {attachment.imageUrl ? (
        <div className="h-28 w-full overflow-hidden bg-muted">
          <img
            src={attachment.imageUrl}
            alt={attachment.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : null}
      <div className="p-2.5">
        <div className="flex items-center gap-1.5 text-xs opacity-75">
          <Icon className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="font-medium">{typeLabel}</span>
        </div>
        <p className="mt-0.5 line-clamp-1 text-sm font-semibold">{attachment.title}</p>
        {attachment.subtitle ? (
          <p className="line-clamp-1 text-xs opacity-80">{attachment.subtitle}</p>
        ) : null}
      </div>
    </Link>
  )
}
