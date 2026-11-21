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
import { useDeleteAccount } from "@/features/auth/hooks/use-delete-account"
import { useMe } from "@/features/profile/hooks/use-me"
import { useUpdateMe } from "@/features/profile/hooks/use-update-me"
import { ProfileImagesField } from "@/features/settings/components/profile-images-field"
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

export function SettingsPage() {
  const { data: me, isPending, isError, refetch } = useMe()
  const updateMe = useUpdateMe()
  const deleteAccount = useDeleteAccount()
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)

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

      <SurfaceCard variant="danger">
        <FieldSet>
          <FieldLegend variant="label" className="text-destructive">
            Vùng nguy hiểm · Xoá tài khoản
          </FieldLegend>
          <FieldDescription>
            Tài khoản sẽ bị vô hiệu hoá và đăng xuất khỏi mọi thiết bị. Bài đăng và bình luận cũ vẫn
            được giữ lại nhưng hồ sơ không còn hiển thị.
          </FieldDescription>
          <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
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
                  Hành động này không thể hoàn tác. Bạn sẽ bị đăng xuất ngay lập tức.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Huỷ</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => {
                    deleteAccount.mutate(undefined, {
                      onSuccess: () => {
                        setConfirmDelete(false)
                        toast.success("Đã xoá tài khoản.")
                        void navigate("/login")
                      },
                      onError: (error) => toast.error(error.message),
                    })
                  }}
                >
                  Xoá tài khoản
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </FieldSet>
      </SurfaceCard>
    </PageContainer>
  )
}
