import { Link } from "react-router"
import { CompassIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

/** Trang 404 — mọi route không khớp. */
export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <Empty className="max-w-md">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CompassIcon />
          </EmptyMedia>
          <EmptyTitle>Không tìm thấy trang</EmptyTitle>
          <EmptyDescription>
            Đường dẫn không tồn tại hoặc đã bị di chuyển. Quay lại Khám phá để tiếp tục nhé.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link to="/discover" />}>Về trang Khám phá</Button>
        </EmptyContent>
      </Empty>
    </div>
  )
}
