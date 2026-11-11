import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Link } from "react-router"
import { z } from "zod"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useForgotPassword } from "../hooks/use-forgot-password"
import { AuthLayout } from "../components/auth-layout"

const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Email không hợp lệ")),
})

type ForgotForm = z.infer<typeof forgotSchema>

/**
 * Trang quên mật khẩu — `/forgot-password`.
 *
 * Server luôn trả thành công dù email có tồn tại hay không (chống dò email),
 * nên UI cũng luôn hiện thông báo trung tính sau khi gửi.
 */
export function ForgotPasswordPage() {
  const forgot = useForgotPassword()

  const form = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  })

  const onSubmit = (values: ForgotForm) => {
    forgot.mutate(values.email)
  }

  return (
    <AuthLayout
      title="Quên mật khẩu"
      description="Nhập email đã đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu."
      footer={
        <Link to="/login" className="text-primary underline-offset-4 hover:underline">
          Quay lại đăng nhập
        </Link>
      }
    >
      {forgot.isSuccess ? (
        <Alert>
          <AlertTitle>Đã gửi yêu cầu</AlertTitle>
          <AlertDescription>
            Nếu email này có trong hệ thống, bạn sẽ nhận được link đặt lại mật khẩu. Link hết hạn
            sau 1 giờ.
          </AlertDescription>
        </Alert>
      ) : (
        <form onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="forgot-email">Email</FieldLabel>
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <FieldError>{form.formState.errors.email.message}</FieldError>
              )}
            </Field>

            {forgot.isError && <FieldError>{forgot.error.message}</FieldError>}

            <Button type="submit" disabled={forgot.isPending} className="w-full">
              {forgot.isPending ? (
                <>
                  <Spinner aria-label="Đang gửi yêu cầu" /> Đang gửi…
                </>
              ) : (
                "Gửi link đặt lại"
              )}
            </Button>
          </FieldGroup>
        </form>
      )}
    </AuthLayout>
  )
}
