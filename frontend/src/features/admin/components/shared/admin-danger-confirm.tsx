import { useState } from "react"
import { ShieldAlertIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useAdminRuntime } from "./admin-env-store"

interface AdminDangerConfirmProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly title: string
  readonly description: string
  readonly confirmToken: string
  readonly confirmLabel?: string
  readonly actionLabel?: string
  readonly isPending?: boolean
  readonly onConfirm: () => void
}

export function AdminDangerConfirm({
  open,
  onOpenChange,
  title,
  description,
  confirmToken,
  confirmLabel = "Nhập chính xác để xác nhận",
  actionLabel = "Xác nhận",
  isPending = false,
  onConfirm,
}: AdminDangerConfirmProps) {
  const { requiresStrictConfirm, env } = useAdminRuntime()
  const [typed, setTyped] = useState("")

  const expected = confirmToken.trim()
  const tokenMatched = !requiresStrictConfirm || typed.trim() === expected

  function handleOpenChange(next: boolean) {
    if (!next) setTyped("")
    onOpenChange(next)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlertIcon className="size-5 shrink-0" aria-hidden="true" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {requiresStrictConfirm ? (
          <div className="space-y-3">
            <Alert variant="destructive">
              <ShieldAlertIcon className="size-4" aria-hidden="true" />
              <AlertTitle>Môi trường Production</AlertTitle>
              <AlertDescription>
                Thay đổi áp dụng lên dữ liệu thật và ghi vĩnh viễn vào nhật ký kiểm toán.
              </AlertDescription>
            </Alert>
            <Field>
              <FieldLabel htmlFor="admin-danger-confirm-input">
                {confirmLabel}:{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold text-foreground">
                  {expected}
                </code>
              </FieldLabel>
              <Input
                id="admin-danger-confirm-input"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                placeholder={expected}
                autoComplete="off"
                autoFocus
              />
            </Field>
          </div>
        ) : (
          <Alert>
            <AlertTitle className="text-xs uppercase">Môi trường {env}</AlertTitle>
            <AlertDescription className="text-xs">
              Xác nhận 1 bước. Trên Production sẽ yêu cầu gõ lại{" "}
              <code className="font-mono text-foreground">{expected}</code>.
            </AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Huỷ</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!tokenMatched || isPending}
            onClick={(event) => {
              event.preventDefault()
              if (!tokenMatched || isPending) return
              onConfirm()
            }}
          >
            {isPending ? <Spinner aria-label="Đang thực thi" /> : null}
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
