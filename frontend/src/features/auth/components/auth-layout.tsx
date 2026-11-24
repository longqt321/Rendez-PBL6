import { useEffect, useState, type ReactNode } from "react"
import { Link } from "react-router"
import { ArrowLeftIcon, CompassIcon, MapPinIcon } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { StickyAside } from "@/components/layout/page-primitives"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

interface ShowcaseVenue {
  readonly id: string
  readonly name: string
  readonly district: string
  readonly imageUrl: string
}

const SHOWCASE_VENUES: readonly ShowcaseVenue[] = [
  {
    id: "dau-ngot-cafe",
    name: "Dâu Ngọt Café",
    district: "Sơn Trà",
    imageUrl: "/data/cold-start/images/venues/dau-ngot-cafe-1-800.webp",
  },
  {
    id: "wonderlust-coffee",
    name: "Wonderlust Coffee & Store",
    district: "Hải Châu",
    imageUrl: "/data/cold-start/images/venues/wonderlust-coffee-gm-1-800.webp",
  },
  {
    id: "mi-quang-1a",
    name: "Mì Quảng 1A",
    district: "Hải Châu",
    imageUrl: "/data/cold-start/images/venues/mi-quang-1a-gm-1-800.webp",
  },
  {
    id: "hai-san-moc-quan",
    name: "Hải sản Mộc Quán",
    district: "Sơn Trà",
    imageUrl: "/data/cold-start/images/venues/hai-san-moc-quan-gm-1-800.webp",
  },
  {
    id: "reply-1988-cafe",
    name: "Reply 1988 Café",
    district: "Hải Châu",
    imageUrl: "/data/cold-start/images/venues/reply-1988-cafe-gm-1-800.webp",
  },
]

const SLIDE_INTERVAL_MS = 6000
const MORPH_EASE = [0.22, 1, 0.36, 1] as const

export function AuthLayout({
  title,
  description,
  children,
  footer,
}: Readonly<{
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}>) {
  const [activeIndex, setActiveIndex] = useState(0)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % SHOWCASE_VENUES.length)
    }, SLIDE_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [])

  const currentVenue = SHOWCASE_VENUES[activeIndex] ?? SHOWCASE_VENUES[0]

  return (
    <div className="grid min-h-svh w-full lg:grid-cols-2">
      <StickyAside
        sticky={false}
        className="relative hidden overflow-hidden bg-muted lg:col-span-1 lg:flex lg:flex-col lg:justify-between lg:p-8"
      >
        <AnimatePresence mode="sync" initial={false}>
          <motion.img
            key={currentVenue.id}
            src={currentVenue.imageUrl}
            alt={`${currentVenue.name} tại ${currentVenue.district}, Đà Nẵng`}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.05 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
            transition={{
              duration: shouldReduceMotion ? 0.25 : 1.4,
              ease: MORPH_EASE,
            }}
            className="absolute inset-0 size-full object-cover will-change-transform"
          />
        </AnimatePresence>

        <div className="relative z-10 flex items-center">
          <Link
            to="/discover"
            className="inline-flex items-center gap-2 rounded-control border border-border/70 bg-background/90 px-3 py-1.5 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background"
          >
            <span
              aria-hidden="true"
              className="grid size-6 place-items-center rounded-sm bg-primary text-primary-foreground"
            >
              <CompassIcon className="size-3.5" />
            </span>
            <span className="font-display text-base font-bold tracking-tight">Rendez</span>
          </Link>
        </div>

        <div className="relative z-10 flex items-center justify-between gap-4">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentVenue.id}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: shouldReduceMotion ? 0.15 : 0.45, ease: MORPH_EASE }}
            >
              <Link
                to={`/discover/${currentVenue.id}`}
                className="inline-flex items-center gap-2 rounded-control border border-border/70 bg-background/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background"
              >
                <MapPinIcon className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  {currentVenue.name} · {currentVenue.district}
                </span>
              </Link>
            </motion.div>
          </AnimatePresence>

          <ToggleGroup
            value={[currentVenue.id]}
            onValueChange={(next) => {
              const targetId = next[0]
              if (!targetId) return
              const idx = SHOWCASE_VENUES.findIndex((venue) => venue.id === targetId)
              if (idx >= 0) setActiveIndex(idx)
            }}
            aria-label="Chọn ảnh địa điểm hiển thị"
            className="gap-1 rounded-full border border-border/70 bg-background/90 px-2 py-1 shadow-sm backdrop-blur-sm"
          >
            {SHOWCASE_VENUES.map((venue, index) => {
              const isActive = index === activeIndex
              return (
                <ToggleGroupItem
                  key={venue.id}
                  value={venue.id}
                  aria-label={`Hiển thị ảnh ${venue.name}`}
                  className={cn(
                    "h-2 min-w-0 rounded-full border-0 p-0 transition-all duration-300 hover:bg-transparent aria-pressed:bg-primary",
                    isActive
                      ? "w-5 bg-primary"
                      : "w-2 bg-muted-foreground/45 hover:bg-muted-foreground/75",
                  )}
                />
              )
            })}
          </ToggleGroup>
        </div>
      </StickyAside>

      {/* Cột phải: Form xác thực tập trung */}
      <main className="flex flex-col items-center justify-center px-4 py-8 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center justify-between">
            <Link
              to="/discover"
              className="flex items-center gap-2 font-display text-xl font-bold tracking-tight lg:hidden"
            >
              <span
                aria-hidden="true"
                className="grid size-8 place-items-center rounded-control bg-primary text-sm font-bold text-primary-foreground"
              >
                <CompassIcon className="size-4" />
              </span>
              Rendez
            </Link>
            <Link
              to="/discover"
              className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
              Về trang Khám phá
            </Link>
          </div>

          <Card className="border-border/80 shadow-(--shadow-raised)">
            <CardContent className="flex flex-col gap-5 pt-6">
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
                {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
              </div>
              {children}
            </CardContent>
            {footer && <CardFooter className="justify-center text-sm">{footer}</CardFooter>}
          </Card>
        </div>
      </main>
    </div>
  )
}
