import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { Link, Navigate } from "react-router"
import { parseAsString, useQueryState } from "nuqs"
import { z } from "zod"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { useRegister } from "../hooks/use-register"
import {
  defaultAuthenticatedPath,
  useAuthenticatedRedirect,
  useAuthPageTitle,
} from "../hooks/use-auth-page"
import { useAuthProviders } from "../hooks/use-auth-providers"
import { useSendVerificationEmail } from "../hooks/use-send-verification-email"
import { AuthLayout } from "../components/auth-layout"
import { PasswordInput } from "../components/password-input"
import { TermsDialog } from "../components/terms-dialog"
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
    acceptTerms: z.boolean().refine((checked) => checked, {
      message: "Bạn cần đồng ý Điều khoản sử dụng để đăng ký tài khoản",
    }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Mật khẩu nhập lại không khớp",
    path: ["confirmPassword"],
  })

type RegisterForm = z.infer<typeof registerSchema>

const REGISTER_FIELDS = ["name", "email", "handle", "password"] as const

export function RegisterPage() {
  const [nextParam] = useQueryState("next", parseAsString)
  const next = safeRedirectPath(nextParam)
  const register = useRegister()
  const resend = useSendVerificationEmail()
  const { data: providersData } = useAuthProviders()
  useAuthPageTitle("Tạo tài khoản")

  const [sentTo, setSentTo] = useState<string | null>(null)
  const [termsOpen, setTermsOpen] = useState(false)

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      handle: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  })

  // Đã đăng nhập: không cần tạo tài khoản nữa (V1-09).
  const redirectTo = useAuthenticatedRedirect(next)
  if (redirectTo) return <Navigate to={redirectTo} replace />

  const onSubmit = (values: RegisterForm) => {
    // Chỉ gửi các field backend nhận — `confirmPassword` chỉ dùng để validate.
    register.mutate(
      {
        name: values.name,
        email: values.email,
        password: values.password,
        handle: values.handle,
        acceptTerms: values.acceptTerms,
      },
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
          <Field data-invalid={!!form.formState.errors.name}>
            <FieldLabel htmlFor="register-name">Tên hiển thị</FieldLabel>
            <Input
              id="register-name"
              autoComplete="name"
              aria-invalid={!!form.formState.errors.name}
              aria-describedby={form.formState.errors.name ? "register-name-error" : undefined}
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <FieldError id="register-name-error">{form.formState.errors.name.message}</FieldError>
            )}
          </Field>

          <Field data-invalid={!!form.formState.errors.email}>
            <FieldLabel htmlFor="register-email">Email</FieldLabel>
            <Input
              id="register-email"
              type="email"
              autoComplete="email"
              aria-invalid={!!form.formState.errors.email}
              aria-describedby={form.formState.errors.email ? "register-email-error" : undefined}
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <FieldError id="register-email-error">
                {form.formState.errors.email.message}
              </FieldError>
            )}
          </Field>

          <Field data-invalid={!!form.formState.errors.handle}>
            <FieldLabel htmlFor="register-handle">Tên người dùng</FieldLabel>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <InputGroupText className="text-muted-foreground">@</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                id="register-handle"
                autoComplete="username"
                placeholder="minhanh_eats"
                aria-invalid={!!form.formState.errors.handle}
                aria-describedby={
                  form.formState.errors.handle ? "register-handle-error" : "register-handle-hint"
                }
                {...form.register("handle")}
              />
            </InputGroup>
            <FieldDescription id="register-handle-hint">
              Bạn bè sẽ tìm thấy bạn qua tên này. Chỉ dùng chữ thường, số và dấu gạch dưới.
            </FieldDescription>
            {form.formState.errors.handle && (
              <FieldError id="register-handle-error">
                {form.formState.errors.handle.message}
              </FieldError>
            )}
          </Field>

          <Field data-invalid={!!form.formState.errors.password}>
            <FieldLabel htmlFor="register-password">Mật khẩu</FieldLabel>
            <PasswordInput
              id="register-password"
              autoComplete="new-password"
              aria-invalid={!!form.formState.errors.password}
              aria-describedby={
                form.formState.errors.password
                  ? "register-password-error"
                  : "register-password-hint"
              }
              {...form.register("password")}
            />
            <FieldDescription id="register-password-hint">Ít nhất 8 ký tự.</FieldDescription>
            {form.formState.errors.password && (
              <FieldError id="register-password-error">
                {form.formState.errors.password.message}
              </FieldError>
            )}
          </Field>

          <Field data-invalid={!!form.formState.errors.confirmPassword}>
            <FieldLabel htmlFor="register-confirm-password">Nhập lại mật khẩu</FieldLabel>
            <PasswordInput
              id="register-confirm-password"
              autoComplete="new-password"
              aria-invalid={!!form.formState.errors.confirmPassword}
              aria-describedby={
                form.formState.errors.confirmPassword
                  ? "register-confirm-password-error"
                  : undefined
              }
              {...form.register("confirmPassword")}
            />
            {form.formState.errors.confirmPassword && (
              <FieldError id="register-confirm-password-error">
                {form.formState.errors.confirmPassword.message}
              </FieldError>
            )}
          </Field>

          {formError && <FieldError>{formError}</FieldError>}

          <Field data-invalid={!!form.formState.errors.acceptTerms} orientation="horizontal">
            <Controller
              control={form.control}
              name="acceptTerms"
              render={({ field }) => (
                <Checkbox
                  id="register-accept-terms"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  aria-invalid={!!form.formState.errors.acceptTerms}
                  aria-describedby={
                    form.formState.errors.acceptTerms ? "register-accept-terms-error" : undefined
                  }
                />
              )}
            />
            <FieldContent>
              <FieldLabel
                htmlFor="register-accept-terms"
                className="inline leading-relaxed font-normal text-foreground"
              >
                Tôi đã đọc và đồng ý với{" "}
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 align-baseline font-medium"
                  onClick={() => setTermsOpen(true)}
                >
                  Điều khoản sử dụng
                </Button>{" "}
                và{" "}
                <Link
                  to="/privacy"
                  className="font-medium text-primary underline underline-offset-4"
                >
                  Chính sách bảo mật
                </Link>
                .
              </FieldLabel>
              {form.formState.errors.acceptTerms && (
                <FieldError id="register-accept-terms-error">
                  {form.formState.errors.acceptTerms.message}
                </FieldError>
              )}
            </FieldContent>
          </Field>

          <TermsDialog
            open={termsOpen}
            onOpenChange={setTermsOpen}
            acceptLabel="Tôi đồng ý điều khoản"
            onAccept={() => {
              form.setValue("acceptTerms", true, { shouldValidate: true })
              setTermsOpen(false)
            }}
          />

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

          {providersData?.providers.includes("google") ? (
            <>
              <FieldSeparator />
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full text-sm font-medium"
                onClick={() => {
                  if (!form.getValues("acceptTerms")) {
                    form.setError("acceptTerms", {
                      type: "manual",
                      message: "Bạn cần đồng ý Điều khoản sử dụng để đăng ký tài khoản",
                    })
                    return
                  }
                  window.location.href = `/api/auth/sign-in/social?provider=google&callbackURL=${encodeURIComponent(
                    window.location.origin + (next ?? defaultAuthenticatedPath("user")),
                  )}`
                }}
              >
                Đăng ký bằng Google
              </Button>
            </>
          ) : null}
        </FieldGroup>
      </form>
    </AuthLayout>
  )
}
