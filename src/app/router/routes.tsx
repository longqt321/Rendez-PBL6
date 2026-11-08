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
import { CollectionDetailPage } from "@/features/collections/pages/collection-detail-page"
import { SettingsPage } from "@/features/settings/pages/settings-page"
import { NotFoundPage } from "@/features/not-found/pages/not-found-page"
import { RouteErrorPage } from "./route-error-page"

/**
 * `AppShell` là layout route duy nhất: mọi trang con render qua `<Outlet />`,
 * lỗi ở bất kỳ route con nào được `errorElement` bắt lại.
 */
export const routes: RouteObject[] = [
  {
    path: "/",
    element: <Navigate to="/discover" replace />,
  },
  {
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: "/discover", element: <DiscoverPage /> },
      { path: "/social", element: <SocialPage /> },
      { path: "/post/:id", element: <PostDetailPage /> },
      { path: "/notification", element: <NotificationPage /> },
      { path: "/discover/:id", element: <PlaceDetailPage /> },
      { path: "/search", element: <SearchPage /> },
      { path: "/saved", element: <SavedPage /> },
      { path: "/collections/:id", element: <CollectionDetailPage /> },
      { path: "/profile", element: <ProfilePage /> },
      { path: "/u/:handle", element: <UserProfilePageRoute /> },
      { path: "/settings", element: <SettingsPage /> },
      { path: "/design", element: <DesignShowcasePage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]
