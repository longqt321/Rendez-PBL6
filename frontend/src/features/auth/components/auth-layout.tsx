import type { ReactNode } from "react"
import { Link } from "react-router"
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
    <div className="mx-auto flex min-h-svh w-full max-w-sm flex-col justify-center px-4 py-8">
      <Link
        to="/discover"
        className="mb-4 flex items-center gap-2 font-heading text-xl font-bold tracking-tight"
      >
        <span
          aria-hidden="true"
          className="grid size-8 place-items-center rounded-control border border-border bg-secondary text-sm font-bold text-secondary-foreground"
        >
          R
        </span>{" "}
        Rendez
      </Link>
      <Card>
        <CardContent className="flex flex-col gap-5">
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight">{title}</h1>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          {children}
        </CardContent>
        {footer && <CardFooter className="justify-center text-sm">{footer}</CardFooter>}
      </Card>
    </div>
  )
}
