import { NuqsAdapter } from "nuqs/adapters/react-router/v8"
import { createBrowserRouter, RouterProvider } from "react-router"
import { routes } from "./routes"

const router = createBrowserRouter(routes)

export function AppRouter() {
  return (
    <NuqsAdapter>
      <RouterProvider router={router} />
    </NuqsAdapter>
  )
}
