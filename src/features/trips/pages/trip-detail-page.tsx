import { useState } from "react"
import { Link, useParams } from "react-router"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ShareButton } from "@/components/shared/share-button"
import { SeedImage } from "@/components/shared/seed-image"
import { usePlace } from "@/features/places/hooks/use-place"
import { priceLevelLabel } from "@/features/places/lib/price-level"
import { formatDate } from "@/lib/format"
import { useTrips } from "../hooks/use-trips"
import { tripStatus, tripStats } from "../lib/trip"
import type { Trip } from "../types/trip"

/** Một chặng trong ngày — tra riêng địa điểm qua cache của feature places. */
function TripStopItem({ placeId }: { placeId: string }) {
  const { data: place, isPending } = usePlace(placeId)

  if (isPending) {
    return <Skeleton className="h-16 w-full rounded-md" />
  }
  if (!place) return null

  return (
    <Item variant="outline">
      <ItemMedia>
        <SeedImage seed={place.imageSeed} height={48} className="size-12 rounded-thumb" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          <Link to={`/discover/${place.id}`} className="underline-offset-4 hover:underline">
            {place.name}
          </Link>
        </ItemTitle>
        <ItemDescription>
          {place.district ? `${place.district} · ` : ""}
          {priceLevelLabel(place.priceLevel)}
        </ItemDescription>
      </ItemContent>
    </Item>
  )
}

/** Trạng thái không tìm thấy chuyến đi — dùng chung cho thiếu `id` và id lạ. */
function TripNotFound() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
      <Empty className="mt-8">
        <EmptyHeader>
          <EmptyTitle>Không tìm thấy chuyến đi</EmptyTitle>
          <EmptyDescription>Chuyến đi có thể đã bị xoá hoặc link không đúng.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}

/** Nội dung chi tiết — tách component để state ngày đang chọn reset theo từng chuyến. */
function TripDetail({ trip }: { trip: Trip }) {
  const stats = tripStats(trip)
  const status = tripStatus(trip)
  const [selectedDate, setSelectedDate] = useState(trip.days[0]?.date ?? "")
  const selectedDay = trip.days.find((day) => day.date === selectedDate) ?? trip.days[0]
  const selectedDayIndex = trip.days.findIndex((day) => day.date === selectedDay?.date)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link to="/saved" />}>Đã lưu</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link to="/saved" />}>Chuyến đi</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{trip.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 font-heading text-2xl font-bold tracking-tight">
            {trip.name}
            {status === "ongoing" ? <Badge variant="secondary">Đang diễn ra</Badge> : null}
          </CardTitle>
          <CardDescription>
            {formatDate(trip.startDate)} – {formatDate(trip.endDate)} · {stats.dayCount} ngày ·{" "}
            {stats.placeCount} quán
          </CardDescription>
          <CardAction>
            <ShareButton title={`Chuyến đi “${trip.name}”`} url={`/trips/${trip.id}`} />
          </CardAction>
        </CardHeader>
      </Card>

      {trip.days.length > 0 && selectedDay ? (
        <>
          <ToggleGroup
            value={[selectedDay.date]}
            onValueChange={(next) => {
              const date = next[0]
              if (date) setSelectedDate(date)
            }}
            variant="outline"
            size="sm"
            aria-label="Chọn ngày xem"
            className="mt-4 flex-wrap"
          >
            {trip.days.map((day, index) => (
              <ToggleGroupItem key={day.date} value={day.date} className="h-7 text-xs">
                Ngày {index + 1} · {formatDate(day.date)}
                <Badge variant="secondary">{day.placeIds.length}</Badge>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>
                Ngày {selectedDayIndex + 1} · {formatDate(selectedDay.date)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDay.placeIds.length === 0 ? (
                <Empty className="py-6">
                  <EmptyHeader>
                    <EmptyTitle>Chưa có quán nào trong ngày này</EmptyTitle>
                  </EmptyHeader>
                </Empty>
              ) : (
                <ItemGroup className="gap-2">
                  {selectedDay.placeIds.map((placeId) => (
                    <TripStopItem key={placeId} placeId={placeId} />
                  ))}
                </ItemGroup>
              )}
              <ItemDescription className="mt-3">
                Chi tiết xếp giờ và thêm quán sẽ có ở bước tiếp theo.
              </ItemDescription>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}

/** Trang chi tiết chuyến đi — `/trips/:id`. */
export function TripDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { trips } = useTrips()
  const trip = trips.find((candidate) => candidate.id === id)

  if (!trip) return <TripNotFound />

  // key theo id: đổi chuyến (không đổi route shape) thì state ngày đang chọn reset.
  return <TripDetail key={trip.id} trip={trip} />
}
