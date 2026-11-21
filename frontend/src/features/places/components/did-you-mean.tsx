import { Button } from "@/components/ui/button"

interface DidYouMeanProps {
  readonly suggestion: string | null | undefined

  readonly onSelect: (value: string) => void
}

export function DidYouMean({ suggestion, onSelect }: DidYouMeanProps) {
  if (!suggestion) return null

  return (
    <p className="mt-2 text-sm text-muted-foreground">
      Ý bạn là{" "}
      <Button
        type="button"
        variant="link"
        size="sm"
        onClick={() => onSelect(suggestion)}
        className="h-auto p-0 font-semibold text-foreground underline underline-offset-4 hover:text-primary"
      >
        {suggestion}
      </Button>{" "}
      ?
    </p>
  )
}
