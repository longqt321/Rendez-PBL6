import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useRegister } from "../hooks/use-register"
import { AuthLayout } from "../components/auth-layout"

/** Khớp validate backend (`registerInputSchema` trong `routes/auth.ts`). */
const registerSchema = z.object({
  name: z.string().trim().min(2, "Tên cần ít nhất 2 ký tự").max(40, "Tên tối đa 40 ký tự"),
  email: z.string().trim().toLowerCase().pipe(z.email("Email không hợp lệ")),
  password: z.string().min(8, "Mật khẩu cần ít nhất 8 ký tự").max(128, "Mật khẩu tối đa 128 ký tự"),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Handle cần ít nhất 3 ký tự")
    .max(30, "Handle tối đa 30 ký tự")
    .regex(/^[a-z0-9_]+$/, "Handle chỉ gồm chữ thường, số và gạch dưới"),
})

type RegisterForm = z.infer<typeof registerSchema>

/** Trang đăng ký — `/register`. Đăng ký xong backend trả phiên luôn. */
export function RegisterPage() {
  const navigate = useNavigate()
  const register = useRegister()

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", handle: "" },
  })

  const onSubmit = (values: RegisterForm) => {
    register.mutate(values, {
      onSuccess: () => {
        void navigate("/discover")
      },
    })
  }

  return (
    <AuthLayout
      title="Tạo tài khoản"
      description="Chia sẻ quán ngon Đà Nẵng và lưu lại những địa điểm đáng thử."
      footer={
        <span>
          Đã có tài khoản?{" "}
          <Link to="/login" className="text-primary underline-offset-4 hover:underline">
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
            <FieldLabel htmlFor="register-handle">Handle</FieldLabel>
            <Input
              id="register-handle"
              autoComplete="username"
              placeholder="vd: minhanh.eats"
              {...form.register("handle")}
            />
            <FieldDescription>
              Dùng trong đường dẫn hồ sơ của bạn: /u/&lt;handle&gt;.
            </FieldDescription>
            {form.formState.errors.handle && (
              <FieldError>{form.formState.errors.handle.message}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="register-password">Mật khẩu</FieldLabel>
            <Input
              id="register-password"
              type="password"
              autoComplete="new-password"
              {...form.register("password")}
            />
            <FieldDescription>Ít nhất 8 ký tự.</FieldDescription>
            {form.formState.errors.password && (
              <FieldError>{form.formState.errors.password.message}</FieldError>
            )}
          </Field>

          {register.isError && <FieldError>{register.error.message}</FieldError>}

          <Button type="submit" disabled={register.isPending} className="w-full">
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
