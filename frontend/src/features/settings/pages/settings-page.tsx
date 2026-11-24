import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { z } from "zod"
import { PageContainer, PageHeader, SurfaceCard } from "@/components/layout/page-primitives"
import { ErrorState } from "@/components/shared/error-state"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useChangePassword } from "@/features/auth/hooks/use-change-password"
import { useDeleteAccount } from "@/features/auth/hooks/use-delete-account"
import { ManageAnchorsSection } from "@/features/location/components/manage-anchors-dialog"
import { useMe } from "@/features/profile/hooks/use-me"
import { useUpdateMe } from "@/features/profile/hooks/use-update-me"
import { ProfileImagesField } from "@/features/settings/components/profile-images-field"
import {
  useNotificationPrefs,
  useUpdateNotificationPrefs,
  type NotificationPrefs,
} from "@/features/settings/hooks/use-notification-prefs"
import {
  MAX_PROFILE_BIO_LENGTH,
  MAX_PROFILE_LOCATION_LENGTH,
  MAX_PROFILE_NAME_LENGTH,
} from "@/lib/constants"

const settingsSchema = z.object({
  name: z
    .string()
    .min(2, "Tên cần ít nhất 2 ký tự")
    .max(MAX_PROFILE_NAME_LENGTH, `Tên tối đa ${MAX_PROFILE_NAME_LENGTH} ký tự`),
  bio: z.string().max(MAX_PROFILE_BIO_LENGTH, `Giới thiệu tối đa ${MAX_PROFILE_BIO_LENGTH} ký tự`),
  location: z
    .string()
    .max(MAX_PROFILE_LOCATION_LENGTH, `Địa điểm tối đa ${MAX_PROFILE_LOCATION_LENGTH} ký tự`),
  privateProfile: z.boolean(),
})

type SettingsForm = z.infer<typeof settingsSchema>

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
    newPassword: z.string().min(8, "Mật khẩu mới cần ít nhất 8 ký tự").max(128),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu mới"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu xác nhận không khớp",
  })

type ChangePasswordForm = z.infer<typeof changePasswordSchema>

function ChangePasswordCard() {
  const changePasswordMutation = useChangePassword()
  const form = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  function onSubmit(values: ChangePasswordForm) {
    changePasswordMutation.mutate(
      {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      },
      {
        onSuccess: () => {
          form.reset()
          toast.success("Đã đổi mật khẩu thành công.")
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Không đổi được mật khẩu")
        },
      },
    )
  }

  return (
    <SurfaceCard>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-4">
        <FieldSet>
          <FieldLegend>Đổi mật khẩu</FieldLegend>
          <FieldDescription>
            Cập nhật mật khẩu đăng nhập định kỳ để bảo vệ tài khoản của bạn.
          </FieldDescription>
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.currentPassword)}>
              <FieldLabel htmlFor="settings-current-password">Mật khẩu hiện tại</FieldLabel>
              <Input
                id="settings-current-password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(form.formState.errors.currentPassword)}
                {...form.register("currentPassword")}
              />
              {form.formState.errors.currentPassword ? (
                <FieldError>{form.formState.errors.currentPassword.message}</FieldError>
              ) : null}
            </Field>
            <Field data-invalid={Boolean(form.formState.errors.newPassword)}>
              <FieldLabel htmlFor="settings-new-password">Mật khẩu mới</FieldLabel>
              <Input
                id="settings-new-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(form.formState.errors.newPassword)}
                {...form.register("newPassword")}
              />
              {form.formState.errors.newPassword ? (
                <FieldError>{form.formState.errors.newPassword.message}</FieldError>
              ) : null}
            </Field>
            <Field data-invalid={Boolean(form.formState.errors.confirmPassword)}>
              <FieldLabel htmlFor="settings-confirm-password">Xác nhận mật khẩu mới</FieldLabel>
              <Input
                id="settings-confirm-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(form.formState.errors.confirmPassword)}
                {...form.register("confirmPassword")}
              />
              {form.formState.errors.confirmPassword ? (
                <FieldError>{form.formState.errors.confirmPassword.message}</FieldError>
              ) : null}
            </Field>
          </FieldGroup>
        </FieldSet>
        <div className="flex justify-end">
          <Button type="submit" variant="outline" disabled={changePasswordMutation.isPending}>
            {changePasswordMutation.isPending ? <Spinner aria-label="Đang đổi mật khẩu" /> : null}
            Đổi mật khẩu
          </Button>
        </div>
      </form>
    </SurfaceCard>
  )
}

function NotificationPrefsCard() {
  const { data: prefs, isLoading } = useNotificationPrefs()
  const updateMutation = useUpdateNotificationPrefs()

  const handleToggle = (key: keyof NotificationPrefs, val: boolean) => {
    updateMutation.mutate(
      { [key]: val },
      {
        onSuccess: () => toast.success("Đã lưu cài đặt thông báo"),
        onError: () => toast.error("Không lưu được cài đặt thông báo"),
      },
    )
  }

  return (
    <SurfaceCard>
      <FieldSet>
        <FieldLegend>Cài đặt thông báo</FieldLegend>
        <FieldDescription>
          Tuỳ chỉnh các kênh thông báo và hoạt động bạn muốn nhận.
        </FieldDescription>

        <FieldGroup>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="pref-dm">Tin nhắn trực tiếp</FieldLabel>
              <FieldDescription>
                Nhận thông báo khi có tin nhắn mới từ bạn bè hoặc người liên hệ.
              </FieldDescription>
            </FieldContent>
            <Switch
              id="pref-dm"
              disabled={isLoading || updateMutation.isPending}
              checked={prefs?.dmNotifications !== false}
              onCheckedChange={(val) => handleToggle("dmNotifications", val)}
            />
          </Field>

          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="pref-room">Hoạt động phòng nhóm</FieldLabel>
              <FieldDescription>
                Thông báo khi có thành viên mới, địa điểm đề xuất mới hoặc phòng chốt kết quả.
              </FieldDescription>
            </FieldContent>
            <Switch
              id="pref-room"
              disabled={isLoading || updateMutation.isPending}
              checked={prefs?.roomActivity !== false}
              onCheckedChange={(val) => handleToggle("roomActivity", val)}
            />
          </Field>

          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="pref-email">Email tổng hợp tuần</FieldLabel>
              <FieldDescription>
                Nhận email tóm tắt các điểm hẹn nổi bật và hoạt động trong tuần mỗi sáng thứ Bảy.
              </FieldDescription>
            </FieldContent>
            <Switch
              id="pref-email"
              disabled={isLoading || updateMutation.isPending}
              checked={prefs?.emailDigest === true}
              onCheckedChange={(val) => handleToggle("emailDigest", val)}
            />
          </Field>
        </FieldGroup>
      </FieldSet>
    </SurfaceCard>
  )
}

export function SettingsPage() {
  const { data: me, isPending, isError, refetch } = useMe()
  const updateMe = useUpdateMe()
  const deleteAccount = useDeleteAccount()
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")

  const isMatchHandle =
    Boolean(me?.handle) &&
    (deleteConfirmText.trim() === `@${me?.handle}` || deleteConfirmText.trim() === me?.handle)

  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    values: me
      ? {
          name: me.name,
          bio: me.bio,
          location: me.location,
          privateProfile: me.privateProfile,
        }
      : undefined,
  })

  if (isPending) {
    return (
      <PageContainer size="narrow">
        <h1 className="sr-only">Cài đặt</h1>
        <div className="flex items-center justify-center py-24">
          <Spinner className="size-6" aria-label="Đang tải cài đặt" />
        </div>
      </PageContainer>
    )
  }

  if (isError || !me) {
    return (
      <PageContainer size="narrow">
        <h1 className="sr-only">Cài đặt</h1>
        <ErrorState
          className="mt-10"
          title="Không tải được cài đặt"
          onRetry={() => void refetch()}
        />
      </PageContainer>
    )
  }

  const onSubmit = (values: SettingsForm) => {
    updateMe.mutate(values, {
      onSuccess: () => toast.success("Đã lưu thay đổi hồ sơ."),
      onError: (error) => toast.error(error.message),
    })
  }

  return (
    <PageContainer size="narrow" className="space-y-6">
      <PageHeader title="Cài đặt tài khoản" />

      <form onSubmit={(event) => void form.handleSubmit(onSubmit)(event)} className="space-y-6">
        <SurfaceCard>
          <FieldSet>
            <FieldLegend>Hồ sơ công khai</FieldLegend>

            <FieldGroup>
              <Field data-invalid={!!form.formState.errors.name}>
                <FieldLabel htmlFor="settings-name">Tên hiển thị</FieldLabel>
                <Input
                  id="settings-name"
                  aria-invalid={!!form.formState.errors.name}
                  aria-describedby={form.formState.errors.name ? "settings-name-error" : undefined}
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <FieldError id="settings-name-error">
                    {form.formState.errors.name.message}
                  </FieldError>
                )}
              </Field>

              <Field data-invalid={!!form.formState.errors.bio}>
                <FieldLabel htmlFor="settings-bio">Giới thiệu</FieldLabel>
                <Textarea
                  id="settings-bio"
                  rows={3}
                  aria-invalid={!!form.formState.errors.bio}
                  aria-describedby={
                    form.formState.errors.bio ? "settings-bio-error" : "settings-bio-hint"
                  }
                  {...form.register("bio")}
                />
                <FieldDescription id="settings-bio-hint">
                  Đoạn ngắn giới thiệu bản thân, tối đa 160 ký tự.
                </FieldDescription>
                {form.formState.errors.bio && (
                  <FieldError id="settings-bio-error">
                    {form.formState.errors.bio.message}
                  </FieldError>
                )}
              </Field>

              <Field data-invalid={!!form.formState.errors.location}>
                <FieldLabel htmlFor="settings-location">Địa điểm</FieldLabel>
                <Input
                  id="settings-location"
                  aria-invalid={!!form.formState.errors.location}
                  aria-describedby={
                    form.formState.errors.location ? "settings-location-error" : undefined
                  }
                  {...form.register("location")}
                />
                {form.formState.errors.location && (
                  <FieldError id="settings-location-error">
                    {form.formState.errors.location.message}
                  </FieldError>
                )}
              </Field>
            </FieldGroup>
          </FieldSet>
        </SurfaceCard>

        <SurfaceCard>
          <ProfileImagesField profile={me} />
        </SurfaceCard>

        <SurfaceCard>
          <FieldSet>
            <FieldLegend>Quyền riêng tư</FieldLegend>

            <FieldGroup>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="settings-private">Hồ sơ riêng tư</FieldLabel>
                  <FieldDescription>
                    Chỉ người theo dõi mới xem được bài đăng của bạn.
                  </FieldDescription>
                </FieldContent>
                <Controller
                  control={form.control}
                  name="privateProfile"
                  render={({ field }) => (
                    <Switch
                      id="settings-private"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </Field>
            </FieldGroup>
          </FieldSet>
        </SurfaceCard>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => form.reset()}>
            Đặt lại
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting || updateMe.isPending}>
            Lưu thay đổi
          </Button>
        </div>
      </form>

      <SurfaceCard>
        <FieldSet>
          <FieldLegend>Mốc vị trí quen thuộc</FieldLegend>
          <FieldDescription>
            Lưu nhà riêng, công ty hoặc trường học để tính khoảng cách và gợi ý quán chính xác hơn
            ngay cả khi laptop không có GPS.
          </FieldDescription>
          <ManageAnchorsSection enabled={Boolean(me)} />
        </FieldSet>
      </SurfaceCard>

      <NotificationPrefsCard />

      <ChangePasswordCard />

      <SurfaceCard variant="danger">
        <FieldSet>
          <FieldLegend variant="label" className="text-destructive">
            Vùng nguy hiểm · Xoá tài khoản
          </FieldLegend>
          <FieldDescription>
            Tài khoản sẽ bị vô hiệu hoá và đăng xuất khỏi mọi thiết bị. Bài đăng và bình luận cũ vẫn
            được giữ lại nhưng hồ sơ không còn hiển thị.
          </FieldDescription>
          <AlertDialog
            open={confirmDelete}
            onOpenChange={(open) => {
              setConfirmDelete(open)
              if (!open) setDeleteConfirmText("")
            }}
          >
            <AlertDialogTrigger
              render={
                <Button type="button" variant="destructive" disabled={deleteAccount.isPending} />
              }
            >
              Xoá tài khoản
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Xoá tài khoản?</AlertDialogTitle>
                <AlertDialogDescription>
                  Hành động này không thể hoàn tác. Hồ sơ của bạn sẽ bị vô hiệu hoá, đồng thời giải
                  phóng @{me?.handle} và email để có thể sử dụng lại sau này.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="py-2">
                <Field>
                  <FieldLabel htmlFor="confirm-handle-delete" className="text-xs font-medium">
                    Nhập chính xác <span className="font-bold text-destructive">@{me?.handle}</span>{" "}
                    để xác nhận:
                  </FieldLabel>
                  <Input
                    id="confirm-handle-delete"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={`@${me?.handle}`}
                    autoComplete="off"
                  />
                </Field>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>Huỷ</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={!isMatchHandle || deleteAccount.isPending}
                  onClick={() => {
                    deleteAccount.mutate(undefined, {
                      onSuccess: () => {
                        setConfirmDelete(false)
                        toast.success("Đã xoá tài khoản thành công.")
                        void navigate("/login")
                      },
                      onError: (error) => toast.error(error.message),
                    })
                  }}
                >
                  Xác nhận xoá tài khoản
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </FieldSet>
      </SurfaceCard>
    </PageContainer>
  )
}
