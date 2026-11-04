import { lazy, Suspense } from "react";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
  useLocation,
  type RouteObject,
} from "react-router";
import { AsyncState } from "../components/ui/states";
import { useMe } from "../lib/session";
import { Auth } from "./auth";
import { AppShell } from "./layouts/AppShell";
import { DiscoverPage } from "../features/discovery/DiscoverPage";
import { SearchPage } from "../features/search/SearchPage";
import { PlaceDetailPage } from "../features/places/PlaceDetailPage";
import { PhotoDetailPage } from "../features/experiences/PhotoDetailPage";
import { PostDetailPage } from "../features/experiences/PostDetailPage";
import { CreateExperiencePage } from "../features/contribute/CreateExperiencePage";
import { SubmissionDetailPage } from "../features/contribute/SubmissionDetailPage";
import { ProfilePage } from "../features/profile/ProfilePage";
import { SettingsPage } from "../features/profile/SettingsPage";
import { NotFoundPage } from "../features/shell/NotFoundPage";
import { TermsPage } from "../features/shell/TermsPage";

// MapLibre is by far the heaviest dependency; it is only downloaded when
// someone actually opens the map.
const MapPage = lazy(() =>
  import("./map").then((module) => ({ default: module.MapPage })),
);

/**
 * Session gate.
 *
 * The community post feed is public (the API allows it), but every place
 * surface is scoped to the viewer, so it needs a session. The gate therefore
 * guards the place screens rather than the entire application.
 */
export function RequireLogin() {
  const me = useMe();
  const location = useLocation();
  if (me.isPending) return <AsyncState pending loadingVariant="inline" />;
  if (me.isError)
    return <AsyncState error={me.error} onRetry={() => void me.refetch()} />;
  if (!me.data)
    return (
      <Navigate
        to="/login"
        replace
        state={{
          returnTo: location.pathname + location.search + location.hash,
        }}
      />
    );
  return <Outlet />;
}

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <Navigate to="/discover" replace />,
  },
  {
    path: "login",
    element: <Auth key="login" />,
  },
  {
    path: "register",
    element: <Auth key="register" register />,
  },
  {
    element: <AppShell />,
    children: [
      {
        path: "posts/:id",
        element: <PostDetailPage />,
      },
      {
        path: "terms",
        element: <TermsPage />,
      },
      {
        element: <RequireLogin />,
        children: [
          {
            path: "discover",
            element: <DiscoverPage />,
          },
          {
            path: "search",
            element: <SearchPage />,
          },
          {
            path: "map",
            element: (
              <Suspense
                fallback={
                  <p role="status" aria-label="Đang tải" className="muted">
                    Đang tải bản đồ…
                  </p>
                }
              >
                <MapPage />
              </Suspense>
            ),
          },
          {
            path: "places/:id",
            element: <PlaceDetailPage />,
          },
          {
            path: "photos/:id",
            element: <PhotoDetailPage />,
          },
          {
            path: "create",
            element: <CreateExperiencePage />,
          },
          {
            path: "submissions/:id",
            element: <SubmissionDetailPage />,
          },
          {
            path: "profile",
            element: <ProfilePage />,
          },
          {
            path: "settings",
            element: <SettingsPage />,
          },
          {
            path: "*",
            element: <NotFoundPage />,
          },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);

export default function App() {
  return <RouterProvider router={router} />;
}
