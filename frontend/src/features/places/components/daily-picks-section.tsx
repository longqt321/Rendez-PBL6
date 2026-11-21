import { useMediaQuery } from "@base-ui/react/unstable-use-media-query"
import { SparklesIcon } from "lucide-react"
import { BentoCell, BentoGrid } from "@/components/layout/page-primitives"
import { SectionHeading } from "@/components/shared/section-heading"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { useDailyPicks } from "../hooks/use-daily-picks"
import { PlaceCard } from "./place-card"
import { PlaceCardSkeleton } from "./place-card-skeleton"

const PICK_DATE_FORMAT = new Intl.DateTimeFormat("vi-VN", {
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
})

function formatPickDate(date: string): string {
  const time = Date.parse(`${date}T00:00:00Z`)
  if (Number.isNaN(time)) return ""
  return PICK_DATE_FORMAT.format(time)
}

/**
 * Dải "Gợi ý hôm nay" trên /discover — trình bày kiểu Editorial Bento 1+2 trên desktop
 * và Embla Carousel trên mobile.
 */
export function DailyPicksSection() {
  const { data, isPending, isError } = useDailyPicks()
  const isDesktop = useMediaQuery("(min-width: 1024px)", { noSsr: true })

  if (isError) return null
  if (isPending) {
    return (
      <section aria-busy="true" className="mt-6">
        <SectionHeading icon={<SparklesIcon className="size-4 text-primary" aria-hidden="true" />}>
          Gợi ý hôm nay
        </SectionHeading>
        <BentoGrid className="mt-3">
          <BentoCell span={7}>
            <PlaceCardSkeleton imageHeight={300} />
          </BentoCell>
          <BentoCell span={5} className="flex flex-col gap-4">
            <PlaceCardSkeleton imageHeight={132} />
            <PlaceCardSkeleton imageHeight={132} />
          </BentoCell>
        </BentoGrid>
      </section>
    )
  }
  if (!data || data.items.length === 0) return null

  const dateLabel = formatPickDate(data.date)
  const [featuredPick, ...secondaryPicks] = data.items

  return (
    <section
      aria-labelledby="daily-picks-heading"
      className="mt-6 rounded-surface border border-border/70 bg-card/55 p-4 shadow-(--shadow-soft) sm:p-5"
    >
      <div className="flex items-baseline justify-between gap-2">
        <SectionHeading
          id="daily-picks-heading"
          icon={<SparklesIcon className="size-4 text-primary" aria-hidden="true" />}
        >
          Gợi ý hôm nay
          {dateLabel ? <span className="text-muted-foreground"> · {dateLabel}</span> : null}
        </SectionHeading>
        <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
          Tuyển chọn mỗi ngày
        </span>
      </div>

      {isDesktop ? (
        <BentoGrid className="mt-4">
          {featuredPick ? (
            <BentoCell span={7}>
              <PlaceCard
                place={featuredPick.place}
                why={featuredPick.why}
                variant="featured"
                rankBadge="01"
                subtitleNote={featuredPick.reason}
              />
            </BentoCell>
          ) : null}

          {secondaryPicks.length > 0 ? (
            <BentoCell span={5} className="flex flex-col justify-between gap-4">
              {secondaryPicks.map(({ place, reason, why }, idx) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  why={why}
                  variant="horizontal"
                  rankBadge={`0${idx + 2}`}
                  subtitleNote={reason}
                />
              ))}
            </BentoCell>
          ) : null}
        </BentoGrid>
      ) : (
        <div className="mt-4">
          <Carousel opts={{ align: "start" }} className="w-full">
            <CarouselContent className="-ml-3">
              {data.items.map(({ place, reason, why }, idx) => (
                <CarouselItem key={place.id} className="basis-[84%] pl-3 sm:basis-1/2">
                  <PlaceCard
                    place={place}
                    why={why}
                    rankBadge={`0${idx + 1}`}
                    subtitleNote={reason}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="mt-3 flex justify-end gap-2">
              <CarouselPrevious className="static translate-y-0" />
              <CarouselNext className="static translate-y-0" />
            </div>
          </Carousel>
        </div>
      )}
    </section>
  )
}
