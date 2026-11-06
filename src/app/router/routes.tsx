import type { RouteObject } from "react-router"
import { DesignShowcasePage } from "@/components/shared/design-showcase-page"

export const routes: RouteObject[] = [
  {
    path: "/",
    element: (
      <main className="grid min-h-dvh place-items-center">
        <p className="text-sm text-muted-foreground">Chưa có trang nào được triển khai.</p>
      </main>
    ),
  },
  {
    path: "/design",
    element: <DesignShowcasePage />,
  },
]
