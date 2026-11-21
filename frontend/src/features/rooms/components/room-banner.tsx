import { Link } from "react-router"
import { LogOutIcon, RotateCcwIcon, UsersIcon, XIcon } from "lucide-react"
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
import { roomFilterChips, type RoomFilterChip } from "../lib/room"
import type { Room } from "../types/room"

interface RoomBannerProps {
  room: Room
  onLeave: () => void
  onRemoveChip?: (chip: RoomFilterChip) => void
  onResetFilters?: () => void
}

export function RoomBanner({ room, onLeave, onRemoveChip, onResetFilters }: RoomBannerProps) {
  const chips = roomFilterChips(room)

  return (
    <Card className="mb-1 gap-0 border-primary/35 bg-primary/5 py-0">
      <CardHeader className="gap-1.5 px-4 py-2.5">
        <CardTitle className="flex flex-wrap items-center gap-2 text-sm font-bold">
          <UsersIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>{room.name}</span>
          <Badge variant="secondary" className="font-mono text-xs">
            {room.code}
          </Badge>
          <span className="text-xs font-normal text-muted-foreground">
            {room.members.length} thành viên · đang lọc chung
          </span>
        </CardTitle>
        <CardAction className="flex items-center gap-1.5">
          <Button variant="outline" size="xs" render={<Link to={`/rooms/${room.code}`} />}>
            Mở bàn chốt quán
          </Button>
          <Button variant="ghost" size="xs" onClick={onLeave}>
            <LogOutIcon className="size-3.5" aria-hidden="true" />
            Rời phòng
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-4 pb-2.5">
        {chips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {chips.map((chip) => (
              <Badge
                key={`${chip.kind}-${chip.field}-${chip.value}`}
                variant="outline"
                className={
                  chip.kind === "exclude"
                    ? "h-6 gap-1 border-destructive/40 bg-destructive/10 pr-1 text-xs text-destructive"
                    : "h-6 gap-1 border-primary/40 bg-primary/10 pr-1 text-xs text-primary"
                }
              >
                <span>{chip.label}</span>
                {onRemoveChip ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Gỡ điều kiện ${chip.label}`}
                    onClick={() => onRemoveChip(chip)}
                    className="size-4 rounded-full"
                  >
                    <XIcon className="size-3" aria-hidden="true" />
                  </Button>
                ) : null}
              </Badge>
            ))}
            {onResetFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="h-6 px-2 text-xs text-muted-foreground"
                onClick={onResetFilters}
              >
                <RotateCcwIcon className="size-3" aria-hidden="true" />
                Đặt lại
              </Button>
            ) : null}
          </div>
        ) : (
          <CardDescription className="text-xs">
            Chưa có ràng buộc nào. Mở bàn chốt quán để chọn tiêu chí cho cả nhóm.
          </CardDescription>
        )}
      </CardContent>
    </Card>
  )
}
