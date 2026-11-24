import { Link } from "react-router"
import { SearchIcon, SearchXIcon, UsersIcon } from "lucide-react"
import { ErrorState } from "@/components/shared/error-state"
import { LoadMore } from "@/components/shared/load-more"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import { PlaceCard } from "@/features/places/components/place-card"
import { PlaceCardSkeleton } from "@/features/places/components/place-card-skeleton"
import type { Place } from "@/features/places/types/place"
import type { UserProfile } from "@/features/profile/types/profile"
import { PostCard } from "@/features/social/components/post-card"
import type { Post } from "@/features/social/types/post"
import { loginRedirectUrl } from "@/lib/axios"
import { formatCount } from "@/lib/format"
import { FollowButton } from "./follow-button"
import { UserSuggestionsSection } from "./user-suggestions-section"

const DANANG_SEARCH_SUGGESTIONS = [
  "Mì Quảng",
  "Bánh xèo",
  "Bún chả cá",
  "Hải sản",
  "Cà phê",
] as const

interface SearchPaginationFooterProps {
  readonly sentinelRef: React.Ref<HTMLDivElement>
  readonly hasNextPage: boolean
  readonly isFetchingNextPage: boolean
  readonly onFetchNextPage: () => unknown
  readonly label: string
}

function SearchPaginationFooter({
  sentinelRef,
  hasNextPage,
  isFetchingNextPage,
  onFetchNextPage,
  label,
}: SearchPaginationFooterProps) {
  return (
    <LoadMore
      sentinelRef={sentinelRef}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={onFetchNextPage}
      loadingLabel={`Đang tải thêm ${label}`}
      endMessage={`Đã hiển thị hết kết quả ${label}.`}
    />
  )
}

interface SearchPlacesTabContentProps {
  readonly placesPending: boolean
  readonly placesError: boolean
  readonly places: Place[]
  readonly onRetry: () => void
  readonly sentinelRef: React.Ref<HTMLDivElement>
  readonly hasNextPage: boolean
  readonly isFetchingNextPage: boolean
  readonly onFetchNextPage: () => unknown
}

export function SearchPlacesTabContent({
  placesPending,
  placesError,
  places,
  onRetry,
  sentinelRef,
  hasNextPage,
  isFetchingNextPage,
  onFetchNextPage,
}: SearchPlacesTabContentProps) {
  if (placesPending) {
    return (
      <ul className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <li key={`skel-sp-${index}`}>
            <PlaceCardSkeleton imageHeight={240} />
          </li>
        ))}
      </ul>
    )
  }
  if (placesError) {
    return <ErrorState variant="plain" title="Không tải được kết quả địa điểm" onRetry={onRetry} />
  }
  if (places.length === 0) {
    return <SearchEmptyBlock label="địa điểm" showSuggestions />
  }
  return (
    <>
      <ul className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {places.map((place) => (
          <li key={place.id}>
            <PlaceCard place={place} />
          </li>
        ))}
      </ul>
      <SearchPaginationFooter
        sentinelRef={sentinelRef}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onFetchNextPage={onFetchNextPage}
        label="địa điểm"
      />
    </>
  )
}

interface SearchPostsTabContentProps {
  readonly postsPending: boolean
  readonly postsError: boolean
  readonly posts: Post[]
  readonly onRetry: () => void
  readonly sentinelRef: React.Ref<HTMLDivElement>
  readonly hasNextPage: boolean
  readonly isFetchingNextPage: boolean
  readonly onFetchNextPage: () => unknown
}

export function SearchPostsTabContent({
  postsPending,
  postsError,
  posts,
  onRetry,
  sentinelRef,
  hasNextPage,
  isFetchingNextPage,
  onFetchNextPage,
}: SearchPostsTabContentProps) {
  if (postsPending) {
    return (
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={`skel-post-${index}`} className="h-64 w-full rounded-surface" />
        ))}
      </div>
    )
  }
  if (postsError) {
    return <ErrorState variant="plain" title="Không tải được kết quả bài đăng" onRetry={onRetry} />
  }
  if (posts.length === 0 && !hasNextPage) {
    return <SearchEmptyBlock label="bài đăng" />
  }
  return (
    <>
      {posts.length > 0 ? (
        <ul className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard post={post} />
            </li>
          ))}
        </ul>
      ) : null}
      <SearchPaginationFooter
        sentinelRef={sentinelRef}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onFetchNextPage={onFetchNextPage}
        label="bài đăng"
      />
    </>
  )
}

interface SearchPeopleTabContentProps {
  readonly peoplePending: boolean
  readonly peopleError: boolean
  readonly people: UserProfile[]
  readonly onRetry: () => void
  readonly me: UserProfile | null | undefined
  readonly suggestionsLength: number
  readonly locationString: string
  readonly sentinelRef: React.Ref<HTMLDivElement>
  readonly hasNextPage: boolean
  readonly isFetchingNextPage: boolean
  readonly onFetchNextPage: () => unknown
}

function SearchPeopleBody({
  peoplePending,
  peopleError,
  people,
  onRetry,
  me,
  suggestionsLength,
  locationString,
  sentinelRef,
  hasNextPage,
  isFetchingNextPage,
  onFetchNextPage,
}: SearchPeopleTabContentProps) {
  if (peoplePending) {
    return (
      <div className="grid max-w-xl grid-cols-1 gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={`skel-usr-${index}`} className="h-16 w-full rounded-surface" />
        ))}
      </div>
    )
  }
  if (peopleError) {
    return (
      <ErrorState variant="plain" title="Không tải được kết quả người dùng" onRetry={onRetry} />
    )
  }
  if (people.length === 0) {
    return (
      <>
        <SearchEmptyBlock label="người dùng" />
        {me && suggestionsLength > 0 ? (
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Không tìm thấy ai tên này. Bạn có thể xem những người được gợi ý ở trên.
          </p>
        ) : null}
        {!me ? (
          <p className="mt-2 text-center text-sm text-muted-foreground">
            <Link
              to={loginRedirectUrl(locationString)}
              className="font-medium text-foreground underline underline-offset-4"
            >
              Đăng nhập để xem gợi ý theo dõi
            </Link>
          </p>
        ) : null}
      </>
    )
  }
  return (
    <>
      <ul className="grid max-w-xl grid-cols-1 gap-2" aria-label="Kết quả tìm kiếm người dùng">
        {people.map((user) => (
          <li key={user.id}>
            <Item
              variant="outline"
              className="rounded-surface bg-card transition-colors hover:bg-muted"
              render={<Link to={`/u/${user.handle}`} />}
            >
              <ItemMedia>
                <Avatar size="lg">
                  {user.avatarUrl && (
                    <AvatarImage src={user.avatarUrl} alt={`Ảnh đại diện của ${user.name}`} />
                  )}
                  <AvatarFallback className="bg-accent text-sm font-bold text-accent-foreground">
                    {user.initials}
                  </AvatarFallback>
                </Avatar>
              </ItemMedia>
              <ItemContent>
                <ItemTitle className="text-sm font-semibold">
                  {user.name}
                  {me && user.id === me.id ? " (bạn)" : ""}
                </ItemTitle>
                <ItemDescription className="text-xs">
                  @{user.handle} · {formatCount(user.postCount)} bài đăng
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                {me && user.id === me.id ? (
                  <UsersIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                ) : (
                  <FollowButton user={user} />
                )}
              </ItemActions>
            </Item>
          </li>
        ))}
      </ul>
      <SearchPaginationFooter
        sentinelRef={sentinelRef}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onFetchNextPage={onFetchNextPage}
        label="người dùng"
      />
    </>
  )
}

export function SearchPeopleTabContent(props: SearchPeopleTabContentProps) {
  return (
    <>
      <UserSuggestionsSection />
      <SearchPeopleBody {...props} />
    </>
  )
}

function SearchEmptyBlock({
  label,
  showSuggestions = false,
}: Readonly<{ label: string; showSuggestions?: boolean }>) {
  return (
    <Empty className="mt-4 border border-dashed border-border bg-card/50 py-10">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle>Không có {label} phù hợp</EmptyTitle>
        <EmptyDescription>Thử từ khoá khác hoặc ngắn hơn.</EmptyDescription>
      </EmptyHeader>
      {showSuggestions ? (
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {DANANG_SEARCH_SUGGESTIONS.map((term) => (
            <Button
              key={term}
              size="sm"
              variant="outline"
              className="rounded-full text-xs"
              render={<Link to={`/search?q=${encodeURIComponent(term)}`} />}
            >
              <SearchIcon className="size-3.5 text-primary" aria-hidden="true" />
              {term}
            </Button>
          ))}
        </div>
      ) : null}
    </Empty>
  )
}
