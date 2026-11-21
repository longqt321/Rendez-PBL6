import { useState } from "react"
import type { AdminUser, UserRole } from "@rendez/schema"
import { useDebounce } from "@uidotdev/usehooks"
import { SearchIcon, UserCogIcon, UsersIcon } from "lucide-react"
import { ErrorState } from "@/components/shared/error-state"
import { LoadMore } from "@/components/shared/load-more"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatDate, formatNumber } from "@/lib/format"
import type { AdminUserRoleFilter, AdminUserStatusFilter } from "../api/admin-api"
import { useAdminUsers, useUpdateAdminUser } from "../hooks/use-admin"

const ROLE_LABELS: Record<UserRole, string> = {
  user: "Thành viên",
  moderator: "Kiểm duyệt",
  admin: "Quản trị",
}

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
  const [searchText, setSearchText] = useState("")
  const debouncedQuery = useDebounce(searchText, 300)
  const [role, setRole] = useState<AdminUserRoleFilter>("all")
  const [status, setStatus] = useState<AdminUserStatusFilter>("all")
  const [editing, setEditing] = useState<AdminUser | null>(null)

  const usersQuery = useAdminUsers({
    role,
    status,
    q: debouncedQuery,
  })
  const users = usersQuery.data?.pages.flatMap((page) => page.items) ?? []

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
              placeholder="Tìm tên, @handle hoặc email…"
              aria-label="Tìm kiếm người dùng"
            />
          </InputGroup>
        </div>

        <ToggleGroup
          value={[role]}
          onValueChange={(next) => {
            const selected = next[0] as AdminUserRoleFilter | undefined
            if (selected) setRole(selected)
          }}
          variant="outline"
          size="sm"
          aria-label="Lọc theo vai trò"
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
            if (selected) setStatus(selected)
          }}
          variant="outline"
          size="sm"
          aria-label="Lọc theo trạng thái tài khoản"
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
      </div>

      {usersQuery.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={`user-adm-skel-${index}`} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : usersQuery.isError ? (
        <ErrorState
          variant="plain"
          title="Không tải được danh sách người dùng"
          onRetry={() => void usersQuery.refetch()}
        />
      ) : users.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>Không tìm thấy người dùng nào</EmptyTitle>
            <EmptyDescription>Thử đổi từ khoá tìm kiếm hoặc bộ lọc.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <ItemGroup className="gap-2">
            {users.map((user) => {
              const isSelf = user.id === currentUserId
              return (
                <Item key={user.id} variant="outline" className="items-start gap-3">
                  <ItemContent className="gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <ItemTitle className="text-sm font-semibold">{user.name}</ItemTitle>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                        {ROLE_LABELS[user.role]}
                      </Badge>
                      {user.bannedAt ? <Badge variant="destructive">Đã khoá</Badge> : null}
                      {isSelf ? <Badge variant="outline">Bạn</Badge> : null}
                    </div>
                    <ItemDescription className="text-xs">
                      @{user.handle} · {user.email}
                      {!user.emailVerified ? " (chưa xác thực email)" : ""}
                    </ItemDescription>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(user.postCount)} bài viết · {formatNumber(user.reviewCount)}{" "}
                      đánh giá · Tham gia {formatDate(user.createdAt)}
                    </p>
                    {user.banReason ? (
                      <p className="text-xs text-destructive">Lý do khoá: {user.banReason}</p>
                    ) : null}
                  </ItemContent>
                  <ItemActions>
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-9 sm:min-h-8"
                      disabled={isSelf}
                      onClick={() => setEditing(user)}
                    >
                      <UserCogIcon className="size-3.5" aria-hidden="true" />
                      {isSelf ? "Tài khoản của bạn" : "Phân quyền / Khoá"}
                    </Button>
                  </ItemActions>
                </Item>
              )
            })}
          </ItemGroup>

          <LoadMore
            hasNextPage={usersQuery.hasNextPage}
            isFetchingNextPage={usersQuery.isFetchingNextPage}
            onLoadMore={() => usersQuery.fetchNextPage()}
            loadingLabel="Đang tải thêm người dùng"
            endMessage="Đã hiển thị hết danh sách người dùng."
          />
        </>
      )}

      <EditUserDialog key={editing?.id ?? "none"} user={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function EditUserDialog({
  user,
  onClose,
}: Readonly<{
  user: AdminUser | null
  onClose: () => void
}>) {
  const [role, setRole] = useState<UserRole>(user?.role ?? "user")
  const [banned, setBanned] = useState(user?.bannedAt !== null)
  const [banReason, setBanReason] = useState(user?.banReason ?? "")
  const [error, setError] = useState<string | null>(null)
  const updateUser = useUpdateAdminUser()

  if (!user) return null

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!user) return
    if (banned && banReason.trim().length === 0) {
      setError("Nhập lý do khi khoá tài khoản")
      return
    }
    setError(null)
    updateUser.mutate(
      {
        userId: user.id,
        input: {
          role,
          banned,
          banReason: banned ? banReason.trim() : null,
        },
      },
      {
        onSuccess: () => onClose(),
      },
    )
  }

  return (
    <Dialog open={user !== null} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Quản lý tài khoản: {user.name}</DialogTitle>
            <DialogDescription>
              @{user.handle} · {user.email}
            </DialogDescription>
          </DialogHeader>

          <Field>
            <FieldLabel>Vai trò</FieldLabel>
            <RadioGroup<UserRole>
              value={role}
              onValueChange={(value) => setRole(value)}
              className="gap-2"
            >
              {(["user", "moderator", "admin"] as const).map((item) => (
                <Label
                  key={item}
                  className="flex cursor-pointer items-center gap-2 rounded-surface border p-2.5 font-normal"
                >
                  <RadioGroupItem value={item} />
                  <span>{ROLE_LABELS[item]}</span>
                </Label>
              ))}
            </RadioGroup>
          </Field>

          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="admin-user-banned">Khoá tài khoản</FieldLabel>
            </FieldContent>
            <Switch id="admin-user-banned" checked={banned} onCheckedChange={setBanned} />
          </Field>

          {banned ? (
            <Field data-invalid={!!error}>
              <FieldLabel htmlFor="admin-user-ban-reason">Lý do khoá</FieldLabel>
              <Textarea
                id="admin-user-ban-reason"
                value={banReason}
                onChange={(event) => setBanReason(event.target.value)}
                placeholder="Mô tả lý do khoá tài khoản…"
                className="min-h-20 resize-none"
                maxLength={300}
                aria-invalid={!!error}
                aria-describedby={error ? "admin-user-ban-reason-error" : undefined}
              />
              {error ? <FieldError id="admin-user-ban-reason-error">{error}</FieldError> : null}
            </Field>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={updateUser.isPending}>
              Huỷ
            </Button>
            <Button type="submit" disabled={updateUser.isPending}>
              {updateUser.isPending ? <Spinner aria-label="Đang cập nhật tài khoản" /> : null}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
