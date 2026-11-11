import type { ReactNode } from "react"
import { Link } from "react-router"
import { Card, CardContent, CardFooter } from "@/components/ui/card"

/**
 * Layout dùng chung cho các trang xác thực (`/login`, `/register`,
 * `/forgot-password`, `/reset-password`) — nằm ngoài `AppShell` vì người dùng
 * chưa đăng nhập, không cần thanh điều hướng đầy đủ.
 */
export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-sm flex-col justify-center px-4 py-8">
      <Link to="/discover" className="mb-4 text-lg font-semibold tracking-tight">
        RendeZ
      </Link>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <h1 className="text-lg font-semibold">{title}</h1>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {children}
        </CardContent>
        {footer && <CardFooter className="text-sm">{footer}</CardFooter>}
      </Card>
    </div>
  )
}
