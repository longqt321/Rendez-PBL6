interface DidYouMeanProps {
  suggestion: string | null | undefined

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
