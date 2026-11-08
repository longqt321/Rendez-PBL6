import { Link } from "react-router"
import { LogOutIcon, UsersIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { categoryLabel } from "@/features/places/lib/category-meta"

import type { Room } from "../types/room"

interface RoomBannerProps {
  room: Room
  onLeave: () => void
}

/** Nhãn các ràng buộc đang có hiệu lực — chỉ hiện cái đã đặt, không hiện mặc định. */
function filterLabels(room: Room): string[] {
  const { filter } = room
  const labels: string[] = []
  for (const category of filter.categories) labels.push(categoryLabel(category))
  for (const category of filter.excludedCategories)
    labels.push(`Không ${categoryLabel(category).toLowerCase()}`)
  for (const district of filter.districts) labels.push(district)
  for (const district of filter.excludedDistricts) labels.push(`Không ${district}`)
  if (filter.priceMax !== undefined) labels.push(`Tối đa ${"₫".repeat(filter.priceMax)}`)
  for (const keyword of filter.includeKeywords) labels.push(`Có “${keyword}”`)
  for (const keyword of filter.excludeKeywords) labels.push(`Không “${keyword}”`)
  return labels
}

/**
 * Dải thông tin phòng lọc đang hoạt động, đặt đầu trang `/discover`.
 *
 * Cho người dùng biết màn hình đang bị lọc bởi phòng nào, ai đang trong phòng và
 * những ràng buộc nào đang áp dụng — tránh hiểu nhầm "app tự nhiên lọc mất quán".
 */
export function RoomBanner({ room, onLeave }: RoomBannerProps) {
  const labels = filterLabels(room)

  return (
    <div className="mb-4 rounded-surface border border-primary/40 bg-primary/5 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <UsersIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="text-sm font-semibold">{room.name}</span>
        <Badge variant="secondary" className="font-mono text-xs">
          {room.code}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {room.members.length} thành viên · đang lọc chung
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="outline" size="sm" render={<Link to={`/rooms/${room.code}`} />}>
            Mở phòng
          </Button>
          <Button variant="ghost" size="sm" onClick={onLeave}>
            <LogOutIcon aria-hidden="true" />
            Rời phòng
          </Button>
        </div>
      </div>

      {labels.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {labels.map((label) => (
            <Badge key={label} variant="outline" className="text-xs">
              {label}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          Chưa có ràng buộc nào — mở phòng để mọi người cùng đề xuất.
        </p>
      )}
    </div>
  )
}
