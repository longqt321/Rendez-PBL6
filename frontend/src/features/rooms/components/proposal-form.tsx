import { useMemo, useState } from "react"
import { PlusIcon, SparklesIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel, FieldSeparator, FieldTitle } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Toggle } from "@/components/ui/toggle"
import { CATEGORY_META } from "@/features/places/lib/category-meta"
import { DANANG_DISTRICTS } from "@/features/places/lib/danang-districts"
import { priceLevelLabel } from "@/features/places/lib/price-level"
import type { PlaceCategory } from "@/features/places/types/place"
import { cn } from "@/lib/utils"
import {
  describeProposal,
  naturalQueryToProposalInputs,
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
  const [submitting, setSubmitting] = useState(false)

  const parsedItems = useMemo(() => naturalQueryToProposalInputs(text), [text])

  async function handleSubmit() {
    if (parsedItems.length === 0 || submitting || disabled) return
    setSubmitting(true)
    try {
      await onSubmitProposals(parsedItems, { autoApply: true, mode: "append" })
      setText("")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FieldGroup className="gap-3">
      <Field>
        <FieldLabel htmlFor="room-natural-input">Nhập nhanh tiêu chí</FieldLabel>
        <div className="flex items-center gap-2">
          <InputGroup className="h-9 flex-1 bg-card">
            <InputGroupAddon>
              <SparklesIcon className="size-3.5 text-primary" aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              id="room-natural-input"
              placeholder="VD: cà phê Sơn Trà dưới 50k, không hải sản…"
              autoComplete="off"
              value={text}
              disabled={disabled || submitting}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing || event.keyCode === 229) return
                if (event.key === "Enter" && parsedItems.length > 0) {
                  event.preventDefault()
                  void handleSubmit()
                }
              }}
            />
          </InputGroup>
          <Button
            type="button"
            size="sm"
            disabled={disabled || submitting || parsedItems.length === 0}
            onClick={() => void handleSubmit()}
            aria-label="Thêm tiêu chí"
          >
            <PlusIcon className="size-4" aria-hidden="true" />
            Thêm
          </Button>
        </div>

        {parsedItems.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 rounded-control border border-border/70 bg-muted/40 p-2">
            <span className="text-xs text-muted-foreground">Sẽ thêm:</span>
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
        ) : null}
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
              {level < 3 ? `${priceLevelLabel(level)} trở xuống` : priceLevelLabel(level)}
            </Toggle>
          ))}
        </div>
      </Field>
    </FieldGroup>
  )
}
