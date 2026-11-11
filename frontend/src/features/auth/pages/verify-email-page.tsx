import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { AuthLayout } from "../components/auth-layout"
import { useSendVerificationEmail } from "../hooks/use-send-verification-email"

/**
 * Trang nhận kết quả xác thực email — `/verify-email`.
 *
 * Link trong mail trỏ tới API (`/api/v1/auth/verify-email?token=…`) — API xác
 * thực xong redirect về đây: thành công thì KHÔNG kèm tham số (và đã set cookie
 * phiên nhờ `autoSignInAfterVerification`), lỗi thì kèm `?error=CODE`
 * (`redirectOnError` trong `dist/api/routes/email-verification.mjs`).
 *
 * Trang không tự gọi API: việc xác thực đã xong ở phía server trước khi redirect.
 */

/** Mã lỗi better-auth → câu tiếng Việt không dùng thuật ngữ kỹ thuật. */
function errorMessage(code: string): string {
  switch (code) {
    case "TOKEN_EXPIRED":
      return "Link xác thực đã hết hạn."
    case "INVALID_TOKEN":
      return "Link xác thực không hợp lệ."
    case "USER_NOT_FOUND":
      return "Không tìm thấy tài khoản cho link này."
    default:
      return "Không xác thực được email."
  }
}

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const resend = useSendVerificationEmail()
  const [email, setEmail] = useState("")
  const errorCode = searchParams.get("error")

  if (!errorCode) {
    return (
      <AuthLayout
        title="Email đã được xác thực"
        description="Tài khoản của bạn đã sẵn sàng — nếu vừa bấm link trong email, bạn đã được đăng nhập."
        footer={
          <Link to="/login" className="text-primary underline-offset-4 hover:underline">
            Sang trang đăng nhập
          </Link>
        }
      >
        <div className="flex flex-col gap-4">
          <Alert>
            <AlertTitle>Xác thực thành công</AlertTitle>
            <AlertDescription>
              Cảm ơn bạn đã xác thực email. Bắt đầu khám phá quán ngon Đà Nẵng thôi.
            </AlertDescription>
          </Alert>
          <Button
            className="h-10 w-full text-sm font-medium"
            onClick={() => void navigate("/discover")}
          >
            Vào Rendez
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Chưa xác thực được email"
      description={errorMessage(errorCode)}
      footer={
        <Link to="/login" className="text-primary underline-offset-4 hover:underline">
          Quay lại đăng nhập
        </Link>
      }
    >
      <div className="flex flex-col gap-4">
        <Alert variant="destructive">
          <AlertTitle>Link không dùng được</AlertTitle>
          <AlertDescription>
            Link có thể đã hết hạn hoặc đã được dùng. Nhập email để nhận link mới.
          </AlertDescription>
        </Alert>

        {resend.isSuccess && (
          <Alert>
            <AlertTitle>Đã gửi email xác thực</AlertTitle>
            <AlertDescription>Kiểm tra hộp thư (cả mục spam) rồi mở link mới.</AlertDescription>
          </Alert>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault()
            resend.mutate(email)
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="verify-email">Email</FieldLabel>
              <Input
                id="verify-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            {resend.isError && <FieldError>{resend.error.message}</FieldError>}
            <Button
              type="submit"
              variant="outline"
              className="h-10 w-full text-sm font-medium"
              disabled={resend.isPending || email.trim().length === 0}
            >
              {resend.isPending ? (
                <>
                  <Spinner aria-label="Đang gửi email xác thực" /> Đang gửi…
                </>
              ) : (
                "Gửi lại email xác thực"
              )}
            </Button>
          </FieldGroup>
        </form>
      </div>
    </AuthLayout>
  )
}
