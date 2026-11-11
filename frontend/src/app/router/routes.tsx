import { lazy } from "react"
import type { RouteObject } from "react-router"
import { Navigate } from "react-router"
import { AppShell } from "@/components/layout/app-shell"
import { RouteErrorPage } from "./route-error-page"

/**
 * Trang được tách chunk theo route (`React.lazy`) — bundle khởi động chỉ còn
 * shell + trang đầu tiên, các trang nặng (bản đồ/Leaflet, social) tải khi cần.
 * `Suspense` fallback nằm trong `AppShell` nên mọi route con đều có.
 */
const DiscoverPage = lazy(() =>
  import("@/features/places/pages/discover-page").then((m) => ({ default: m.DiscoverPage })),
)
const MapPage = lazy(() =>
  import("@/features/places/pages/map-page").then((m) => ({ default: m.MapPage })),
)
const PlaceDetailPage = lazy(() =>
  import("@/features/places/pages/place-detail-page").then((m) => ({ default: m.PlaceDetailPage })),
)
const SocialPage = lazy(() =>
  import("@/features/social/pages/social-page").then((m) => ({ default: m.SocialPage })),
)
const PostDetailPage = lazy(() =>
  import("@/features/social/pages/post-detail-page").then((m) => ({ default: m.PostDetailPage })),
)
const NotificationPage = lazy(() =>
  import("@/features/notification/pages/notification-page").then((m) => ({
    default: m.NotificationPage,
  })),
)
const ProfilePage = lazy(() =>
  import("@/features/profile/pages/profile-page").then((m) => ({ default: m.ProfilePage })),
)
const UserProfilePageRoute = lazy(() =>
  import("./user-profile-route").then((m) => ({ default: m.UserProfilePageRoute })),
)
const SearchPage = lazy(() =>
  import("@/features/search/pages/search-page").then((m) => ({ default: m.SearchPage })),
)
const SavedPage = lazy(() =>
  import("@/features/saved/pages/saved-page").then((m) => ({ default: m.SavedPage })),
)
const CollectionDetailPage = lazy(() =>
  import("@/features/collections/pages/collection-detail-page").then((m) => ({
    default: m.CollectionDetailPage,
  })),
)
const RoomPage = lazy(() =>
  import("@/features/rooms/pages/room-page").then((m) => ({ default: m.RoomPage })),
)
const SettingsPage = lazy(() =>
  import("@/features/settings/pages/settings-page").then((m) => ({ default: m.SettingsPage })),
)
const NotFoundPage = lazy(() =>
  import("@/features/not-found/pages/not-found-page").then((m) => ({ default: m.NotFoundPage })),
)
const LoginPage = lazy(() =>
  import("@/features/auth/pages/login-page").then((m) => ({ default: m.LoginPage })),
)
const RegisterPage = lazy(() =>
  import("@/features/auth/pages/register-page").then((m) => ({ default: m.RegisterPage })),
)
const ForgotPasswordPage = lazy(() =>
  import("@/features/auth/pages/forgot-password-page").then((m) => ({
    default: m.ForgotPasswordPage,
  })),
)
const ResetPasswordPage = lazy(() =>
  import("@/features/auth/pages/reset-password-page").then((m) => ({
    default: m.ResetPasswordPage,
  })),
)

/**
 * `AppShell` là layout route duy nhất: mọi trang con render qua `<Outlet />`,
 * lỗi ở bất kỳ route con nào được `errorElement` bắt lại.
 */
export const routes: RouteObject[] = [
  {
    path: "/",
    element: <Navigate to="/discover" replace />,
  },
  /*
   * Trang xác thực đứng NGOÀI `AppShell`: người dùng chưa đăng nhập không cần
   * thanh điều hướng, và layout riêng giữ form gọn trên một cột.
   */
  { path: "/login", element: <LoginPage />, errorElement: <RouteErrorPage /> },
  { path: "/register", element: <RegisterPage />, errorElement: <RouteErrorPage /> },
  {
    path: "/forgot-password",
    element: <ForgotPasswordPage />,
    errorElement: <RouteErrorPage />,
  },
  {
    path: "/reset-password",
    element: <ResetPasswordPage />,
    errorElement: <RouteErrorPage />,
  },
  {
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: "/discover", element: <DiscoverPage /> },
      { path: "/map", element: <MapPage /> },
      { path: "/social", element: <SocialPage /> },
      { path: "/post/:id", element: <PostDetailPage /> },
      { path: "/notification", element: <NotificationPage /> },
      { path: "/discover/:id", element: <PlaceDetailPage /> },
      { path: "/search", element: <SearchPage /> },
      { path: "/saved", element: <SavedPage /> },
      { path: "/collections/:id", element: <CollectionDetailPage /> },
      { path: "/rooms/:code", element: <RoomPage /> },
      { path: "/profile", element: <ProfilePage /> },
      { path: "/u/:handle", element: <UserProfilePageRoute /> },
      { path: "/settings", element: <SettingsPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]
