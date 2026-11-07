import type { RouteObject } from "react-router"
import { Navigate } from "react-router"
import { AppShell } from "@/components/layout/app-shell"
import { DesignShowcasePage } from "@/components/shared/design-showcase-page"
import { DiscoverPage } from "@/features/places/pages/discover-page"
import { SocialPage } from "@/features/social/pages/social-page"
import { PostDetailPage } from "@/features/social/pages/post-detail-page"
import { NotificationPage } from "@/features/notification/pages/notification-page"
import { ProfilePage } from "@/features/profile/pages/profile-page"
import { UserProfilePageRoute } from "./user-profile-route"
import { PlaceDetailPage } from "@/features/places/pages/place-detail-page"
import { SearchPage } from "@/features/search/pages/search-page"
import { SavedPage } from "@/features/saved/pages/saved-page"
import { SettingsPage } from "@/features/settings/pages/settings-page"
import { NotFoundPage } from "@/features/not-found/pages/not-found-page"

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
    path: "/post/:id",
    element: (
      <AppShell>
        <PostDetailPage />
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
    path: "/discover/:id",
    element: (
      <AppShell>
        <PlaceDetailPage />
      </AppShell>
    ),
  },
  {
    path: "/search",
    element: (
      <AppShell>
        <SearchPage />
      </AppShell>
    ),
  },
  {
    path: "/saved",
    element: (
      <AppShell>
        <SavedPage />
      </AppShell>
    ),
  },
  {
    path: "/profile",
    element: (
      <AppShell>
        <ProfilePage />
      </AppShell>
    ),
  },
  {
    path: "/u/:handle",
    element: (
      <AppShell>
        <UserProfilePageRoute />
      </AppShell>
    ),
  },
  {
    path: "/settings",
    element: (
      <AppShell>
        <SettingsPage />
      </AppShell>
    ),
  },
  {
    path: "/design",
    element: (
      <AppShell>
        <DesignShowcasePage />
      </AppShell>
    ),
  },
  {
    path: "*",
    element: (
      <AppShell>
        <NotFoundPage />
      </AppShell>
    ),
  },
]
