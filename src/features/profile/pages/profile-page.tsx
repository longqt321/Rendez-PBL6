import { Spinner } from "@/components/ui/spinner"
import { ProfileHeader } from "../components/profile-header"
import { ProfileTabs } from "../components/profile-tabs"
import { useMe } from "../hooks/use-me"

/** Trang cá nhân của bản thân — `/profile`. */
export function ProfilePage() {
  const { data: profile, isPending } = useMe()

  if (isPending || !profile) {
    return (
      <div
        className="flex items-center justify-center py-24"
        role="status"
        aria-label="Đang tải hồ sơ"
      >
        <Spinner className="size-6" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <ProfileHeader profile={profile} />
      <div className="px-4 pb-10 lg:px-6">
        <ProfileTabs profile={profile} />
      </div>
    </div>
  )
}
