import type { PlaceCategory } from "@/features/places/types/place"

interface PlacePlaceholderProps {
  category?: PlaceCategory

  name?: string

  label?: string
}

export function PlacePlaceholder({ category, name, label }: PlacePlaceholderProps) {
  const initial = name?.trim().charAt(0).toUpperCase() ?? ""

  const content = (
    <div
      aria-hidden="true"
      className="flex size-full flex-col items-center justify-center gap-1.5 bg-linear-to-br from-muted to-secondary/70 px-3 text-center"
    >
      {initial ? (
        <span className="text-2xl font-semibold tracking-tight text-muted-foreground/70">
          {initial}
        </span>
      ) : null}
      {name ? (
        <span className="line-clamp-2 text-xs font-medium text-muted-foreground">{name}</span>
      ) : null}
    </div>
  )

  const describedAs = label ?? name ?? category

  if (describedAs === undefined) return content

  return (
    <div role="img" aria-label={describedAs} className="size-full">
      {content}
    </div>
  )
}
