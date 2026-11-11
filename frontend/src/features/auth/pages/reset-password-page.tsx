import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Link, useSearchParams } from "react-router"
import { z } from "zod"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { useResetPassword } from "../hooks/use-reset-password"
import { useAuthPageTitle } from "../hooks/use-auth-page"
import { AuthLayout } from "../components/auth-layout"
import { PasswordInput } from "../components/password-input"
import { mapAuthErrorMessage } from "../lib/auth-error-messages"

const resetSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Mật khẩu cần ít nhất 8 ký tự")
      .max(128, "Mật khẩu tối đa 128 ký tự"),
    confirmPassword: z.string().min(1, "Cần nhập lại mật khẩu"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Mật khẩu nhập lại không khớp",
    path: ["confirmPassword"],
  })

type ResetForm = z.infer<typeof resetSchema>

/**
 * Trang đặt lại mật khẩu — `/reset-password?token=…`.
 *
 * Link trong email trỏ thẳng về đây kèm `token`; thiếu token thì không cho gửi
 * (tránh gọi API chắc chắn lỗi).
 */
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const reset = useResetPassword()
  useAuthPageTitle("Đặt lại mật khẩu")

  const form = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  })

  if (!token) {
    return (
      <AuthLayout title="Link không hợp lệ" description="Link đặt lại mật khẩu thiếu token.">
        <Alert variant="destructive">
          <AlertTitle>Không thể đặt lại mật khẩu</AlertTitle>
          <AlertDescription>
            Hãy mở lại link trong email, hoặc{" "}
            <Link to="/forgot-password" className="underline">
              yêu cầu link mới
            </Link>
            .
          </AlertDescription>
        </Alert>
      </AuthLayout>
    )
  }

  const onSubmit = (values: ResetForm) => {
    reset.mutate({ token, newPassword: values.newPassword })
  }

  return (
    <AuthLayout
      title="Đặt lại mật khẩu"
      description="Chọn mật khẩu mới cho tài khoản của bạn."
      footer={
        <Link to="/login" className="text-primary underline-offset-4 hover:underline">
          Quay lại đăng nhập
        </Link>
      }
    >
      {reset.isSuccess ? (
        <Alert>
          <AlertTitle>Đã đổi mật khẩu</AlertTitle>
          <AlertDescription>
            Bạn có thể{" "}
            <Link to="/login" className="underline">
              đăng nhập
            </Link>{" "}
            bằng mật khẩu mới.
          </AlertDescription>
        </Alert>
      ) : (
        <form onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="reset-password">Mật khẩu mới</FieldLabel>
              <PasswordInput
                id="reset-password"
                autoComplete="new-password"
                {...form.register("newPassword")}
              />
              {form.formState.errors.newPassword && (
                <FieldError>{form.formState.errors.newPassword.message}</FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="reset-confirm">Nhập lại mật khẩu</FieldLabel>
              <PasswordInput
                id="reset-confirm"
                autoComplete="new-password"
                {...form.register("confirmPassword")}
              />
              {form.formState.errors.confirmPassword && (
                <FieldError>{form.formState.errors.confirmPassword.message}</FieldError>
              )}
            </Field>

            {/* better-auth trả message tiếng Anh thô ("Invalid token") — dịch ở UI (V1-04). */}
            {reset.isError && <FieldError>{mapAuthErrorMessage(reset.error)}</FieldError>}

            <Button
              type="submit"
              disabled={reset.isPending}
              className="h-10 w-full text-sm font-medium"
            >
              {reset.isPending ? (
                <>
                  <Spinner aria-label="Đang đổi mật khẩu" /> Đang đổi…
                </>
              ) : (
                "Đổi mật khẩu"
              )}
            </Button>
          </FieldGroup>
        </form>
      )}
    </AuthLayout>
  )
}
