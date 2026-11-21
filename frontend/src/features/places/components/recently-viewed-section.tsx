import { HistoryIcon } from "lucide-react"
import { SectionHeading } from "@/components/shared/section-heading"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { useRecentlyViewed } from "../hooks/use-recently-viewed"
import { PlaceCard } from "./place-card"

export function RecentlyViewedSection() {
  const { data, isPending, isError } = useRecentlyViewed()

  if (isError || isPending || !data || data.length === 0) return null

  return (
    <section aria-labelledby="recently-viewed-heading" className="mt-6">
      <Carousel opts={{ align: "start" }} className="w-full">
        <div className="flex items-center justify-between gap-2">
          <SectionHeading
            id="recently-viewed-heading"
            icon={<HistoryIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
          >
            Bạn vừa xem
          </SectionHeading>
          <div className="flex items-center gap-1.5">
            <CarouselPrevious className="static size-8 translate-y-0" />
            <CarouselNext className="static size-8 translate-y-0" />
          </div>
        </div>

        <CarouselContent className="mt-3 -ml-4">
          {data.map((place) => (
            <CarouselItem key={place.id} className="basis-[85%] pl-4 sm:basis-1/2 lg:basis-[42%]">
              <PlaceCard place={place} variant="horizontal" />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  )
}
