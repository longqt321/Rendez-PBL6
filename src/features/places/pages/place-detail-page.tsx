import { Link, useParams } from "react-router"
import { MapPinIcon, StarIcon } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Badge } from "@/components/ui/badge"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SeedImage } from "@/components/shared/seed-image"
import { formatCount } from "@/lib/format"
import { categoryLabel } from "../lib/category-meta"
import { usePlace } from "../hooks/use-place"
import { usePlacePosts } from "../hooks/use-place-posts"

/** Trang chi tiết địa điểm — `/discover/:id`. */
export function PlaceDetailPage() {
  const { id } = useParams()
  const { data: place, isPending, isError } = usePlace(id ?? "")
  const { data: postsData, isPending: postsPending } = usePlacePosts(id ?? "")
  const posts = postsData?.pages.flatMap((page) => page.items) ?? []

  if (isPending) {
    return (
      <div
        className="flex items-center justify-center py-24"
        role="status"
        aria-label="Đang tải địa điểm"
      >
        <Spinner className="size-6" />
      </div>
    )
  }

  if (isError || !place) {
    return (
      <div className="mx-auto max-w-md py-20">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MapPinIcon />
            </EmptyMedia>
            <EmptyTitle>Không tìm thấy địa điểm</EmptyTitle>
            <EmptyDescription>Địa điểm này chưa được đăng hoặc không tồn tại.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 lg:px-8 lg:py-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link to="/discover" />}>Khám phá</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{place.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mt-4 overflow-hidden rounded-[0.25rem] border-2 border-foreground bg-card shadow-[4px_4px_0_0_var(--foreground)]">
        <SeedImage
          seed={place.imageSeed}
          height={280}
          className="w-full"
          alt={`Ảnh minh hoạ ${place.name}`}
        />

        <div className="flex flex-col gap-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-xl font-bold tracking-tight">{place.name}</h1>
            <Badge variant="secondary">{categoryLabel(place.category)}</Badge>
          </div>

          <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPinIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {place.address}, {place.city}
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-bold text-foreground">
              <StarIcon className="size-3.5 fill-current" aria-hidden="true" />
              {place.rating.toFixed(1)}
            </span>
            <span>{formatCount(place.reviewCount)} đánh giá</span>
            <span aria-label={`Mức giá ${place.priceLevel} trên 3`} className="font-bold">
              {"₫".repeat(place.priceLevel)}
            </span>
          </div>

          <ul className="mt-1 flex flex-wrap gap-1.5">
            {place.tags.map((tag) => (
              <li key={tag}>
                <Badge variant="outline">#{tag}</Badge>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Tabs defaultValue="posts" className="mt-6">
        <TabsList>
          <TabsTrigger value="posts">Bài đăng</TabsTrigger>
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4">
          {postsPending ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Đang tải bài đăng…</p>
          ) : posts.length === 0 ? (
            <Empty className="mt-2">
              <EmptyHeader>
                <EmptyTitle>Chưa có bài đăng nào</EmptyTitle>
                <EmptyDescription>Các bài gắn địa điểm này sẽ xuất hiện ở đây.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="flex flex-col gap-3">
              {posts.map((post) => (
                <li key={post.id}>
                  <Link
                    to={`/post/${post.id}`}
                    className="flex items-start gap-3 rounded-[0.25rem] border-2 border-foreground/15 p-3 transition-colors hover:bg-muted"
                  >
                    <SeedImage
                      seed={post.imageSeed}
                      height={120}
                      className="w-20 shrink-0 rounded-[0.15rem]"
                      alt=""
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {post.author.name} · {post.commentCount} bình luận · {post.likeCount} thích
                      </p>
                      <p className="mt-1 line-clamp-3 text-sm leading-snug">{post.caption}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="overview" className="mt-4">
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            {place.name} nằm ở {place.city}. Địa điểm do cộng đồng đăng và được kiểm duyệt trước khi
            xuất hiện trên trang Khám phá.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
