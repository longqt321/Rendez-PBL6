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
import { categoryLabel } from "@/features/places/lib/category-meta"
import { priceLevelLabel } from "@/features/places/lib/price-level"
import type { Room } from "../types/room"

interface RoomBannerProps {
  room: Room
  onLeave: () => void
}

function filterLabels(room: Room): string[] {
  const { filter } = room
  const labels: string[] = []
  for (const category of filter.categories) labels.push(categoryLabel(category))
  for (const category of filter.excludedCategories)
    labels.push(`Không ${categoryLabel(category).toLowerCase()}`)
  for (const district of filter.districts) labels.push(district)
  for (const district of filter.excludedDistricts) labels.push(`Không ${district}`)
  if (filter.priceMax !== undefined) labels.push(`Tối đa ${priceLevelLabel(filter.priceMax)}`)
  for (const keyword of filter.includeKeywords) labels.push(`Có “${keyword}”`)
  for (const keyword of filter.excludeKeywords) labels.push(`Không “${keyword}”`)
  return labels
}

/**
 * Dải thông tin phòng lọc đang hoạt động, đặt đầu trang `/discover` và `/map`.
 *
 * Dựng bằng `Card` (có sẵn `CardAction` cho cụm nút) — không tự dựng div bọc
 * border/màu. Cho người dùng biết màn hình đang bị lọc bởi phòng nào, ai đang
 * trong phòng và những ràng buộc nào đang áp dụng.
 */
export function RoomBanner({ room, onLeave }: RoomBannerProps) {
  const labels = filterLabels(room)

  return (
    <Card className="mb-4 gap-0 border-primary/40 bg-primary/5 py-0">
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
        {labels.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {labels.map((label) => (
              <Badge key={label} variant="outline" className="text-xs">
                {label}
              </Badge>
            ))}
          </div>
        ) : (
          <CardDescription className="text-xs">
            Chưa có ràng buộc nào — mở phòng để mọi người cùng đề xuất.
          </CardDescription>
        )}
      </CardContent>
    </Card>
  )
}
