import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router";
import { State, useMe } from "./shared";
import { Auth } from "./auth";
import { CreatorProfilePage } from "./creator";
import {
  ContributionDetailPage,
  ContributionHistory,
  NewContribution,
} from "./contributions";
import { AppShell } from "./layouts/AppShell";
import { DiscoverPage } from "../features/discovery/DiscoverPage";
import { SearchPage } from "../features/search/SearchPage";
import { SavedPage } from "../features/saved/SavedPage";
import { PlaceDetailPage } from "../features/places/PlaceDetailPage";
import { PhotoDetailPage } from "../features/experiences/PhotoDetailPage";
import { PostDetailPage } from "../features/experiences/PostDetailPage";
import { ExperiencesPage } from "../features/experiences/ExperiencesPage";
import { CreateExperiencePage } from "../features/contribute/CreateExperiencePage";
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
  if (me.isPending) return <State pending />;
  if (me.isError)
    return <State error={me.error} onRetry={() => void me.refetch()} />;
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/discover" replace />} />

      {/* Auth screens own the whole viewport and sit outside the shell. */}
      <Route path="login" element={<Auth key="login" />} />
      <Route path="register" element={<Auth key="register" register />} />

      <Route element={<AppShell />}>
        {/* Public: the community feed and a single experience. */}
        <Route path="posts" element={<ExperiencesPage />} />
        <Route path="posts/:id" element={<PostDetailPage />} />
        {/* Public: the terms must be readable before an account exists. */}
        <Route path="terms" element={<TermsPage />} />

        <Route element={<RequireLogin />}>
          <Route path="discover" element={<DiscoverPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route
            path="map"
            element={
              <Suspense
                fallback={
                  <p role="status" aria-label="Đang tải" className="muted">
                    Đang tải bản đồ…
                  </p>
                }
              >
                <MapPage />
              </Suspense>
            }
          />
          <Route path="places/:id" element={<PlaceDetailPage />} />
          <Route path="photos/:id" element={<PhotoDetailPage />} />
          <Route path="creators/:id" element={<CreatorProfilePage />} />
          <Route path="saved" element={<SavedPage />} />
          <Route path="create" element={<CreateExperiencePage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="submissions" element={<ContributionHistory />} />
          <Route path="submissions/new" element={<NewContribution />} />
          <Route path="submissions/:id" element={<ContributionDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
