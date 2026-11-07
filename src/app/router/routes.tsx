import type { RouteObject } from "react-router"
import { Navigate } from "react-router"
import { AppShell } from "@/components/layout/app-shell"
import { DesignShowcasePage } from "@/components/shared/design-showcase-page"
import { DiscoverPage } from "@/features/places/pages/discover-page"
import { SocialPage } from "@/features/social/pages/social-page"
import { NotificationPage } from "@/features/notification/pages/notification-page"

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <Navigate to="/discover" replace />,
  },
  {
    path: "/discover",
    element: (
      <AppShell>
        <DiscoverPage />
      </AppShell>
    ),
  },
  {
    path: "/social",
    element: (
      <AppShell>
        <SocialPage />
      </AppShell>
    ),
  },
  {
    path: "/notification",
    element: (
      <AppShell>
        <NotificationPage />
      </AppShell>
    ),
  },
  {
    path: "/design",
    element: <DesignShowcasePage />,
  },
]
