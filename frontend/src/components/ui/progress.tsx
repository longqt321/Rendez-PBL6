import { Progress as ProgressPrimitive } from "@base-ui/react/progress"
import { cn } from "@/lib/utils"

function Progress({
  className,
  value,
  ...props
}: ProgressPrimitive.Root.Props & { value?: number | null }) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value ?? 0}
      className={cn("relative w-full", className)}
      {...props}
    >
      <ProgressPrimitive.Track
        data-slot="progress-track"
        className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className="h-full rounded-full bg-primary transition-all"
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  )
}

export { Progress }
