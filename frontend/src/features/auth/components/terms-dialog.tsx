import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { TermsSections } from "@/features/static/pages/terms-page"

interface TermsDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  onAccept?: () => void
  acceptLabel?: string
}

export function TermsDialog({
  open,
  onOpenChange,
  trigger,
  onAccept,
  acceptLabel = "Tôi đồng ý",
}: Readonly<TermsDialogProps>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger render={trigger as React.ReactElement} /> : null}
      <DialogContent className="max-h-[88dvh] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Điều khoản sử dụng Rendez</DialogTitle>
          <DialogDescription>
            Vui lòng đọc kỹ quyền lợi và trách nhiệm trước khi sử dụng dịch vụ. Cập nhật lần cuối:
            25/11/2026.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[55dvh] overflow-y-auto pr-2">
          <TermsSections compact />
        </div>

        <DialogFooter className="flex-row flex-wrap items-center justify-between gap-2 sm:justify-between">
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link to="/terms" />}>
            Mở trang đầy đủ
          </Button>
          {onAccept ? (
            <Button type="button" onClick={onAccept}>
              {acceptLabel}
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
              Đóng
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
