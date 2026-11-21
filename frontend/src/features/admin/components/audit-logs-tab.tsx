import { useState } from "react"
import { useDebounce } from "@uidotdev/usehooks"
import { ScrollTextIcon, SearchIcon } from "lucide-react"
import { ErrorState } from "@/components/shared/error-state"
import { LoadMore } from "@/components/shared/load-more"
import { Badge } from "@/components/ui/badge"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatRelativeTime } from "@/lib/format"
import { useAuditLogs } from "../hooks/use-admin"

const ENTITY_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "place_report", label: "Báo cáo" },
  { value: "place", label: "Địa điểm" },
  { value: "user", label: "Người dùng" },
  { value: "auth", label: "Xác thực" },
  { value: "system", label: "Hệ thống" },
]

function summarizeMeta(meta: Record<string, unknown>): string {
  const entries = Object.entries(meta).filter(([, value]) => value !== null && value !== undefined)
  if (entries.length === 0) return ""
  return entries
    .slice(0, 4)
    .map(([key, value]) => {
      const rendered =
        typeof value === "string" || typeof value === "number" || typeof value === "boolean"
          ? String(value)
          : JSON.stringify(value)
      return `${key}: ${rendered}`
    })
    .join(" · ")
}

export function AuditLogsTab() {
  const [searchText, setSearchText] = useState("")
  const debouncedQuery = useDebounce(searchText, 300)
  const [entity, setEntity] = useState("all")

  const logsQuery = useAuditLogs({
    entity,
    q: debouncedQuery,
  })
  const logs = logsQuery.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="w-full sm:w-64">
          <InputGroup>
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Tìm action, đối tượng, @handle…"
              aria-label="Tìm kiếm nhật ký hoạt động"
            />
          </InputGroup>
        </div>

        <ToggleGroup
          value={[entity]}
          onValueChange={(next) => {
            const selected = next[0]
            if (selected) setEntity(selected)
          }}
          variant="outline"
          size="sm"
          aria-label="Lọc loại đối tượng"
        >
          {ENTITY_FILTERS.map((item) => (
            <ToggleGroupItem
              key={item.value}
              value={item.value}
              className="min-h-9 px-3 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground sm:min-h-8"
            >
              {item.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {logsQuery.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={`log-adm-skel-${index}`} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : logsQuery.isError ? (
        <ErrorState
          variant="plain"
          title="Không tải được nhật ký hoạt động"
          onRetry={() => void logsQuery.refetch()}
        />
      ) : logs.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ScrollTextIcon />
            </EmptyMedia>
            <EmptyTitle>Chưa có nhật ký phù hợp</EmptyTitle>
            <EmptyDescription>Thử chọn nhóm đối tượng khác hoặc xoá từ khoá.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <ItemGroup className="gap-2">
            {logs.map((entry) => {
              const metaSummary = summarizeMeta(entry.meta)
              return (
                <Item key={entry.id} variant="outline" size="sm" className="items-start gap-3">
                  <ItemContent className="gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <ItemTitle className="font-mono text-xs font-semibold">
                        {entry.action}
                      </ItemTitle>
                      <Badge variant="secondary">{entry.entity}</Badge>
                      {entry.entityId ? (
                        <span className="font-mono text-xs text-muted-foreground">
                          {entry.entityId}
                        </span>
                      ) : null}
                    </div>
                    <ItemDescription className="text-xs">
                      {entry.actor ? `${entry.actor.name} (@${entry.actor.handle})` : "Hệ thống"} ·{" "}
                      {formatRelativeTime(entry.createdAt)}
                      {entry.ip ? ` · IP ${entry.ip}` : ""}
                    </ItemDescription>
                    {metaSummary ? (
                      <p className="text-xs break-all text-muted-foreground">{metaSummary}</p>
                    ) : null}
                  </ItemContent>
                  <ItemActions>
                    {entry.actor ? <Badge variant="outline">{entry.actor.role}</Badge> : null}
                  </ItemActions>
                </Item>
              )
            })}
          </ItemGroup>

          <LoadMore
            hasNextPage={logsQuery.hasNextPage}
            isFetchingNextPage={logsQuery.isFetchingNextPage}
            onLoadMore={() => logsQuery.fetchNextPage()}
            loadingLabel="Đang tải thêm nhật ký"
            endMessage="Đã hiển thị hết nhật ký."
          />
        </>
      )}
    </div>
  )
}
