import { Link } from "react-router"
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDate } from "@/lib/format"
import type { Trip } from "../types/trip"
import { tripStatus } from "../lib/trip"

interface TripCardProps {
  trip: Trip
  onEdit: (trip: Trip) => void
  onDelete: (trip: Trip) => void
}

/** Thẻ chuyến đi trong danh sách — bấm mở chi tiết, menu phụ để sửa/xoá. */
export function TripCard({ trip, onEdit, onDelete }: TripCardProps) {
  const placeCount = trip.days.reduce((total, day) => total + day.placeIds.length, 0)

  return (
    <Card className="relative gap-0 py-0">
      <CardHeader className="gap-1.5 px-4 pt-4">
        <CardTitle className="flex items-center gap-2 text-base leading-tight font-bold">
          <Link
            to={`/trips/${trip.id}`}
            className="outline-none after:absolute after:inset-0 focus-visible:underline"
          >
            {trip.name}
          </Link>
          {tripStatus(trip) === "ongoing" ? <Badge variant="secondary">Đang diễn ra</Badge> : null}
        </CardTitle>
        <CardDescription>
          {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
        </CardDescription>

        <CardAction className="relative z-10">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Tuỳ chọn chuyến đi ${trip.name}`}
                >
                  <MoreHorizontalIcon aria-hidden="true" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(trip)}>
                Sửa
                <PencilIcon aria-hidden="true" />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(trip)}>
                Xoá
                <Trash2Icon aria-hidden="true" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-wrap items-center gap-2 px-4 pt-1.5 pb-4">
        <Badge variant="outline">{trip.days.length} ngày</Badge>
        <Badge variant="outline">{placeCount} quán</Badge>
        {trip.baseDistrict ? <Badge variant="secondary">{trip.baseDistrict}</Badge> : null}
        {trip.baseLabel ? (
          <span className="text-xs text-muted-foreground">{trip.baseLabel}</span>
        ) : null}
      </CardContent>
    </Card>
  )
}
