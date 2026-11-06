import type { RouteObject } from "react-router"

export const routes: RouteObject[] = [
  {
    path: "/",
    element: (
      <main className="grid min-h-dvh place-items-center">
        <p className="text-sm text-muted-foreground">Chưa có trang nào được triển khai.</p>
      </main>
    ),
  },
]
