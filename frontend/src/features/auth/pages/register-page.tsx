import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link, Navigate, useSearchParams } from "react-router"
import { z } from "zod"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { useRegister } from "../hooks/use-register"
import { useAuthenticatedRedirect, useAuthPageTitle } from "../hooks/use-auth-page"
import { useSendVerificationEmail } from "../hooks/use-send-verification-email"
import { AuthLayout } from "../components/auth-layout"
import { PasswordInput } from "../components/password-input"
import { safeRedirectPath } from "../lib/safe-redirect"
import { serverErrorField } from "../lib/server-field-error"

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Tên cần ít nhất 2 ký tự").max(40, "Tên tối đa 40 ký tự"),
    // Rỗng là "chưa nhập", không phải "email sai định dạng" (V1-11).
    email: z
      .string()
      .trim()
      .min(1, "Cần nhập email")
      .toLowerCase()
      .pipe(z.email("Email không hợp lệ")),
    password: z
      .string()
      .min(8, "Mật khẩu cần ít nhất 8 ký tự")
      .max(128, "Mật khẩu tối đa 128 ký tự"),
    handle: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, "Handle cần ít nhất 3 ký tự")
      .max(30, "Handle tối đa 30 ký tự")
      .regex(/^[a-z0-9_]+$/, "Handle chỉ gồm chữ thường, số và gạch dưới"),
    confirmPassword: z.string().min(1, "Cần nhập lại mật khẩu"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Mật khẩu nhập lại không khớp",
    path: ["confirmPassword"],
  })

type RegisterForm = z.infer<typeof registerSchema>

const REGISTER_FIELDS = ["name", "email", "handle", "password"] as const

export function RegisterPage() {
  const [searchParams] = useSearchParams()
  const next = safeRedirectPath(searchParams.get("next"))
  const register = useRegister()
  const resend = useSendVerificationEmail()
  useAuthPageTitle("Tạo tài khoản")

  const [sentTo, setSentTo] = useState<string | null>(null)

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", handle: "", confirmPassword: "" },
  })

  // Đã đăng nhập: không cần tạo tài khoản nữa (V1-09).
  const redirectTo = useAuthenticatedRedirect(next)
  if (redirectTo) return <Navigate to={redirectTo} replace />

  const onSubmit = (values: RegisterForm) => {
    // Chỉ gửi các field backend nhận — `confirmPassword` chỉ dùng để validate.
    register.mutate(
      { name: values.name, email: values.email, password: values.password, handle: values.handle },
      {
        onSuccess: () => {
          setSentTo(values.email)
        },
        onError: (error) => {
          const field = serverErrorField(error.message, REGISTER_FIELDS)
          if (field) form.setError(field, { type: "server", message: error.message })
        },
      },
    )
  }

  const formError =
    register.isError && !serverErrorField(register.error.message, REGISTER_FIELDS)
      ? register.error.message
      : undefined

  if (sentTo) {
    return (
      <AuthLayout
        title="Kiểm tra email của bạn"
        description={`Chúng tôi đã gửi link xác thực tới ${sentTo}.`}
        footer={
          <span>
            Đã xác thực xong?{" "}
            <Link
              to={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
              className="text-primary underline-offset-4 hover:underline"
            >
              Đăng nhập
            </Link>
          </span>
        }
      >
        <div className="flex flex-col gap-4">
          <Alert>
            <AlertTitle>Xác thực email để đăng nhập</AlertTitle>
            <AlertDescription>
              Mở link trong email (kiểm tra cả mục spam) rồi quay lại đăng nhập. Link hết hạn sau 1
              giờ.
            </AlertDescription>
          </Alert>

          {resend.isSuccess && (
            <Alert>
              <AlertTitle>Đã gửi lại email</AlertTitle>
              <AlertDescription>Kiểm tra hộp thư của {sentTo}.</AlertDescription>
            </Alert>
          )}
          {resend.isError && <FieldError>{resend.error.message}</FieldError>}

          <Button
            type="button"
            variant="outline"
            className="h-10 w-full text-sm font-medium"
            disabled={resend.isPending}
            onClick={() => resend.mutate(sentTo)}
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
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Tạo tài khoản"
      description="Chia sẻ quán ngon Đà Nẵng và lưu lại những địa điểm đáng thử."
      footer={
        <span>
          Đã có tài khoản?{" "}
          <Link
            to={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
            className="text-primary underline-offset-4 hover:underline"
          >
            Đăng nhập
          </Link>
        </span>
      }
    >
      <form onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="register-name">Tên hiển thị</FieldLabel>
            <Input id="register-name" autoComplete="name" {...form.register("name")} />
            {form.formState.errors.name && (
              <FieldError>{form.formState.errors.name.message}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="register-email">Email</FieldLabel>
            <Input
              id="register-email"
              type="email"
              autoComplete="email"
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <FieldError>{form.formState.errors.email.message}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="register-handle">Tên người dùng</FieldLabel>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <InputGroupText className="text-muted-foreground">@</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                id="register-handle"
                autoComplete="username"
                placeholder="minhanh_eats"
                {...form.register("handle")}
              />
            </InputGroup>
            <FieldDescription>
              Bạn bè sẽ tìm thấy bạn qua tên này — chỉ chữ thường, số và dấu gạch dưới.
            </FieldDescription>
            {form.formState.errors.handle && (
              <FieldError>{form.formState.errors.handle.message}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="register-password">Mật khẩu</FieldLabel>
            <PasswordInput
              id="register-password"
              autoComplete="new-password"
              {...form.register("password")}
            />
            <FieldDescription>Ít nhất 8 ký tự.</FieldDescription>
            {form.formState.errors.password && (
              <FieldError>{form.formState.errors.password.message}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="register-confirm-password">Nhập lại mật khẩu</FieldLabel>
            <PasswordInput
              id="register-confirm-password"
              autoComplete="new-password"
              {...form.register("confirmPassword")}
            />
            {form.formState.errors.confirmPassword && (
              <FieldError>{form.formState.errors.confirmPassword.message}</FieldError>
            )}
          </Field>

          {formError && <FieldError>{formError}</FieldError>}

          <Button
            type="submit"
            disabled={register.isPending}
            className="h-10 w-full text-sm font-medium"
          >
            {register.isPending ? (
              <>
                <Spinner aria-label="Đang tạo tài khoản" /> Đang tạo tài khoản…
              </>
            ) : (
              "Đăng ký"
            )}
          </Button>
        </FieldGroup>
      </form>
    </AuthLayout>
  )
}
