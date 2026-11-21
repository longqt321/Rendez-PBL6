import { PageContainer } from "@/components/layout/page-primitives"
import { ErrorState } from "@/components/shared/error-state"
import { Skeleton } from "@/components/ui/skeleton"
import { ProfileHeader } from "../components/profile-header"
import { ProfileTabs } from "../components/profile-tabs"
import { useMe } from "../hooks/use-me"

export function ProfilePage() {
  const { data: profile, isPending, isError, refetch } = useMe()

  if (isPending) {
    return (
      <PageContainer size="default">
        <h1 className="sr-only">Trang cá nhân</h1>
        <Skeleton className="h-52 w-full rounded-surface" />
        <div className="mt-4 flex flex-col gap-3">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-60" />
          <div className="flex gap-6 pt-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </PageContainer>
    )
  }

  if (isError || !profile) {
    return (
      <PageContainer size="narrow" className="py-20">
        <h1 className="sr-only">Trang cá nhân</h1>
        <ErrorState title="Không tải được hồ sơ" onRetry={() => void refetch()} />
      </PageContainer>
    )
  }

  return (
    <PageContainer size="default">
      <ProfileHeader profile={profile} />
      <ProfileTabs profile={profile} />
    </PageContainer>
  )
}
