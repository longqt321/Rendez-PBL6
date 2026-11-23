import { useState } from "react"
import { CheckIcon, CopyIcon, LogOutIcon, RotateCcwIcon, UsersIcon, XIcon } from "lucide-react"
import { SurfaceCard } from "@/components/layout/page-primitives"
import { ShareButton } from "@/components/shared/share-button"
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { MAX_MEMBER_NAME_LENGTH } from "@/lib/constants"
import { formatInitials } from "@/lib/format"
import type { RoomFilterChip } from "../lib/room"
import type { Room } from "../types/room"

interface RoomHeaderProps {
  readonly room: Room
  readonly isMember: boolean
  readonly copiedCode: boolean
  readonly activeChips: readonly RoomFilterChip[]
  readonly onCopyCode: (code: string) => void
  readonly onJoin: (name: string) => Promise<void>
  readonly onLeave: () => void
  readonly onRemoveChip: (chip: RoomFilterChip) => void
  readonly onResetFilters: () => void
}

export function RoomHeader({
  room,
  isMember,
  copiedCode,
  activeChips,
  onCopyCode,
  onJoin,
  onLeave,
  onRemoveChip,
  onResetFilters,
}: RoomHeaderProps) {
  const [joinName, setJoinName] = useState("")

  return (
    <SurfaceCard variant="accent" padding="md" className="mb-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">{room.name}</h1>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={() => onCopyCode(room.code)}
                  className="h-6 gap-1.5 rounded-full px-2.5 font-mono text-xs"
                  aria-label={`Sao chép mã phòng ${room.code}`}
                />
              }
            >
              <span>{room.code}</span>
              {copiedCode ? (
                <CheckIcon className="size-3 text-primary" aria-hidden="true" />
              ) : (
                <CopyIcon className="size-3 opacity-70" aria-hidden="true" />
              )}
            </TooltipTrigger>
            <TooltipContent>Bấm để sao chép mã phòng</TooltipContent>
          </Tooltip>

          {isMember ? (
            <Badge
              variant="outline"
              className="gap-1.5 border-primary/30 bg-primary/10 text-primary"
            >
              <span className="size-1.5 animate-pulse rounded-full bg-primary" aria-hidden="true" />
              Đang đồng bộ
            </Badge>
          ) : null}

          <div className="flex items-center gap-2 pl-1">
            <AvatarGroup>
              {room.members.map((member) => (
                <Tooltip key={member.id}>
                  <TooltipTrigger
                    render={
                      <Avatar size="sm" className="ring-2 ring-background">
                        <AvatarFallback className="bg-secondary text-xs font-bold">
                          {formatInitials(member.displayName)}
                        </AvatarFallback>
                      </Avatar>
                    }
                  />
                  <TooltipContent>{member.displayName}</TooltipContent>
                </Tooltip>
              ))}
            </AvatarGroup>
            <span className="text-xs font-medium text-muted-foreground">
              {room.members.length} thành viên
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ShareButton
            title={`Vào phòng lọc “${room.name}”`}
            url={`/rooms/${room.code}`}
            label="Mời bạn bè"
          />
          {isMember ? (
            <Button variant="outline" size="xs" onClick={onLeave}>
              <LogOutIcon className="size-3.5" aria-hidden="true" />
              Rời phòng
            </Button>
          ) : (
            <div className="flex items-center gap-1.5">
              <Input
                placeholder="Nhập tên bạn"
                maxLength={MAX_MEMBER_NAME_LENGTH}
                autoComplete="off"
                className="h-7 w-32 bg-card text-xs"
                value={joinName}
                onChange={(event) => setJoinName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.nativeEvent.isComposing || event.keyCode === 229) return
                  if (event.key === "Enter" && joinName.trim()) {
                    void onJoin(joinName)
                  }
                }}
                aria-label="Tên hiển thị của bạn"
              />
              <Button
                size="xs"
                disabled={!joinName.trim()}
                onClick={() => {
                  void onJoin(joinName)
                }}
              >
                <UsersIcon className="size-3.5" aria-hidden="true" />
                Tham gia
              </Button>
            </div>
          )}
        </div>
      </div>

      <Separator className="my-3" />

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-semibold text-muted-foreground">Tiêu chí nhóm:</span>
        {activeChips.length > 0 ? (
          <>
            {activeChips.map((chip) => (
              <Badge
                key={`${chip.kind}-${chip.field}-${chip.value}`}
                variant="outline"
                className={
                  chip.kind === "exclude"
                    ? "h-6 gap-1 rounded-full border-destructive/40 bg-destructive/10 pr-1 text-xs text-destructive"
                    : "h-6 gap-1 rounded-full border-primary/40 bg-primary/10 pr-1 text-xs text-primary"
                }
              >
                <span>{chip.label}</span>
                {isMember ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Gỡ tiêu chí ${chip.label}`}
                    onClick={() => onRemoveChip(chip)}
                    className="size-4 rounded-full"
                  >
                    <XIcon className="size-3" aria-hidden="true" />
                  </Button>
                ) : null}
              </Badge>
            ))}
            {isMember ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={onResetFilters}
                className="h-6 px-2 text-xs text-muted-foreground"
              >
                <RotateCcwIcon className="size-3" aria-hidden="true" />
                Đặt lại
              </Button>
            ) : null}
          </>
        ) : (
          <span className="text-xs text-muted-foreground">
            Chưa đặt tiêu chí. Chọn nhanh hoặc nhập yêu cầu để lọc quán phù hợp cho cả nhóm.
          </span>
        )}
      </div>
    </SurfaceCard>
  )
}
