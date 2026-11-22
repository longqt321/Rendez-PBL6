import { useMemo, useState } from "react"
import type { AdminUser } from "@rendez/schema"
import { useDebounce } from "@uidotdev/usehooks"
import { CheckCircle2Icon, RotateCcwIcon, SearchIcon, UserCogIcon, UsersIcon } from "lucide-react"
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatDate, formatNumber } from "@/lib/format"
import type { AdminUserRoleFilter, AdminUserStatusFilter } from "../api/admin-api"
import { useAdminOverview, useAdminUsers } from "../hooks/use-admin"
import { ADMIN_UI, USER_ROLE_LABELS } from "../lib/admin-constants"
import { AdminDataTable, type AdminColumnDef } from "./shared/admin-data-table"
import { useAdminRuntime } from "./shared/admin-env-store"
import { EditUserSheet } from "./users/edit-user-sheet"
import { UsersSummary } from "./users/users-summary"

const ROLE_VALUES = ["all", "user", "moderator", "admin"] as const
const STATUS_VALUES = ["all", "active", "banned"] as const

const ROLE_FILTERS: { value: AdminUserRoleFilter; label: string }[] = [
  { value: "all", label: "Mọi vai trò" },
  { value: "user", label: "Thành viên" },
  { value: "moderator", label: "Kiểm duyệt" },
  { value: "admin", label: "Quản trị" },
]

const STATUS_FILTERS: { value: AdminUserStatusFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Hoạt động" },
  { value: "banned", label: "Đã khoá" },
]

export function UsersTab({ currentUserId }: Readonly<{ currentUserId: string }>) {
  const { runtime } = useAdminRuntime()
  const [searchText, setSearchText] = useQueryState(
    "uQ",
    parseAsString.withDefault("").withOptions({ history: "replace" }),
  )
  const debouncedQuery = useDebounce(searchText, ADMIN_UI.DEBOUNCE_SEARCH_MS)
  const [role, setRole] = useQueryState(
    "uRole",
    parseAsStringLiteral(ROLE_VALUES).withDefault("all").withOptions({ history: "replace" }),
  )
  const [status, setStatus] = useQueryState(
    "uStatus",
    parseAsStringLiteral(STATUS_VALUES).withDefault("all").withOptions({ history: "replace" }),
  )
  const [editing, setEditing] = useState<AdminUser | null>(null)

  const overviewQuery = useAdminOverview()
  const usersQuery = useAdminUsers({ role, status, q: debouncedQuery })
  const users = useMemo(
    () => usersQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [usersQuery.data],
  )
  const hasFilters = searchText.trim().length > 0 || role !== "all" || status !== "all"

  function resetFilters() {
    void setSearchText(null)
    void setRole(null)
    void setStatus(null)
  }

  const columns = useMemo<AdminColumnDef<AdminUser>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Tài khoản",
        cell: ({ row }) => {
          const u = row.original
          const isSelf = u.id === currentUserId
          return (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-foreground">{u.name}</span>
                {isSelf ? (
                  <Badge variant="outline" className="text-[11px]">
                    Bạn
                  </Badge>
                ) : null}
              </div>
              <span className="block text-xs text-muted-foreground">@{u.handle}</span>
            </div>
          )
        },
      },
      {
        accessorKey: "email",
        header: runtime.piiMasked ? "Email (Đã che)" : "Email",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-mono text-muted-foreground">{row.original.email}</span>
            {row.original.emailVerified ? (
              <CheckCircle2Icon
                className="size-3.5 shrink-0 text-open"
                aria-label="Đã xác thực email"
              />
            ) : (
              <Badge variant="outline" className="text-[10px]">
                Chưa xác thực
              </Badge>
            )}
          </div>
        ),
      },
      {
        accessorKey: "role",
        header: "Vai trò",
        cell: ({ row }) => (
          <Badge variant={row.original.role === "admin" ? "default" : "secondary"}>
            {USER_ROLE_LABELS[row.original.role]}
          </Badge>
        ),
      },
      {
        id: "accountStatus",
        accessorFn: (row) => (row.bannedAt ? "banned" : "active"),
        header: "Trạng thái",
        cell: ({ row }) =>
          row.original.bannedAt ? (
            <div className="space-y-0.5">
              <Badge variant="destructive">Đã khoá</Badge>
              {row.original.banReason ? (
                <span className="block max-w-44 truncate text-[11px] text-destructive">
                  {row.original.banReason}
                </span>
              ) : null}
            </div>
          ) : (
            <Badge variant="outline">Hoạt động</Badge>
          ),
      },
      {
        id: "contributions",
        accessorFn: (row) => row.postCount + row.reviewCount,
        header: "Đóng góp",
        cell: ({ row }) => (
          <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
            {formatNumber(row.original.postCount)} bài · {formatNumber(row.original.reviewCount)}{" "}
            đánh giá
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Tham gia",
        cell: ({ row }) => (
          <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Thao tác",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const isSelf = row.original.id === currentUserId
          return (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              disabled={isSelf}
              onClick={(event) => {
                event.stopPropagation()
                setEditing(row.original)
              }}
            >
              <UserCogIcon className="size-3.5" aria-hidden="true" />
              {isSelf ? "Của bạn" : "Quản lý"}
            </Button>
          )
        },
      },
    ],
    [currentUserId, runtime.piiMasked],
  )

  return (
    <div className="flex flex-col gap-5">
      {overviewQuery.data?.users ? (
        <UsersSummary
          stats={overviewQuery.data.users}
          piiMasked={runtime.piiMasked}
          selectedRole={role}
          onSelectRole={(next) => void setRole(next)}
        />
      ) : null}

      <AdminDataTable
        columns={columns}
        data={users}
        getRowId={(row) => row.id}
        isPending={usersQuery.isPending && users.length === 0}
        isFetching={usersQuery.isFetching && usersQuery.isPlaceholderData}
        isError={usersQuery.isError}
        errorTitle="Không tải được người dùng"
        onRetry={() => void usersQuery.refetch()}
        onRowClick={(user) => {
          if (user.id !== currentUserId) setEditing(user)
        }}
        enableColumnToggle
        ariaLabel="Bảng người dùng"
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
                  placeholder="Tìm tên, @handle, email…"
                  aria-label="Tìm người dùng"
                />
              </InputGroup>
            </div>

            <ToggleGroup
              value={[role]}
              onValueChange={(next) => {
                const selected = next[0] as AdminUserRoleFilter | undefined
                if (selected) void setRole(selected === "all" ? null : selected)
              }}
              variant="outline"
              size="sm"
              aria-label="Lọc vai trò"
            >
              {ROLE_FILTERS.map((item) => (
                <ToggleGroupItem
                  key={item.value}
                  value={item.value}
                  className="min-h-9 px-3 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground sm:min-h-8"
                >
                  {item.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            <ToggleGroup
              value={[status]}
              onValueChange={(next) => {
                const selected = next[0] as AdminUserStatusFilter | undefined
                if (selected) void setStatus(selected === "all" ? null : selected)
              }}
              variant="outline"
              size="sm"
              aria-label="Lọc trạng thái tài khoản"
            >
              {STATUS_FILTERS.map((item) => (
                <ToggleGroupItem
                  key={item.value}
                  value={item.value}
                  className="min-h-9 px-3 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground sm:min-h-8"
                >
                  {item.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            {hasFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={resetFilters}
              >
                <RotateCcwIcon className="size-3.5" aria-hidden="true" />
                Đặt lại
              </Button>
            ) : null}
          </div>
        }
        emptyState={
          <Empty className="border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UsersIcon />
              </EmptyMedia>
              <EmptyTitle>Không tìm thấy người dùng</EmptyTitle>
              <EmptyDescription>
                {hasFilters
                  ? "Không có tài khoản nào khớp bộ lọc đang chọn."
                  : "Chưa có tài khoản nào trong hệ thống."}
              </EmptyDescription>
            </EmptyHeader>
            {hasFilters ? (
              <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                <RotateCcwIcon className="size-3.5" aria-hidden="true" />
                Xoá bộ lọc
              </Button>
            ) : null}
          </Empty>
        }
        pagination={{
          hasNextPage: usersQuery.hasNextPage,
          isFetchingNextPage: usersQuery.isFetchingNextPage,
          onLoadMore: () => void usersQuery.fetchNextPage(),
          loadingLabel: "Đang tải thêm",
          endMessage: "Đã hiển thị hết danh sách.",
        }}
      />

      <EditUserSheet key={editing?.id ?? "none"} user={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
