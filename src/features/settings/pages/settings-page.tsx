import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useMe } from "@/features/profile/hooks/use-me"
import { Spinner } from "@/components/ui/spinner"

const settingsSchema = z.object({
  name: z.string().min(2, "Tên cần ít nhất 2 ký tự").max(40, "Tên tối đa 40 ký tự"),
  bio: z.string().max(160, "Giới thiệu tối đa 160 ký tự"),
  location: z.string().max(60, "Địa điểm tối đa 60 ký tự"),
  privateProfile: z.boolean(),
})

type SettingsForm = z.infer<typeof settingsSchema>

/** Trang cài đặt — `/settings`. Dùng RHF + zod (đúng kế hoạch, form nhiều trường). */
export function SettingsPage() {
  const { data: me, isPending } = useMe()

  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    values: me
      ? {
          name: me.name,
          bio: me.bio,
          location: me.location,
          privateProfile: false,
        }
      : undefined,
  })

  if (isPending || !me) {
    return (
      <div
        className="flex items-center justify-center py-24"
        role="status"
        aria-label="Đang tải cài đặt"
      >
        <Spinner className="size-6" />
      </div>
    )
  }

  const onSubmit = (values: SettingsForm) => {
    // PATCH /me chưa có ở mock server — ghi BACKLOG, không tự bịa route.
    toast.info("Đã lưu cài đặt (chế độ minh hoạ — chưa lưu server).")
    void values
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 lg:px-8 lg:py-8">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <FieldGroup>
            <FieldLegend>Hồ sơ</FieldLegend>

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
              <FieldDescription>Đoạn ngắn giới thiệu bản thân, tối đa 160 ký tự.</FieldDescription>
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

          <FieldSeparator />

          <FieldGroup>
            <FieldLegend>Riêng tư</FieldLegend>

            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="settings-private">Hồ sơ riêng tư</FieldLabel>
                <FieldDescription>
                  Chỉ người theo dõi mới xem được bài đăng của bạn.
                </FieldDescription>
              </FieldContent>
              <Switch id="settings-private" {...form.register("privateProfile")} />
            </Field>
          </FieldGroup>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => form.reset()}>
              Đặt lại
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Lưu thay đổi
            </Button>
          </div>
        </FieldGroup>
      </form>
    </div>
  )
}
