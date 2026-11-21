import { useState } from "react"
import { PlusIcon, SparklesIcon, UsersIcon } from "lucide-react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MAX_MEMBER_NAME_LENGTH, MAX_ROOM_NAME_LENGTH, ROOM_CODE_LENGTH } from "@/lib/constants"
import type { JoinRoomStatus } from "../hooks/use-rooms"

const QUICK_ROOM_NAMES = ["Ăn trưa cùng team", "Cà phê cuối tuần", "Tối thứ 6 chill"] as const

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
      setName("")
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không tạo được phòng")
    } finally {
      setPending(false)
    }
  }

  async function handleJoin() {
    if (!code.trim()) return
    setPending(true)
    try {
      const status = await onJoin(code.trim().toUpperCase(), displayName)
      if (status === "not-found") {
        toast.error("Không tìm thấy phòng với mã này")
        return
      }
      if (status === "duplicate") {
        toast.error("Tên này đã có người dùng trong phòng, vui lòng chọn tên khác")
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UsersIcon className="size-4 text-primary" aria-hidden="true" />
            Đi cùng nhóm
          </DialogTitle>
          <DialogDescription>
            Tạo bàn tròn chọn quán hoặc tham gia phòng bạn bè qua mã 6 ký tự.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Tạo phòng mới</TabsTrigger>
            <TabsTrigger value="join">Vào bằng mã</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="mt-4 space-y-3">
            <Field>
              <FieldLabel htmlFor="room-create-name">Tên buổi hẹn / nhóm</FieldLabel>
              <Input
                id="room-create-name"
                maxLength={MAX_ROOM_NAME_LENGTH}
                placeholder="Ví dụ: Đi ăn thứ 6"
                autoComplete="off"
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.nativeEvent.isComposing || event.keyCode === 229) return
                  if (event.key === "Enter") void handleCreate()
                }}
              />
              <FieldDescription>
                Chạm nhanh gợi ý bên dưới hoặc đặt tên tuỳ ý (mã phòng sinh tự động).
              </FieldDescription>
            </Field>

            <div className="flex flex-wrap gap-1.5">
              {QUICK_ROOM_NAMES.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  size="xs"
                  variant="outline"
                  className="rounded-full text-xs"
                  onClick={() => setName(preset)}
                >
                  <SparklesIcon className="size-3 text-primary" aria-hidden="true" />
                  {preset}
                </Button>
              ))}
            </div>

            <Button
              type="button"
              className="w-full"
              onClick={() => void handleCreate()}
              disabled={pending}
            >
              <PlusIcon className="size-4" aria-hidden="true" />
              Tạo phòng & bắt đầu chốt quán
            </Button>
          </TabsContent>

          <TabsContent value="join" className="mt-4 space-y-3">
            <Field>
              <FieldLabel htmlFor="room-join-code">Mã phòng (6 ký tự)</FieldLabel>
              <Input
                id="room-join-code"
                placeholder="VD: A9K4M2"
                maxLength={ROOM_CODE_LENGTH}
                autoComplete="off"
                className="font-mono uppercase"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="room-join-display-name">Tên hiển thị của bạn</FieldLabel>
              <Input
                id="room-join-display-name"
                placeholder="VD: Minh Anh"
                maxLength={MAX_MEMBER_NAME_LENGTH}
                autoComplete="off"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.nativeEvent.isComposing || event.keyCode === 229) return
                  if (event.key === "Enter" && code.trim()) void handleJoin()
                }}
              />
            </Field>

            <Button
              type="button"
              className="w-full"
              onClick={() => void handleJoin()}
              disabled={pending || code.trim().length < ROOM_CODE_LENGTH}
            >
              Vào phòng
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
