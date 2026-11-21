import type { ReactNode } from "react"
import { Link } from "react-router"
import { ArrowLeftIcon, CompassIcon, MapPinIcon, SparklesIcon, UsersIcon } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"

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
  return (
    <div className="grid min-h-svh w-full lg:grid-cols-2">
      {/* Cột trái: Editorial Danang Showcase trên Desktop */}
      <aside className="relative hidden overflow-hidden bg-foreground text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-10">
        <img
          src="/data/cold-start/images/venues/dau-ngot-cafe-1-800.webp"
          alt="Không gian ẩm thực và cà phê tại Đà Nẵng"
          className="absolute inset-0 size-full object-cover opacity-55"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-foreground/95 via-foreground/60 to-foreground/40"
        />

        <div className="relative z-10 flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="grid size-9 place-items-center rounded-control bg-primary text-primary-foreground shadow-sm"
          >
            <CompassIcon className="size-4.5" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">Rendez</span>
        </div>

        <div className="relative z-10 max-w-md space-y-6">
          <p className="font-display text-3xl leading-snug font-bold tracking-tight">
            Khám phá quán ngon bản địa, cùng bạn bè chốt điểm hẹn tại Đà Nẵng.
          </p>

          <ul className="space-y-3 text-sm text-primary-foreground/85">
            <li className="flex items-center gap-2.5">
              <SparklesIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>3 quán gợi ý mỗi ngày từ dữ liệu địa điểm bản địa</span>
            </li>
            <li className="flex items-center gap-2.5">
              <MapPinIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>Bản đồ trực quan theo quận, mức giá và khoảng cách</span>
            </li>
            <li className="flex items-center gap-2.5">
              <UsersIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>Phòng lọc nhóm giúp cả nhóm chọn quán nhanh chóng</span>
            </li>
          </ul>
        </div>
      </aside>

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
