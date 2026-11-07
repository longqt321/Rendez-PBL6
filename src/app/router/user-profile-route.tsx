import { Navigate, useParams } from "react-router"
import { UserProfilePage } from "@/features/profile/pages/user-profile-page"

/**
 * Đọc `:handle` từ URL rồi chuyển cho trang.
 *
 * Tách khỏi `routes.tsx` để file đó giữ đúng một export (mảng routes) —
 * quy tắc react-refresh chỉ cho phép file export component.
 */
export function UserProfilePageRoute() {
  const { handle } = useParams()
  if (!handle) return <Navigate to="/discover" replace />
  return <UserProfilePage handle={handle} />
}
