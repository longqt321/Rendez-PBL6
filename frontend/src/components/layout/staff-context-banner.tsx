import { ShieldCheckIcon } from "lucide-react"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { useMe } from "@/features/profile/hooks/use-me"

export function StaffContextBanner() {
  const { data: me } = useMe()
  if (!me || (me.role !== "admin" && me.role !== "moderator")) return null

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/25 bg-primary/8 px-4 py-1.5 text-xs text-foreground"
    >
      <span className="flex items-center gap-1.5">
        <ShieldCheckIcon className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
        <span>
          Đang xem trang công khai bằng tài khoản{" "}
          <strong>{me.role === "admin" ? "Quản trị viên" : "Kiểm duyệt viên"}</strong>
        </span>
      </span>
      <Button
        variant="outline"
        size="sm"
        className="h-7 px-2.5 text-xs"
        render={<Link to="/admin" />}
      >
        Quay lại Trung tâm điều hành
      </Button>
    </div>
  )
}
