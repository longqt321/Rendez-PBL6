import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { MAX_MEMBER_NAME_LENGTH, MAX_ROOM_NAME_LENGTH, ROOM_CODE_LENGTH } from "@/lib/constants"
import type { JoinRoomStatus } from "../hooks/use-rooms"

interface RoomJoinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void

  onCreate: (name: string) => Promise<string>

  onJoin: (code: string, displayName: string) => Promise<JoinRoomStatus>
}

export function RoomJoinDialog({ open, onOpenChange, onCreate, onJoin }: RoomJoinDialogProps) {
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [pending, setPending] = useState(false)

  async function handleCreate() {
    setPending(true)
    try {
      const createdCode = await onCreate(name)
      toast.success(`Đã tạo phòng ${createdCode}`)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không tạo được phòng")
    } finally {
      setPending(false)
    }
  }

  async function handleJoin() {
    setPending(true)
    try {
      const status = await onJoin(code.trim().toUpperCase(), displayName)
      if (status === "not-found") {
        toast.error("Không tìm thấy phòng với mã này")
        return
      }
      if (status === "duplicate") {
        toast.error("Tên này đã có người dùng trong phòng — chọn tên khác")
        return
      }
      if (status === "already") {
        toast.success("Bạn đã ở trong phòng này")
        onOpenChange(false)
        return
      }
      toast.success(`Đã vào phòng ${code.trim().toUpperCase()}`)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không vào được phòng")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Đi cùng nhóm</DialogTitle>
          <DialogDescription>
            Tạo phòng lọc chung hoặc vào phòng bạn bè đã tạo. Mọi người cùng xem một kết quả lọc.
          </DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="room-create-name">Tạo phòng mới</FieldLabel>
          <Input
            id="room-create-name"
            maxLength={MAX_ROOM_NAME_LENGTH}
            placeholder="Ví dụ: Đi ăn thứ 6"
            autoComplete="off"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              // Enter đang xác nhận ứng viên IME không được coi là submit.
              if (event.nativeEvent.isComposing || event.keyCode === 229) return
              if (event.key === "Enter") void handleCreate()
            }}
          />
          <FieldDescription>
            Mã phòng sẽ sinh tự động, chia sẻ cho bạn bè để họ vào cùng.
          </FieldDescription>
          <Button
            type="button"
            className="mt-1 w-full"
            onClick={() => void handleCreate()}
            disabled={pending}
          >
            Tạo phòng
          </Button>
        </Field>

        <Separator />

        <Field>
          <FieldLabel htmlFor="room-join-code">Vào phòng có sẵn</FieldLabel>
          <div className="flex items-center gap-2">
            <Input
              id="room-join-code"
              placeholder="Mã 6 ký tự"
              maxLength={ROOM_CODE_LENGTH}
              autoComplete="off"
              className="min-w-0 flex-1 font-mono uppercase"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
            <Input
              placeholder="Tên bạn"
              maxLength={MAX_MEMBER_NAME_LENGTH}
              autoComplete="off"
              className="w-28"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              aria-label="Tên hiển thị của bạn"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => void handleJoin()}
            disabled={pending}
          >
            Vào phòng
          </Button>
        </Field>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
