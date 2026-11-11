import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useLogin } from "../hooks/use-login"
import { AuthLayout } from "../components/auth-layout"
import { PasswordInput } from "../components/password-input"
import { serverErrorField } from "../lib/server-field-error"

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Email không hợp lệ")),
  password: z.string().min(1, "Cần nhập mật khẩu"),
})

type LoginForm = z.infer<typeof loginSchema>

const LOGIN_FIELDS = ["email", "password"] as const

/** Trang đăng nhập — `/login`. Đăng nhập xong về `/discover`. */
export function LoginPage() {
  const navigate = useNavigate()
  const login = useLogin()

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = (values: LoginForm) => {
    login.mutate(values, {
      onSuccess: () => {
        void navigate("/discover")
      },
      onError: (error) => {
        const field = serverErrorField(error.message, LOGIN_FIELDS)
        if (field) form.setError(field, { type: "server", message: error.message })
      },
    })
  }

  /** Lỗi server nhắc đúng một field thì đã gắn lên field đó, không lặp lại cuối form. */
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
          <Link to="/register" className="text-primary underline-offset-4 hover:underline">
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
