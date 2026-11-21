import { useMemo, useState } from "react"
import { PlusIcon, RefreshCwIcon, SparklesIcon, ZapIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldTitle,
} from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CATEGORY_META } from "@/features/places/lib/category-meta"
import { DANANG_DISTRICTS } from "@/features/places/lib/danang-districts"
import { priceLevelLabel } from "@/features/places/lib/price-level"
import type { PlaceCategory } from "@/features/places/types/place"
import { cn } from "@/lib/utils"
import {
  describeProposal,
  naturalQueryToProposalInputs,
  roomFilterChips,
  type ParsedRoomProposalInput,
} from "../lib/room"
import type { Room, RoomProposalField } from "../types/room"

interface ProposalFormProps {
  room: Room
  disabled?: boolean
  onSubmitProposals: (
    items: ParsedRoomProposalInput[],
    options: { autoApply: boolean; mode: "append" | "replace" },
  ) => Promise<void> | void
  onQuickToggle: (target: {
    kind: "include" | "exclude"
    field: RoomProposalField
    value: string
  }) => Promise<void> | void
}

export function ProposalForm({
  room,
  disabled = false,
  onSubmitProposals,
  onQuickToggle,
}: ProposalFormProps) {
  const [text, setText] = useState("")
  const [enterMode, setEnterMode] = useState<"append" | "replace">("append")
  const [submitting, setSubmitting] = useState(false)

  const parsedItems = useMemo(() => naturalQueryToProposalInputs(text), [text])
  const activeChips = useMemo(() => roomFilterChips(room), [room])
  const hasActiveFilters = activeChips.length > 0

  async function handleSubmit(mode: "append" | "replace") {
    if (parsedItems.length === 0 || submitting || disabled) return
    setSubmitting(true)
    try {
      await onSubmitProposals(parsedItems, { autoApply: true, mode })
      setText("")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FieldGroup className="gap-3.5">
      <Field>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <FieldLabel htmlFor="room-natural-input">Nhập tiêu chí lọc cho cả nhóm</FieldLabel>
          {hasActiveFilters ? (
            <ToggleGroup
              value={[enterMode]}
              onValueChange={(next) => {
                const selected = next[0] as "append" | "replace" | undefined
                if (selected) setEnterMode(selected)
              }}
              variant="outline"
              size="sm"
              spacing={0}
              aria-label="Hành vi khi nhấn Enter"
            >
              <ToggleGroupItem
                value="append"
                className="h-6 px-2 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              >
                ＋ Nối tiếp
              </ToggleGroupItem>
              <ToggleGroupItem
                value="replace"
                className="h-6 px-2 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              >
                ↻ Ghi đè
              </ToggleGroupItem>
            </ToggleGroup>
          ) : null}
        </div>

        <InputGroup className="h-9 bg-card">
          <InputGroupAddon>
            <SparklesIcon className="size-3.5 text-primary" aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            id="room-natural-input"
            placeholder={
              hasActiveFilters
                ? enterMode === "append"
                  ? "Nhập tiêu chí để cộng nối tiếp vào bộ lọc hiện tại…"
                  : "Nhập tiêu chí mới để ghi đè toàn bộ bộ lọc cũ…"
                : "VD: cà phê Sơn Trà dưới 50k, không hải sản…"
            }
            autoComplete="off"
            value={text}
            disabled={disabled || submitting}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing || event.keyCode === 229) return
              if (event.key === "Enter" && parsedItems.length > 0) {
                event.preventDefault()
                void handleSubmit(hasActiveFilters ? enterMode : "append")
              }
            }}
          />
        </InputGroup>

        {parsedItems.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 rounded-control border border-border/70 bg-muted/40 p-2">
            <FieldTitle className="text-xs text-muted-foreground">
              Sẽ {hasActiveFilters && enterMode === "replace" ? "thay mới bằng" : "cộng thêm"}:
            </FieldTitle>
            {parsedItems.map((item) => (
              <Badge
                key={`${item.kind}-${item.field}-${item.value}`}
                variant="outline"
                className={cn(
                  "text-xs",
                  item.kind === "exclude"
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : "border-primary/40 bg-primary/10 text-primary",
                )}
              >
                {describeProposal(item)}
              </Badge>
            ))}
          </div>
        ) : (
          <FieldDescription className="text-xs">
            {hasActiveFilters
              ? `Đang có ${activeChips.length} tiêu chí. Nhấn Enter sẽ ${enterMode === "append" ? "cộng nối tiếp vào bộ lọc hiện có" : "xoá điều kiện cũ và lọc mới hoàn toàn"}.`
              : "Gõ tự nhiên loại hình, quận, mức giá (dưới 50k / tầm trung) hoặc từ phủ định (không, né, trừ)."}
          </FieldDescription>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {!hasActiveFilters ? (
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={disabled || submitting || parsedItems.length === 0}
              onClick={() => void handleSubmit("append")}
            >
              <ZapIcon className="size-3.5" aria-hidden="true" />
              Áp dụng bộ lọc (Enter)
            </Button>
          ) : (
            <>
              <Button
                type="button"
                size="sm"
                variant={enterMode === "append" ? "default" : "outline"}
                className="flex-1 text-xs"
                disabled={disabled || submitting || parsedItems.length === 0}
                onClick={() => void handleSubmit("append")}
              >
                <PlusIcon className="size-3.5" aria-hidden="true" />
                Cộng nối tiếp {enterMode === "append" ? "(Enter)" : ""}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={enterMode === "replace" ? "default" : "outline"}
                className="flex-1 text-xs"
                disabled={disabled || submitting || parsedItems.length === 0}
                onClick={() => void handleSubmit("replace")}
              >
                <RefreshCwIcon className="size-3.5" aria-hidden="true" />
                Ghi đè mới {enterMode === "replace" ? "(Enter)" : ""}
              </Button>
            </>
          )}
        </div>
      </Field>

      <FieldSeparator />

      <Field>
        <FieldTitle className="text-xs text-muted-foreground">Loại hình</FieldTitle>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(CATEGORY_META) as PlaceCategory[]).map((category) => (
            <Toggle
              key={category}
              size="sm"
              variant="outline"
              disabled={disabled}
              pressed={room.filter.categories.includes(category)}
              onPressedChange={() =>
                void onQuickToggle({ kind: "include", field: "category", value: category })
              }
              className="h-7 rounded-full px-2.5 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            >
              {CATEGORY_META[category].label}
            </Toggle>
          ))}
        </div>
      </Field>

      <Field>
        <FieldTitle className="text-xs text-muted-foreground">Quận tại Đà Nẵng</FieldTitle>
        <div className="flex flex-wrap gap-1.5">
          {DANANG_DISTRICTS.map((district) => (
            <Toggle
              key={district}
              size="sm"
              variant="outline"
              disabled={disabled}
              pressed={room.filter.districts.includes(district)}
              onPressedChange={() =>
                void onQuickToggle({ kind: "include", field: "district", value: district })
              }
              className="h-7 rounded-full px-2.5 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            >
              {district}
            </Toggle>
          ))}
        </div>
      </Field>

      <Field>
        <FieldTitle className="text-xs text-muted-foreground">Ngân sách tối đa</FieldTitle>
        <div className="flex flex-wrap gap-1.5">
          {([1, 2, 3] as const).map((level) => (
            <Toggle
              key={level}
              size="sm"
              variant="outline"
              disabled={disabled}
              pressed={room.filter.priceMax === level}
              onPressedChange={() =>
                void onQuickToggle({
                  kind: "include",
                  field: "priceMax",
                  value: String(level),
                })
              }
              className="h-7 rounded-full px-2.5 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            >
              {priceLevelLabel(level)}
              {level < 3 ? " trở xuống" : ""}
            </Toggle>
          ))}
        </div>
      </Field>
    </FieldGroup>
  )
}
