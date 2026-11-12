/**
 * Gợi ý "Ý bạn là …?" khi server trả `meta.didYouMean` (tên quán gần nhất theo
 * `pg_trgm`). Client chỉ hiển thị + ghi lại từ khoá — không tự đoán/so khớp.
 */
interface DidYouMeanProps {
  /** Tên gợi ý do server trả; rỗng/null thì component tự ẩn. */
  suggestion: string | null | undefined
  /** Người dùng bấm gợi ý → ghi lại từ khoá (URL/filter). */
  onSelect: (value: string) => void
}

export function DidYouMean({ suggestion, onSelect }: DidYouMeanProps) {
  if (!suggestion) return null

  return (
    <p className="mt-2 text-sm text-muted-foreground">
      Ý bạn là{" "}
      <button
        type="button"
        onClick={() => onSelect(suggestion)}
        className="font-semibold text-foreground underline underline-offset-4 hover:text-primary"
      >
        {suggestion}
      </button>
      ?
    </p>
  )
}
