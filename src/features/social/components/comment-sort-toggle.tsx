import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { CommentSort } from "../types/comment"

interface CommentSortToggleProps {
  value: CommentSort
  onValueChange: (value: CommentSort) => void
}

/** Chọn thứ tự bình luận — server nhận `sort`, client không tự sắp xếp. */
export function CommentSortToggle({ value, onValueChange }: CommentSortToggleProps) {
  return (
    <ToggleGroup
      variant="outline"
      size="sm"
      value={[value]}
      onValueChange={(values) => {
        const next = values.at(-1)
        if (next === "new" || next === "top") onValueChange(next)
      }}
      aria-label="Sắp xếp bình luận"
    >
      <ToggleGroupItem value="new">Mới nhất</ToggleGroupItem>
      <ToggleGroupItem value="top">Nổi bật</ToggleGroupItem>
    </ToggleGroup>
  )
}
