import { Link } from "react-router"
import { LogOutIcon, UsersIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { roomFilterChips } from "../lib/room"
import type { Room } from "../types/room"

interface RoomBannerProps {
  room: Room
  onLeave: () => void
}

export function RoomBanner({ room, onLeave }: RoomBannerProps) {
  const chips = roomFilterChips(room)

  return (
    <Card className="mb-2 gap-0 border-primary/35 bg-primary/5 py-0">
      <CardHeader className="gap-1.5 px-4 py-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-sm font-bold">
          <UsersIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
          {room.name}
          <Badge variant="secondary" className="font-mono text-xs">
            {room.code}
          </Badge>
          <span className="text-xs font-normal text-muted-foreground">
            {room.members.length} thành viên · đang lọc chung
          </span>
        </CardTitle>
        <CardAction>
          <Button variant="outline" size="sm" render={<Link to={`/rooms/${room.code}`} />}>
            Mở phòng
          </Button>
          <Button variant="ghost" size="sm" onClick={onLeave}>
            <LogOutIcon aria-hidden="true" />
            Rời phòng
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        {chips.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <Badge
                key={`${chip.kind}-${chip.label}`}
                variant="outline"
                className={
                  chip.kind === "exclude"
                    ? "border-destructive/40 bg-destructive/8 text-xs text-destructive"
                    : "border-primary/40 bg-primary/10 text-xs text-primary"
                }
              >
                {chip.label}
              </Badge>
            ))}
          </div>
        ) : (
          <CardDescription className="text-xs">
            Chưa có ràng buộc nào. Mở phòng để thêm đề xuất.
          </CardDescription>
        )}
      </CardContent>
    </Card>
  )
}
