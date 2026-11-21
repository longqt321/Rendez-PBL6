import type { ReactNode } from "react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"

const EDITORIAL_EASE = [0.22, 1, 0.36, 1] as const

interface StaggerListProps {
  readonly children: ReactNode
  readonly className?: string
  readonly as?: "ul" | "div"
}

/** Danh sách xuất hiện tuần tự nhẹ nhàng theo nhịp editorial. */
export function StaggerList({ children, className, as = "ul" }: StaggerListProps) {
  const Component = as === "ul" ? motion.ul : motion.div
  return (
    <Component
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.03,
          },
        },
      }}
      className={className}
    >
      {children}
    </Component>
  )
}

interface StaggerItemProps {
  readonly children: ReactNode
  readonly className?: string
  readonly as?: "li" | "div"
}

export function StaggerItem({ children, className, as = "li" }: StaggerItemProps) {
  const Component = as === "li" ? motion.li : motion.div
  return (
    <Component
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.32, ease: EDITORIAL_EASE },
        },
      }}
      className={className}
    >
      {children}
    </Component>
  )
}

interface FadeInSectionProps {
  readonly children: ReactNode
  readonly className?: string
  readonly delay?: number
}

export function FadeInSection({ children, className, delay = 0 }: FadeInSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: EDITORIAL_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

interface MotionPillProps {
  readonly layoutId: string
  readonly className?: string
}

/** Nền trượt vật lý dùng chung cho navigation rail, filter tabs và category pills. */
export function MotionPill({ layoutId, className }: MotionPillProps) {
  return (
    <motion.span
      layoutId={layoutId}
      aria-hidden="true"
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className={cn("absolute inset-0 -z-10 rounded-control bg-primary", className)}
    />
  )
}
