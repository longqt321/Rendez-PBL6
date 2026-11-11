import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { useNavigate } from "react-router"
import { z } from "zod"
import { toast } from "sonner"
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
import { ErrorState } from "@/components/shared/error-state"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useMe } from "@/features/profile/hooks/use-me"
import { useUpdateMe } from "@/features/profile/hooks/use-update-me"
import { useDeleteAccount } from "@/features/auth/hooks/use-delete-account"
import { Spinner } from "@/components/ui/spinner"
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

/** Trang cài đặt — `/settings`. Dùng RHF + zod (đúng kế hoạch, form nhiều trường). */
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
      <div className="mx-auto w-full max-w-2xl px-4 py-6 lg:px-8 lg:py-8">
        <h1 className="sr-only">Cài đặt</h1>
        <div className="flex items-center justify-center py-24">
          <Spinner className="size-6" aria-label="Đang tải cài đặt" />
        </div>
      </div>
    )
  }

  if (isError || !me) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6 lg:px-8 lg:py-8">
        <h1 className="sr-only">Cài đặt</h1>
        <ErrorState
          className="mt-10"
          title="Không tải được cài đặt"
          onRetry={() => void refetch()}
        />
      </div>
    )
  }

  const onSubmit = (values: SettingsForm) => {
    updateMe.mutate(values, {
      onSuccess: () => toast.success("Đã lưu thay đổi hồ sơ."),
      onError: (error) => toast.error(error.message),
    })
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 lg:px-8 lg:py-8">
      <h1 className="sr-only">Cài đặt</h1>
      <form onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}>
        <FieldGroup>
          <FieldSet>
            <FieldLegend>Hồ sơ</FieldLegend>

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="settings-name">Tên hiển thị</FieldLabel>
                <Input id="settings-name" {...form.register("name")} />
                {form.formState.errors.name && (
                  <FieldError>{form.formState.errors.name.message}</FieldError>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="settings-bio">Giới thiệu</FieldLabel>
                <Textarea id="settings-bio" rows={3} {...form.register("bio")} />
                <FieldDescription>
                  Đoạn ngắn giới thiệu bản thân, tối đa 160 ký tự.
                </FieldDescription>
                {form.formState.errors.bio && (
                  <FieldError>{form.formState.errors.bio.message}</FieldError>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="settings-location">Địa điểm</FieldLabel>
                <Input id="settings-location" {...form.register("location")} />
                {form.formState.errors.location && (
                  <FieldError>{form.formState.errors.location.message}</FieldError>
                )}
              </Field>
            </FieldGroup>
          </FieldSet>

          <FieldSeparator />

          <FieldSet>
            <FieldLegend>Riêng tư</FieldLegend>

            <FieldGroup>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="settings-private">Hồ sơ riêng tư</FieldLabel>
                  <FieldDescription>
                    Chỉ người theo dõi mới xem được bài đăng của bạn.
                  </FieldDescription>
                </FieldContent>
                {/*
                 * `Switch` của base-ui chỉ có `inputRef` + `onCheckedChange`, không nhận
                 * `ref`/`onChange` → phải đi qua `Controller` thì giá trị form mới cập nhật.
                 */}
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

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => form.reset()}>
              Đặt lại
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting || updateMe.isPending}>
              Lưu thay đổi
            </Button>
          </div>
        </FieldGroup>
      </form>

      <FieldSeparator className="my-8" />

      <FieldSet>
        <FieldLegend variant="label">Xoá tài khoản</FieldLegend>
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
    </div>
  )
}
