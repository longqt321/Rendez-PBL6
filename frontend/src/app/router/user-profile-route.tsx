import { Navigate, useParams } from "react-router"
import { UserProfilePage } from "@/features/profile/pages/user-profile-page"

export function UserProfilePageRoute() {
  const { handle } = useParams()
  if (!handle) return <Navigate to="/discover" replace />
  return <UserProfilePage handle={handle} />
}
