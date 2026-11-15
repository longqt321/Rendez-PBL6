import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ActivityIcon, RefreshCwIcon } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { api, toApiError } from "@/lib/axios"

interface SystemStats {
  uptimeMs: number
  totalQueries: number
  avgLatencyMs: number
  cacheHitRatio: number
  byEndpoint: { route: string; count: number }[]
  venues: {
    total: number
    published: number
    withImages: number
    withTags: number
    withHours: number
  }
}

export function SystemPage() {
  const queryClient = useQueryClient()

  const statsQuery = useQuery({
    queryKey: ["system", "stats"],
    queryFn: async ({ signal }): Promise<SystemStats> => {
      const { data } = await api.get<SystemStats>("/system/stats", { signal })
      return data
    },
    refetchInterval: 5_000,
  })

  const resetMutation = useMutation({
    mutationFn: async () => {
      await api.post("/system/reset")
    },
    onSuccess: async () => {
      toast.success("Đã đặt lại bộ đếm")
      await queryClient.invalidateQueries({ queryKey: ["system"] })
    },
    onError: (error) => {
      toast.error(toApiError(error).message)
    },
  })

  const stats = statsQuery.data

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <ActivityIcon className="size-5 text-primary" aria-hidden="true" />
            Số liệu vận hành
          </h1>
          <p className="text-sm text-muted-foreground">
            Số liệu thật từ tiến trình API và cơ sở dữ liệu — trang demo, không có trong menu.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => resetMutation.mutate()}
          disabled={resetMutation.isPending}
        >
          {resetMutation.isPending ? (
            <Spinner className="size-4" aria-label="Đang đặt lại" />
          ) : (
            <RefreshCwIcon className="size-4" aria-hidden="true" />
          )}
          Đặt lại
        </Button>
      </div>

      {statsQuery.isPending ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-6" aria-label="Đang tải số liệu" />
        </div>
      ) : statsQuery.isError ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Không tải được số liệu — kiểm tra API có đang chạy không.
          </CardContent>
        </Card>
      ) : stats ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardDescription>Tổng truy vấn đã phục vụ</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{stats.totalQueries}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Thời gian hoạt động: {Math.round(stats.uptimeMs / 1000)} giây
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Độ trễ trung bình</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{stats.avgLatencyMs} ms</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Tỉ lệ cache hit: {(stats.cacheHitRatio * 100).toFixed(0)}%
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Dữ liệu địa điểm</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Tổng số quán</dt>
                <dd className="text-right font-semibold tabular-nums">{stats.venues.total}</dd>
                <dt className="text-muted-foreground">Đã đăng</dt>
                <dd className="text-right font-semibold tabular-nums">{stats.venues.published}</dd>
                <dt className="text-muted-foreground">Có ảnh</dt>
                <dd className="text-right font-semibold tabular-nums">{stats.venues.withImages}</dd>
                <dt className="text-muted-foreground">Có thẻ</dt>
                <dd className="text-right font-semibold tabular-nums">{stats.venues.withTags}</dd>
                <dt className="text-muted-foreground">Có giờ mở cửa</dt>
                <dd className="text-right font-semibold tabular-nums">{stats.venues.withHours}</dd>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Theo endpoint</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.byEndpoint.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có request nào.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {stats.byEndpoint.slice(0, 8).map((endpoint) => (
                    <li key={endpoint.route} className="flex items-center justify-between gap-3">
                      <span className="truncate font-mono text-xs">{endpoint.route}</span>
                      <Badge variant="outline" className="tabular-nums">
                        {endpoint.count}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
