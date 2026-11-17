import { useState } from "react"
import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CATEGORY_META } from "@/features/places/lib/category-meta"
import { DANANG_DISTRICTS } from "@/features/places/lib/danang-districts"
import { priceLevelLabel } from "@/features/places/lib/price-level"
import type { PlaceCategory } from "@/features/places/types/place"
import { MAX_ROOM_KEYWORD_LENGTH } from "@/lib/constants"
import type { RoomProposalField } from "../types/room"

interface ProposalFormProps {
  onSubmit: (input: {
    kind: "include" | "exclude"
    field: RoomProposalField
    value: string
  }) => void
}

const FIELD_TABS: { value: RoomProposalField; label: string }[] = [
  { value: "category", label: "Loại hình" },
  { value: "district", label: "Quận" },
  { value: "priceMax", label: "Mức giá" },
  { value: "keyword", label: "Từ khoá" },
]

export function ProposalForm({ onSubmit }: ProposalFormProps) {
  const [kind, setKind] = useState<"include" | "exclude">("include")
  const [field, setField] = useState<RoomProposalField>("category")
  const [value, setValue] = useState("")

  function handleSubmit() {
    if (!value) return
    onSubmit({ kind, field, value })
    setValue("")
  }

  const chipGroup = (
    <ToggleGroup
      value={[value]}
      onValueChange={(next) => {
        const selected = next[0]
        if (selected) setValue(selected)
      }}
      variant="outline"
      size="sm"
      aria-label="Chọn giá trị đề xuất"
      className="flex-wrap"
    >
      {field === "category"
        ? (Object.keys(CATEGORY_META) as PlaceCategory[]).map((category) => (
            <ToggleGroupItem
              key={category}
              value={category}
              className="h-7 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            >
              {CATEGORY_META[category].label}
            </ToggleGroupItem>
          ))
        : null}
      {field === "district"
        ? DANANG_DISTRICTS.map((district) => (
            <ToggleGroupItem
              key={district}
              value={district}
              className="h-7 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            >
              {district}
            </ToggleGroupItem>
          ))
        : null}
      {field === "priceMax"
        ? ([1, 2, 3] as const).map((level) => (
            <ToggleGroupItem
              key={level}
              value={String(level)}
              className="h-7 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            >
              {priceLevelLabel(level)}
              {level < 3 ? " trở xuống" : ""}
            </ToggleGroupItem>
          ))
        : null}
    </ToggleGroup>
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel>Loại đề xuất</FieldLabel>
          <ToggleGroup
            value={[kind]}
            onValueChange={(next) => {
              const selected = next[0]
              if (selected) setKind(selected as "include" | "exclude")
            }}
            variant="outline"
            size="sm"
            aria-label="Loại đề xuất"
          >
            <ToggleGroupItem
              value="include"
              className="h-7 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            >
              ＋ Muốn có
            </ToggleGroupItem>
            <ToggleGroupItem
              value="exclude"
              className="h-7 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              disabled={field === "priceMax"}
            >
              － Không muốn
            </ToggleGroupItem>
          </ToggleGroup>
        </Field>
        <Field>
          <FieldLabel>Chiều lọc</FieldLabel>
          <ToggleGroup
            value={[field]}
            onValueChange={(next) => {
              const selected = next[0] as RoomProposalField | undefined
              if (selected) {
                setField(selected)
                setValue("")
              }
            }}
            variant="outline"
            size="sm"
            aria-label="Chiều lọc"
            className="flex-wrap"
          >
            {FIELD_TABS.map((tab) => (
              <ToggleGroupItem
                key={tab.value}
                value={tab.value}
                className="h-7 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              >
                {tab.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="proposal-value">Giá trị</FieldLabel>
        {field === "keyword" ? (
          <Input
            id="proposal-value"
            maxLength={MAX_ROOM_KEYWORD_LENGTH}
            placeholder="Ví dụ: hải sản, bánh xèo…"
            autoComplete="off"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              // Bỏ qua Enter đang xác nhận ứng viên IME (gõ tiếng Việt có dấu) —
              // nếu không, đề xuất bị gửi giữa chừng khi người dùng mới chọn dấu.
              if (event.nativeEvent.isComposing || event.keyCode === 229) return
              if (event.key === "Enter") handleSubmit()
            }}
          />
        ) : (
          chipGroup
        )}
        <Button
          type="button"
          size="sm"
          className="mt-1 self-start"
          onClick={handleSubmit}
          disabled={!value}
        >
          <PlusIcon aria-hidden="true" />
          Gửi đề xuất
        </Button>
      </Field>
    </div>
  )
}
