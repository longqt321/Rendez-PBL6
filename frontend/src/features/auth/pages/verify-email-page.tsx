import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { parseAsString, useQueryState } from "nuqs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useAuthPageTitle } from "../hooks/use-auth-page"
import { AuthLayout } from "../components/auth-layout"
import { useSendVerificationEmail } from "../hooks/use-send-verification-email"
import { mapAuthErrorMessage } from "../lib/auth-error-messages"

function errorMessage(code: string): string {
  const mapped = mapAuthErrorMessage({ message: code, code })
  // Mã lạ: `mapAuthErrorMessage` trả lại chính mã — thay bằng câu chung.
  return mapped === code ? "Không xác thực được email." : mapped
}

export function VerifyEmailPage() {
  const [errorCode] = useQueryState("error", parseAsString)
  const [verifiedParam] = useQueryState("verified", parseAsString)
  const [nextParam] = useQueryState("next", parseAsString)
  const navigate = useNavigate()
  const resend = useSendVerificationEmail()
  useAuthPageTitle("Xác thực email")
  const [email, setEmail] = useState("")
  const verified = verifiedParam === "1"
  const safeNext =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/discover"
  const loginHref =
    safeNext !== "/discover" ? `/login?next=${encodeURIComponent(safeNext)}` : "/login"

  if (verified && !errorCode) {
    return (
      <AuthLayout
        title="Email đã được xác thực"
        description="Tài khoản của bạn đã sẵn sàng. Nếu vừa bấm liên kết trong email, bạn đã được đăng nhập."
        footer={
          <Link to={loginHref} className="text-primary underline-offset-4 hover:underline">
            Sang trang đăng nhập
          </Link>
        }
      >
        <div className="flex flex-col gap-4">
          <Alert>
            <AlertTitle>Xác thực thành công</AlertTitle>
            <AlertDescription>
              Email đã xác thực. Tài khoản của bạn đã sẵn sàng sử dụng.
            </AlertDescription>
          </Alert>
          <Button
            className="h-10 w-full text-sm font-medium"
            onClick={() => void navigate(safeNext)}
          >
            {safeNext === "/discover" ? "Vào Rendez" : "Tiếp tục"}
          </Button>
        </div>
      </AuthLayout>
    )
  }

  // Không có `verified=1` (mở trực tiếp, link cắt mất tham số) hoặc có `?error=`
  // (token sai/hết hạn) → đều là link không dùng được, kèm form gửi lại email.
  const reason = errorCode
    ? errorMessage(errorCode)
    : "Link không hợp lệ hoặc thiếu token xác thực."

  return (
    <AuthLayout
      title="Chưa xác thực được email"
      description={reason}
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
            {resend.isError && <FieldError>{mapAuthErrorMessage(resend.error)}</FieldError>}
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
