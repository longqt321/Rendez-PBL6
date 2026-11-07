import { useState } from "react"
import { Link } from "react-router"
import { SearchIcon, SearchXIcon, UsersIcon } from "lucide-react"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDiscoverPlaces } from "@/features/places/hooks/use-discover-places"
import { PlaceCard } from "@/features/places/components/place-card"
import { usePosts } from "@/features/social/hooks/use-posts"
import { PostCard } from "@/features/social/components/post-card"
import { useMe } from "@/features/profile/hooks/use-me"
import { MOCK_USERS } from "@/mocks/fixtures/users"

/**
 * Trang tìm kiếm — `/search?q=`.
 *
 * Dùng lại đúng các hook dữ liệu đã có (places/posts): server chịu trách nhiệm
 * lọc theo `q`. Tab Người lọc trên danh sách hồ sơ mock, chưa có endpoint.
 */
export function SearchPage() {
  const [query, setQuery] = useState("")
  const { data: placesData, isPending: placesPending } = useDiscoverPlaces({
    category: "all",
    query,
  })
  const { data: postsData, isPending: postsPending } = usePosts("all")
  const { data: me } = useMe()

  const places = placesData?.pages.flatMap((page) => page.items) ?? []
  const posts = postsData?.items.filter((post) => post.placeId !== null) ?? []
  const people = query
    ? Object.values(MOCK_USERS).filter((user) =>
        `${user.name} ${user.handle}`.toLowerCase().includes(query.toLowerCase()),
      )
    : []

  const hasQuery = query.trim().length > 0

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Tìm kiếm</h1>
        <p className="text-sm text-muted-foreground">
          Tìm quán ăn, địa điểm, bài viết và người dùng.
        </p>
      </header>

      <form role="search" className="mt-4 max-w-md" onSubmit={(event) => event.preventDefault()}>
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm quán ăn, địa điểm, bài viết…"
            aria-label="Tìm kiếm"
          />
        </InputGroup>
      </form>

      {!hasQuery ? (
        <Empty className="mt-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchIcon />
            </EmptyMedia>
            <EmptyTitle>Bắt đầu gõ để tìm kiếm</EmptyTitle>
            <EmptyDescription>
              Kết quả từ Địa điểm, Bài đăng và Người dùng sẽ hiện ở đây.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Tabs defaultValue="places" className="mt-5">
          <TabsList>
            <TabsTrigger value="places">Địa điểm</TabsTrigger>
            <TabsTrigger value="posts">Bài đăng</TabsTrigger>
            <TabsTrigger value="people">Người</TabsTrigger>
          </TabsList>

          <TabsContent value="places" className="mt-4">
            {placesPending ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Đang tìm…</p>
            ) : places.length === 0 ? (
              <SearchEmptyBlock label="địa điểm" />
            ) : (
              <ul className="grid grid-cols-2 items-start gap-4 md:grid-cols-3">
                {places.map((place) => (
                  <li key={place.id}>
                    <PlaceCard place={place} />
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="posts" className="mt-4">
            {postsPending ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Đang tìm…</p>
            ) : posts.length === 0 ? (
              <SearchEmptyBlock label="bài đăng" />
            ) : (
              <ul className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
                {posts.map((post) => (
                  <li key={post.id}>
                    <PostCard post={post} />
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="people" className="mt-4">
            {people.length === 0 ? (
              <SearchEmptyBlock label="người dùng" />
            ) : (
              <ul className="grid max-w-xl grid-cols-1 gap-2">
                {people.map((user) => (
                  <li key={user.id}>
                    <Link
                      to={user.isMe ? "/profile" : `/u/${user.handle}`}
                      className="flex items-center gap-3 rounded-[0.25rem] border-2 border-foreground/15 p-3 transition-colors hover:bg-muted"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                        {user.initials}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {user.name}
                          {me && user.id === me.id ? " (bạn)" : ""}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          @{user.handle} · {user.postCount} bài đăng
                        </span>
                      </span>
                      <UsersIcon
                        className="ml-auto size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

function SearchEmptyBlock({ label }: { label: string }) {
  return (
    <Empty className="mt-2">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle>Không có {label} phù hợp</EmptyTitle>
        <EmptyDescription>Thử từ khoá khác hoặc ngắn hơn.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
