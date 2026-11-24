import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { ArrowRightIcon, CheckCircle2Icon, LogInIcon, PlusIcon, UsersIcon } from "lucide-react"
import { toast } from "sonner"
import { PageContainer, SurfaceCard } from "@/components/layout/page-primitives"
import { SectionHeading } from "@/components/shared/section-heading"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import { useMe } from "@/features/profile/hooks/use-me"
import { useMyRooms, useRooms } from "../hooks/use-rooms"

const PHASE_LABEL: Record<string, string> = {
  filtering: "Đang chọn quán",
  voting: "Đang bình chọn",
  locked: "Đã chốt quán",
}

export function RoomsLobbyPage() {
  const navigate = useNavigate()
  const { data: me, isPending: mePending } = useMe()
  const { activeCode, getRoom, createRoom, joinRoom } = useRooms()
  const activeRoom = activeCode ? getRoom(activeCode) : undefined
  const { data: myRooms = [] } = useMyRooms(Boolean(me))

  const [roomName, setRoomName] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [displayNameDraft, setDisplayNameDraft] = useState<string | null>(null)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)

  const displayName = displayNameDraft ?? me?.name ?? ""

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!me) {
      toast.error("Bạn cần đăng nhập để tạo phòng nhóm mới")
      return
    }
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
      const result = await joinRoom(code, displayName.trim() || me?.name || "Khách")
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

  const recentRooms = myRooms.filter((item) => item.code !== activeRoom?.code)

  return (
    <PageContainer size="narrow">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Phòng nhóm</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cùng bạn bè đề xuất địa điểm, đặt tiêu chí cá nhân và chọn quán công bằng nhất cho cả
          nhóm.
        </p>
      </div>

      {activeRoom ? (
        <SurfaceCard variant="accent" padding="md" className="mb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs">
                  Đang mở
                </Badge>
                <span className="font-mono text-xs text-muted-foreground">{activeRoom.code}</span>
              </div>
              <p className="mt-1 truncate font-display text-base font-bold">{activeRoom.name}</p>
              <p className="text-xs text-muted-foreground">
                {activeRoom.members.length} thành viên · {activeRoom.candidates.length} quán đề xuất
              </p>
            </div>
            <Button
              size="sm"
              nativeButton={false}
              render={<Link to={`/rooms/${activeRoom.code}`} />}
            >
              Vào lại phòng
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </SurfaceCard>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SurfaceCard padding="lg" className="flex flex-col justify-between">
          <div>
            <div className="mb-3 inline-flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <PlusIcon className="size-5" aria-hidden="true" />
            </div>
            <h2 className="font-display text-lg font-bold">Tạo phòng mới</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Nhận mã 6 ký tự để gửi cho bạn bè cùng đề xuất quán theo thời gian thực.
            </p>
          </div>

          {!mePending && !me ? (
            <div className="mt-5 space-y-3">
              <p className="text-xs text-muted-foreground">
                Đăng nhập để tạo phòng mới và lưu lại danh sách phòng bạn đã tham gia.
              </p>
              <Button
                className="w-full"
                nativeButton={false}
                render={<Link to="/login?next=%2Frooms" />}
              >
                <LogInIcon className="size-4" aria-hidden="true" />
                Đăng nhập để tạo phòng
              </Button>
            </div>
          ) : (
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
              <Button type="submit" className="w-full" disabled={creating || mePending}>
                {creating ? (
                  <Spinner aria-label="Đang tạo phòng" />
                ) : (
                  <PlusIcon aria-hidden="true" />
                )}
                Tạo phòng nhóm
              </Button>
            </form>
          )}
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
                placeholder={me?.name ? me.name : "Để trống sẽ dùng tên mặc định"}
                value={displayName}
                onChange={(e) => setDisplayNameDraft(e.target.value)}
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

      {recentRooms.length > 0 ? (
        <section className="mt-6 space-y-3">
          <SectionHeading>Phòng bạn đã tham gia</SectionHeading>
          <ItemGroup className="gap-2">
            {recentRooms.map((item) => (
              <Item key={item.id} variant="outline" size="sm" className="rounded-surface bg-card">
                <ItemContent>
                  <ItemTitle className="flex flex-wrap items-center gap-2">
                    <span className="truncate">{item.name}</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {item.code}
                    </Badge>
                    <Badge
                      variant={item.phase === "locked" ? "default" : "secondary"}
                      className="gap-1 text-xs"
                    >
                      {item.phase === "locked" ? (
                        <CheckCircle2Icon className="size-3" aria-hidden="true" />
                      ) : null}
                      {PHASE_LABEL[item.phase] ?? item.phase}
                    </Badge>
                  </ItemTitle>
                  <ItemDescription className="text-xs">
                    {item.memberCount} thành viên · {item.candidateCount} quán đề xuất
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button
                    size="xs"
                    variant="outline"
                    nativeButton={false}
                    render={<Link to={`/rooms/${item.code}`} />}
                  >
                    Mở phòng
                  </Button>
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        </section>
      ) : null}
    </PageContainer>
  )
}
