import { useMemo, useState } from "react"
import type { AuditLogEntry } from "@rendez/schema"
import { useDebounce } from "@uidotdev/usehooks"
import { ChevronDownIcon, ScrollTextIcon, SearchIcon } from "lucide-react"
import { parseAsString, useQueryState } from "nuqs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatRelativeTime } from "@/lib/format"
import { useAdminOverview, useAuditLogs } from "../hooks/use-admin"
import { ADMIN_UI, auditActionVariant } from "../lib/admin-constants"
import { AuditFrequencyChart } from "./audit-logs/audit-frequency-chart"
import { AuditInspectorSheet } from "./audit-logs/audit-inspector-sheet"
import { AdminDataTable, type AdminColumnDef } from "./shared/admin-data-table"
import { useAdminRuntime } from "./shared/admin-env-store"

const ENTITY_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "place_report", label: "Báo cáo" },
  { value: "place", label: "Địa điểm" },
  { value: "user", label: "Người dùng" },
  { value: "auth", label: "Xác thực" },
  { value: "system", label: "Hệ thống" },
]

const ACTION_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "Mọi hành động" },
  { value: "report.resolve", label: "report.resolve" },
  { value: "place.publish", label: "place.publish" },
  { value: "place.unpublish", label: "place.unpublish" },
  { value: "place.update", label: "place.update" },
  { value: "user.ban", label: "user.ban" },
  { value: "user.unban", label: "user.unban" },
  { value: "user.role_change", label: "user.role_change" },
]

function summarizeMeta(meta: Record<string, unknown>): string {
  const entries = Object.entries(meta).filter(([, value]) => value !== null && value !== undefined)
  if (entries.length === 0) return "-"
  return entries
    .slice(0, ADMIN_UI.AUDIT_META_PREVIEW_FIELDS)
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
  const { runtime } = useAdminRuntime()
  const [searchText, setSearchText] = useQueryState(
    "lQ",
    parseAsString.withDefault("").withOptions({ history: "replace" }),
  )
  const debouncedQuery = useDebounce(searchText, ADMIN_UI.DEBOUNCE_SEARCH_MS)
  const [entity, setEntity] = useQueryState(
    "lEntity",
    parseAsString.withDefault("all").withOptions({ history: "replace" }),
  )
  const [action, setAction] = useQueryState(
    "lAction",
    parseAsString.withDefault("all").withOptions({ history: "replace" }),
  )
  const [selected, setSelected] = useState<AuditLogEntry | null>(null)

  const overviewQuery = useAdminOverview()
  const logsQuery = useAuditLogs({ entity, action, q: debouncedQuery })
  const logs = useMemo(
    () => logsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [logsQuery.data],
  )

  const columns = useMemo<AdminColumnDef<AuditLogEntry>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "Thời gian",
        cell: ({ row }) => (
          <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
            {formatRelativeTime(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "actor",
        accessorFn: (row) => row.actor?.handle ?? "system",
        header: "Người thực hiện",
        cell: ({ row }) =>
          row.original.actor ? (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-medium">@{row.original.actor.handle}</span>
              <Badge variant="outline" className="text-[10px]">
                {row.original.actor.role}
              </Badge>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Hệ thống</span>
          ),
      },
      {
        accessorKey: "action",
        header: "Hành động",
        cell: ({ row }) => (
          <Badge
            variant={auditActionVariant(row.original.action)}
            className="font-mono text-[11px]"
          >
            {row.original.action}
          </Badge>
        ),
      },
      {
        accessorKey: "entity",
        header: "Đối tượng",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-xs">
            <Badge variant="secondary" className="text-[11px]">
              {row.original.entity}
            </Badge>
            {row.original.entityId ? (
              <span className="max-w-28 truncate font-mono text-muted-foreground">
                {row.original.entityId}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "ip",
        header: runtime.piiMasked ? "IP (Đã che)" : "IP",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">{row.original.ip ?? "-"}</span>
        ),
      },
      {
        id: "summary",
        header: "Tóm tắt",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="block max-w-64 truncate text-xs text-muted-foreground">
            {summarizeMeta(row.original.meta)}
          </span>
        ),
      },
    ],
    [runtime.piiMasked],
  )

  return (
    <div className="flex flex-col gap-5">
      <AuditFrequencyChart trends={overviewQuery.data?.trends14d ?? []} />

      <AdminDataTable
        columns={columns}
        data={logs}
        getRowId={(row) => row.id}
        isPending={logsQuery.isPending}
        isError={logsQuery.isError}
        errorTitle="Không tải được nhật ký"
        onRetry={() => void logsQuery.refetch()}
        onRowClick={setSelected}
        enableColumnToggle
        ariaLabel="Bảng nhật ký kiểm toán"
        toolbarExtra={
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-64">
              <InputGroup>
                <InputGroupAddon>
                  <SearchIcon />
                </InputGroupAddon>
                <InputGroupInput
                  type="search"
                  value={searchText}
                  onChange={(event) => void setSearchText(event.target.value || null)}
                  placeholder="Tìm hành động, @handle…"
                  aria-label="Tìm nhật ký"
                />
              </InputGroup>
            </div>

            <ToggleGroup
              value={[entity]}
              onValueChange={(next) => {
                const selectedEntity = next[0]
                if (selectedEntity) void setEntity(selectedEntity === "all" ? null : selectedEntity)
              }}
              variant="outline"
              size="sm"
              aria-label="Lọc đối tượng"
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

            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="outline" size="sm" className="min-h-9 sm:min-h-8" />}
              >
                {action === "all" ? "Mọi hành động" : action}
                <ChevronDownIcon className="size-3.5" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuRadioGroup
                  value={action}
                  onValueChange={(val: unknown) => {
                    if (typeof val === "string") void setAction(val === "all" ? null : val)
                  }}
                >
                  {ACTION_FILTERS.map((item) => (
                    <DropdownMenuRadioItem key={item.value} value={item.value}>
                      {item.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
        emptyState={
          <Empty className="border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ScrollTextIcon />
              </EmptyMedia>
              <EmptyTitle>Chưa có nhật ký phù hợp</EmptyTitle>
              <EmptyDescription>Thử đổi đối tượng hoặc từ khoá.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
        pagination={{
          hasNextPage: logsQuery.hasNextPage,
          isFetchingNextPage: logsQuery.isFetchingNextPage,
          onLoadMore: () => void logsQuery.fetchNextPage(),
          loadingLabel: "Đang tải thêm",
          endMessage: "Đã hiển thị hết nhật ký.",
        }}
      />

      <AuditInspectorSheet entry={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
