import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import { UserRoundXIcon } from "lucide-react"
import { ProfileHeader } from "../components/profile-header"
import { ProfileTabs } from "../components/profile-tabs"
import { useProfile } from "../hooks/use-profile"

interface UserProfilePageProps {
  handle: string
}

/** Trang cá nhân của người khác — `/u/:handle`. */
export function UserProfilePage({ handle }: UserProfilePageProps) {
  const { data: profile, isPending, isError } = useProfile(handle)

  if (isPending) {
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

  if (isError || !profile) {
    return (
      <div className="mx-auto max-w-md py-20">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UserRoundXIcon />
            </EmptyMedia>
            <EmptyTitle>Không tìm thấy người dùng</EmptyTitle>
            <EmptyDescription>Tài khoản @{handle} không tồn tại hoặc đã bị xoá.</EmptyDescription>
          </EmptyHeader>
        </Empty>
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
