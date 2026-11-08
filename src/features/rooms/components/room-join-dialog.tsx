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
  /** Tạo phòng mới; trả về mã phòng vừa tạo. */
  onCreate: (name: string) => string
  /** Tham gia phòng theo mã; trả trạng thái để hiện toast đúng nguyên nhân. */
  onJoin: (code: string, displayName: string) => JoinRoomStatus
}

/**
 * Dialog tạo phòng mới hoặc tham gia phòng theo mã.
 *
 * Demo mock: "tham gia" chỉ là đặt tên hiển thị — app chưa có auth nên mỗi tab
 * là một thành viên, dữ liệu phòng chung qua localStorage.
 */
export function RoomJoinDialog({ open, onOpenChange, onCreate, onJoin }: RoomJoinDialogProps) {
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [displayName, setDisplayName] = useState("")

  function handleCreate() {
    const createdCode = onCreate(name)
    toast.success(`Đã tạo phòng ${createdCode}`)
    onOpenChange(false)
  }

  function handleJoin() {
    const status = onJoin(code.trim().toUpperCase(), displayName)
    if (status === "not-found") {
      toast.error("Không tìm thấy phòng với mã này")
      return
    }
    if (status === "duplicate") {
      toast.error("Tên này đã có người dùng trong phòng — chọn tên khác")
      return
    }
    toast.success(`Đã vào phòng ${code.trim().toUpperCase()}`)
    onOpenChange(false)
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
              if (event.key === "Enter") handleCreate()
            }}
          />
          <FieldDescription>
            Mã phòng sẽ sinh tự động, chia sẻ cho bạn bè để họ vào cùng.
          </FieldDescription>
          <Button type="button" className="mt-1 w-full" onClick={handleCreate}>
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
          <Button type="button" variant="outline" className="w-full" onClick={handleJoin}>
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
