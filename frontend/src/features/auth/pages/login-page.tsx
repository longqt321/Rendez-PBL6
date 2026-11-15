import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Link, Navigate, useNavigate, useSearchParams } from "react-router"
import { z } from "zod"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useLogin } from "../hooks/use-login"
import { useAuthenticatedRedirect, useAuthPageTitle } from "../hooks/use-auth-page"
import { useSendVerificationEmail } from "../hooks/use-send-verification-email"
import { AuthLayout } from "../components/auth-layout"
import { PasswordInput } from "../components/password-input"
import { safeRedirectPath } from "../lib/safe-redirect"
import { serverErrorField } from "../lib/server-field-error"

const loginSchema = z.object({
  // Rỗng là "chưa nhập", không phải "email sai định dạng" (V1-11).
  email: z
    .string()
    .trim()
    .min(1, "Cần nhập email")
    .toLowerCase()
    .pipe(z.email("Email không hợp lệ")),
  password: z.string().min(1, "Cần nhập mật khẩu"),
})

type LoginForm = z.infer<typeof loginSchema>

const LOGIN_FIELDS = ["email", "password"] as const

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = safeRedirectPath(searchParams.get("next"))
  const login = useLogin()
  const resend = useSendVerificationEmail()
  useAuthPageTitle("Đăng nhập")

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  // Đã đăng nhập: về đích ngay (next nếu có, không thì trang khám phá).
  const redirectTo = useAuthenticatedRedirect(next)
  if (redirectTo) return <Navigate to={redirectTo} replace />

  const needsVerification = login.isError && /chưa được xác thực/i.test(login.error.message)

  const onSubmit = (values: LoginForm) => {
    login.mutate(values, {
      onSuccess: () => {
        void navigate(next ?? "/discover")
      },
      onError: (error) => {
        const field = serverErrorField(error.message, LOGIN_FIELDS)
        if (field) form.setError(field, { type: "server", message: error.message })
      },
    })
  }

  const formError =
    login.isError && !serverErrorField(login.error.message, LOGIN_FIELDS)
      ? login.error.message
      : undefined

  return (
    <AuthLayout
      title="Đăng nhập"
      description="Đăng nhập để lưu bài viết, tạo bộ sưu tập và theo dõi bạn bè."
      footer={
        <span>
          Chưa có tài khoản?{" "}
          <Link
            to={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}
            className="text-primary underline-offset-4 hover:underline"
          >
            Đăng ký
          </Link>
        </span>
      }
    >
      <form onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="login-email">Email</FieldLabel>
            <Input id="login-email" type="email" autoComplete="email" {...form.register("email")} />
            {form.formState.errors.email && (
              <FieldError>{form.formState.errors.email.message}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="login-password">Mật khẩu</FieldLabel>
            <PasswordInput
              id="login-password"
              autoComplete="current-password"
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <FieldError>{form.formState.errors.password.message}</FieldError>
            )}
          </Field>

          {formError && <FieldError>{formError}</FieldError>}

          {needsVerification && (
            <div className="flex flex-col gap-2">
              {resend.isSuccess && (
                <Alert>
                  <AlertTitle>Đã gửi lại email xác thực</AlertTitle>
                  <AlertDescription>Kiểm tra hộp thư rồi đăng nhập lại.</AlertDescription>
                </Alert>
              )}
              {resend.isError && <FieldError>{resend.error.message}</FieldError>}
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full text-sm font-medium"
                disabled={resend.isPending}
                onClick={() => resend.mutate(form.getValues("email"))}
              >
                {resend.isPending ? (
                  <>
                    <Spinner aria-label="Đang gửi lại email" /> Đang gửi lại…
                  </>
                ) : (
                  "Gửi lại email xác thực"
                )}
              </Button>
            </div>
          )}

          <Button
            type="submit"
            disabled={login.isPending}
            className="h-10 w-full text-sm font-medium"
          >
            {login.isPending ? (
              <>
                <Spinner aria-label="Đang đăng nhập" /> Đang đăng nhập…
              </>
            ) : (
              "Đăng nhập"
            )}
          </Button>

          <FieldSeparator />

          <Link
            to="/forgot-password"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Quên mật khẩu?
          </Link>
        </FieldGroup>
      </form>
    </AuthLayout>
  )
}
