import type { ReactElement, ReactNode } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { useIsDesktop } from "@/hooks/use-breakpoint"

interface ResponsiveModalProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly title: ReactNode
  readonly description?: ReactNode
  readonly trigger?: ReactElement
  readonly children: ReactNode
  readonly className?: string
}

/**
 * Pattern responsive chuẩn shadcn/React:
 * - Desktop (>= 768px): hiển thị Dialog căn giữa.
 * - Mobile (< 768px): hiển thị Drawer dạng bottom-sheet thân thiện ngón tay cái.
 */
export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  trigger,
  children,
  className,
}: ResponsiveModalProps) {
  const isDesktop = useIsDesktop()

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        {trigger ? <DialogTrigger render={trigger} /> : null}
        <DialogContent className={className ?? "sm:max-w-md"}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      {trigger ? <DrawerTrigger render={trigger} /> : null}
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{title}</DrawerTitle>
          {description ? <DrawerDescription>{description}</DrawerDescription> : null}
        </DrawerHeader>
        <div className="max-h-[75dvh] overflow-y-auto px-4 pb-6">{children}</div>
      </DrawerContent>
    </Drawer>
  )
}
