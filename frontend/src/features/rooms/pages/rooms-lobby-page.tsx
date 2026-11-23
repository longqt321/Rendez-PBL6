import { useState } from "react"
import { Navigate, useNavigate } from "react-router"
import { ArrowRightIcon, PlusIcon, UsersIcon } from "lucide-react"
import { toast } from "sonner"
import { PageContainer, SurfaceCard } from "@/components/layout/page-primitives"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useRooms } from "../hooks/use-rooms"

export function RoomsLobbyPage() {
  const navigate = useNavigate()
  const { activeCode, getRoom, createRoom, joinRoom } = useRooms()
  const activeRoom = activeCode ? getRoom(activeCode) : undefined

  const [roomName, setRoomName] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [joinError, setJoinError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)

  if (activeRoom) {
    return <Navigate to={`/rooms/${activeRoom.code}`} replace />
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const name = roomName.trim() || "Phòng lọc nhóm"
    setCreating(true)
    try {
      const code = await createRoom(name)
      toast.success(`Đã tạo phòng “${name}”`)
      void navigate(`/rooms/${code}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không tạo được phòng")
    } finally {
      setCreating(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const code = joinCode.trim().toUpperCase()
    if (!code) {
      setJoinError("Nhập mã phòng gồm 6 ký tự")
      return
    }
    setJoinError(null)
    setJoining(true)
    try {
      const result = await joinRoom(code, displayName.trim() || "Khách")
      if (result === "not-found") {
        setJoinError("Không tìm thấy phòng với mã này")
        return
      }
      if (result === "duplicate") {
        setJoinError("Tên hiển thị đã được dùng trong phòng, hãy chọn tên khác")
        return
      }
      toast.success("Đã tham gia phòng nhóm")
      void navigate(`/rooms/${code}`)
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : "Không vào được phòng")
    } finally {
      setJoining(false)
    }
  }

  return (
    <PageContainer size="narrow">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Phòng nhóm</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cùng bạn bè lọc quán theo tiêu chí chung và bình chọn địa điểm phù hợp.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SurfaceCard padding="lg" className="flex flex-col justify-between">
          <div>
            <div className="mb-3 inline-flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <PlusIcon className="size-5" aria-hidden="true" />
            </div>
            <h2 className="font-display text-lg font-bold">Tạo phòng mới</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Nhận mã 6 ký tự để gửi cho bạn bè cùng lọc quán theo thời gian thực.
            </p>
          </div>

          <form onSubmit={(e) => void handleCreate(e)} className="mt-5 space-y-3">
            <Field>
              <FieldLabel htmlFor="lobby-room-name">Tên phòng (tuỳ chọn)</FieldLabel>
              <Input
                id="lobby-room-name"
                placeholder="Ví dụ: Cà phê cuối tuần"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
              />
            </Field>
            <Button type="submit" className="w-full" disabled={creating}>
              {creating ? <Spinner aria-label="Đang tạo phòng" /> : <PlusIcon aria-hidden="true" />}
              Tạo phòng nhóm
            </Button>
          </form>
        </SurfaceCard>

        <SurfaceCard padding="lg" className="flex flex-col justify-between">
          <div>
            <div className="mb-3 inline-flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
              <UsersIcon className="size-5" aria-hidden="true" />
            </div>
            <h2 className="font-display text-lg font-bold">Vào bằng mã</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Nhập mã phòng bạn bè vừa chia sẻ để cùng xem danh sách quán.
            </p>
          </div>

          <form onSubmit={(e) => void handleJoin(e)} className="mt-5 space-y-3">
            <Field data-invalid={Boolean(joinError)}>
              <FieldLabel htmlFor="lobby-room-code">Mã phòng</FieldLabel>
              <Input
                id="lobby-room-code"
                placeholder="Ví dụ: RYCDNT"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                aria-invalid={Boolean(joinError)}
                className="font-mono uppercase"
              />
              {joinError ? <FieldError errors={[{ message: joinError }]} /> : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="lobby-display-name">Tên của bạn</FieldLabel>
              <Input
                id="lobby-display-name"
                placeholder="Để trống sẽ dùng tên mặc định"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </Field>
            <Button type="submit" variant="outline" className="w-full" disabled={joining}>
              {joining ? (
                <Spinner aria-label="Đang vào phòng" />
              ) : (
                <ArrowRightIcon aria-hidden="true" />
              )}
              Tham gia phòng
            </Button>
          </form>
        </SurfaceCard>
      </div>
    </PageContainer>
  )
}
