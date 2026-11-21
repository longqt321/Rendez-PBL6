import type { ReactNode } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const pageContainerVariants = cva("mx-auto w-full", {
  variants: {
    size: {
      narrow: "max-w-3xl",
      default: "max-w-5xl",
      wide: "max-w-7xl",
      full: "max-w-none",
    },
    padded: {
      true: "px-4 py-6 lg:px-8 lg:py-8",
      compact: "px-4 py-4 lg:px-6 lg:py-5",
      false: "",
    },
  },
  defaultVariants: {
    size: "wide",
    padded: true,
  },
})

interface PageContainerProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof pageContainerVariants> {}

/** Khung chứa chuẩn cho toàn bộ trang, đóng gói độ rộng và nhịp khoảng cách. */
export function PageContainer({ size, padded, className, ...props }: Readonly<PageContainerProps>) {
  return <div className={cn(pageContainerVariants({ size, padded }), className)} {...props} />
}

interface PageHeaderProps {
  readonly eyebrow?: string
  readonly title: ReactNode
  readonly description?: ReactNode
  readonly actions?: ReactNode
  readonly breadcrumb?: ReactNode
  readonly className?: string
}

/** Tiêu đề trang phong cách tạp chí (Editorial Header) dùng font Fraunces Display. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  breadcrumb,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("mb-6 flex flex-col gap-3", className)}>
      {breadcrumb ? <div>{breadcrumb}</div> : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          {eyebrow ? (
            <p className="text-xs font-semibold tracking-wider text-primary uppercase">{eyebrow}</p>
          ) : null}
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  )
}

const splitLayoutVariants = cva("grid items-start", {
  variants: {
    ratio: {
      "8-4": "grid-cols-1 lg:grid-cols-12",
      "5-7": "grid-cols-1 lg:grid-cols-12",
      "7-5": "grid-cols-1 lg:grid-cols-12",
      "6-6": "grid-cols-1 lg:grid-cols-2",
    },
    gap: {
      md: "gap-6",
      lg: "gap-8",
    },
  },
  defaultVariants: {
    ratio: "8-4",
    gap: "lg",
  },
})

interface SplitLayoutProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof splitLayoutVariants> {}

/** Bố cục 2 cột linh hoạt trên desktop, tự xếp dọc trên mobile. */
export function SplitLayout({ ratio, gap, className, ...props }: Readonly<SplitLayoutProps>) {
  return <div className={cn(splitLayoutVariants({ ratio, gap }), className)} {...props} />
}

const splitMainVariants = cva("min-w-0", {
  variants: {
    span: {
      5: "lg:col-span-5",
      7: "lg:col-span-7",
      8: "lg:col-span-8",
      4: "lg:col-span-4",
    },
  },
  defaultVariants: {
    span: 8,
  },
})

interface SplitColumnProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof splitMainVariants> {}

export function SplitMain({ span, className, ...props }: Readonly<SplitColumnProps>) {
  return <div className={cn(splitMainVariants({ span }), className)} {...props} />
}

const stickyAsideVariants = cva("min-w-0", {
  variants: {
    span: {
      4: "lg:col-span-4",
      5: "lg:col-span-5",
      7: "lg:col-span-7",
    },
    sticky: {
      true: "lg:sticky lg:top-20",
      false: "",
    },
  },
  defaultVariants: {
    span: 4,
    sticky: true,
  },
})

interface StickyAsideProps
  extends React.HTMLAttributes<HTMLElement>, VariantProps<typeof stickyAsideVariants> {}

export function StickyAside({ span, sticky, className, ...props }: Readonly<StickyAsideProps>) {
  return <aside className={cn(stickyAsideVariants({ span, sticky }), className)} {...props} />
}

export function BentoGrid({ className, ...props }: Readonly<React.HTMLAttributes<HTMLDivElement>>) {
  return <div className={cn("grid grid-cols-1 gap-4 lg:grid-cols-12", className)} {...props} />
}

const bentoCellVariants = cva("min-w-0", {
  variants: {
    span: {
      7: "lg:col-span-7",
      5: "lg:col-span-5",
      6: "lg:col-span-6",
      4: "lg:col-span-4",
      12: "lg:col-span-12",
    },
  },
  defaultVariants: {
    span: 6,
  },
})

interface BentoCellProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof bentoCellVariants> {}

export function BentoCell({ span, className, ...props }: Readonly<BentoCellProps>) {
  return <div className={cn(bentoCellVariants({ span }), className)} {...props} />
}

const surfaceCardVariants = cva("rounded-surface border transition-shadow", {
  variants: {
    variant: {
      elevated: "border-border/80 bg-card text-card-foreground shadow-(--shadow-soft)",
      subtle: "border-border/60 bg-muted/45 text-foreground",
      glass:
        "border-border/70 bg-background/85 text-foreground shadow-(--shadow-raised) backdrop-blur-md",
      accent: "border-primary/30 bg-primary/5 text-foreground shadow-(--shadow-soft)",
      danger: "border-destructive/35 bg-destructive/5 text-foreground",
    },
    padding: {
      none: "p-0",
      sm: "p-3.5",
      md: "p-5",
      lg: "p-6",
    },
  },
  defaultVariants: {
    variant: "elevated",
    padding: "md",
  },
})

interface SurfaceCardProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof surfaceCardVariants> {}

/** Khối bề mặt ngữ nghĩa đóng gói viền, nền và đổ bóng chuẩn của Rendez. */
export function SurfaceCard({ variant, padding, className, ...props }: Readonly<SurfaceCardProps>) {
  return <div className={cn(surfaceCardVariants({ variant, padding }), className)} {...props} />
}
