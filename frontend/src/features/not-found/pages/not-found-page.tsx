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

/** Trang 404 — mọi route không khớp. Render trong `AppShell` để người lạc vẫn còn điều hướng. */
export function NotFoundPage() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center px-4 py-10">
      <h1 className="sr-only">Không tìm thấy trang</h1>
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
