import { CompassIcon } from "lucide-react"
import { SectionHeading } from "@/components/shared/section-heading"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { useRecommendedPlaces } from "../hooks/use-recommended-places"
import { PlaceCard } from "./place-card"
import { PlaceCardSkeleton } from "./place-card-skeleton"

const RECOMMENDED_LIMIT = 6
const SKELETON_KEYS = Array.from({ length: 3 }, (_, index) => `rec-skeleton-${index}`)

export function RecommendedSection() {
  const { data, isPending, isError } = useRecommendedPlaces(RECOMMENDED_LIMIT)

  if (isError) return null
  if (isPending) {
    return (
      <section aria-busy="true" className="mt-6">
        <SectionHeading icon={<CompassIcon className="size-4 text-primary" aria-hidden="true" />}>
          Gợi ý cho bạn
        </SectionHeading>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SKELETON_KEYS.map((key) => (
            <PlaceCardSkeleton key={key} imageHeight={160} />
          ))}
        </div>
      </section>
    )
  }
  if (!data || data.length === 0) return null

  return (
    <section aria-labelledby="recommended-heading" className="mt-6">
      <Carousel opts={{ align: "start" }} className="w-full">
        <div className="flex items-center justify-between gap-2">
          <SectionHeading
            id="recommended-heading"
            icon={<CompassIcon className="size-4 text-primary" aria-hidden="true" />}
          >
            Gợi ý cho bạn
          </SectionHeading>
          <div className="hidden items-center gap-1.5 sm:flex">
            <CarouselPrevious className="static size-8 translate-y-0" />
            <CarouselNext className="static size-8 translate-y-0" />
          </div>
        </div>

        <CarouselContent className="mt-3 -ml-3 sm:-ml-4">
          {data.map((place) => (
            <CarouselItem
              key={place.id}
              className="basis-[85%] pl-3 sm:basis-1/2 sm:pl-4 lg:basis-[42%]"
            >
              <PlaceCard place={place} variant="horizontal" />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  )
}
