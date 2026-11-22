import { useState } from "react"
import type { AdminUser, UserRole } from "@rendez/schema"
import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { formatDate, formatNumber } from "@/lib/format"
import { useUpdateAdminUser } from "../../hooks/use-admin"
import { ADMIN_UI, USER_ROLE_LABELS } from "../../lib/admin-constants"
import { AdminDangerConfirm } from "../shared/admin-danger-confirm"
import { useAdminRuntime } from "../shared/admin-env-store"
import { AdminStatGrid } from "../shared/admin-stat-grid"

export function EditUserSheet({
  user,
  onClose,
}: Readonly<{ user: AdminUser | null; onClose: () => void }>) {
  const { requiresStrictConfirm } = useAdminRuntime()
  const [role, setRole] = useState<UserRole>(user?.role ?? "user")
  const [banned, setBanned] = useState(user?.bannedAt !== null)
  const [banReason, setBanReason] = useState(user?.banReason ?? "")
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const updateUser = useUpdateAdminUser()

  if (!user) return null

  const isBanning = user.bannedAt === null && banned
  const isRoleEscalating = role !== user.role && (role === "admin" || user.role === "admin")
  const isRisky = isBanning || isRoleEscalating

  function submitMutation() {
    if (!user) return
    updateUser.mutate(
      {
        userId: user.id,
        input: { role, banned, banReason: banned ? banReason.trim() : null },
      },
      {
        onSuccess: () => {
          setConfirmOpen(false)
          onClose()
        },
      },
    )
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!user) return
    if (banned && banReason.trim().length === 0) {
      setError("Nhập lý do khi khoá tài khoản")
      return
    }
    if (
      requiresStrictConfirm &&
      isBanning &&
      banReason.trim().length < ADMIN_UI.PROD_MIN_REASON_LEN
    ) {
      setError(`Cần nhập lý do tối thiểu ${ADMIN_UI.PROD_MIN_REASON_LEN} ký tự trên Production`)
      return
    }
    setError(null)
    if (isRisky) {
      setConfirmOpen(true)
      return
    }
    submitMutation()
  }

  return (
    <>
      <Sheet open={user !== null} onOpenChange={(next) => (!next ? onClose() : undefined)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <form onSubmit={handleSubmit} className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>{user.name}</SheetTitle>
              <SheetDescription>
                @{user.handle} · {user.email}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-4 px-4 py-2">
              <AdminStatGrid
                items={[
                  {
                    label: "Đóng góp",
                    value: `${formatNumber(user.postCount)} bài · ${formatNumber(user.reviewCount)} đánh giá`,
                  },
                  { label: "Tham gia", value: formatDate(user.createdAt) },
                ]}
              />

              <Field>
                <FieldLabel>Vai trò</FieldLabel>
                <RadioGroup<UserRole> value={role} onValueChange={setRole} className="gap-2">
                  {(["user", "moderator", "admin"] as const).map((item) => (
                    <Label
                      key={item}
                      className="flex cursor-pointer items-center gap-2 rounded-surface border p-2.5 font-normal"
                    >
                      <RadioGroupItem value={item} />
                      {USER_ROLE_LABELS[item]}
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
                    placeholder="Lý do khoá tài khoản…"
                    className="min-h-24 resize-none"
                    maxLength={ADMIN_UI.MODERATION_NOTE_MAX_LEN}
                    aria-invalid={!!error}
                    aria-describedby={error ? "admin-user-ban-reason-error" : undefined}
                  />
                  {error ? <FieldError id="admin-user-ban-reason-error">{error}</FieldError> : null}
                </Field>
              ) : null}
            </div>

            <SheetFooter className="border-t pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={updateUser.isPending}
              >
                Huỷ
              </Button>
              <Button
                type="submit"
                variant={isRisky ? "destructive" : "default"}
                disabled={updateUser.isPending}
              >
                {updateUser.isPending ? <Spinner aria-label="Đang cập nhật" /> : null}
                Lưu thay đổi
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AdminDangerConfirm
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={isBanning ? "Khoá tài khoản" : "Thay đổi quyền Quản trị"}
        description={
          isBanning
            ? `Thu hồi toàn bộ phiên và chặn đăng nhập của @${user.handle}.`
            : `Đổi vai trò @${user.handle} từ ${USER_ROLE_LABELS[user.role]} sang ${USER_ROLE_LABELS[role]}.`
        }
        confirmToken={`@${user.handle}`}
        confirmLabel="Nhập @handle để xác nhận"
        actionLabel={isBanning ? "Khoá tài khoản" : "Cập nhật quyền"}
        isPending={updateUser.isPending}
        onConfirm={submitMutation}
      />
    </>
  )
}
