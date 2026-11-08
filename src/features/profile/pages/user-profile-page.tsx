import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
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
      <div className="mx-auto w-full max-w-4xl">
        <Skeleton className="h-50 w-full rounded-none" />
        <div className="flex flex-col gap-3 px-4 pt-4 lg:px-6">
          <Skeleton className="size-24 rounded-full" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </div>
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
