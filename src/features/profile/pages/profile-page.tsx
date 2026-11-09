import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { ProfileHeader } from "../components/profile-header"
import { ProfileTabs } from "../components/profile-tabs"
import { useMe } from "../hooks/use-me"

/** Trang cá nhân của bản thân — `/profile`. */
export function ProfilePage() {
  const { data: profile, isPending, isError, refetch } = useMe()

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="sr-only">Trang cá nhân</h1>
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
      <div className="mx-auto max-w-md px-4 py-20">
        <h1 className="sr-only">Trang cá nhân</h1>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Không tải được hồ sơ</EmptyTitle>
            <EmptyDescription>Kiểm tra kết nối rồi thử lại.</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" onClick={() => void refetch()}>
            Thử lại
          </Button>
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
