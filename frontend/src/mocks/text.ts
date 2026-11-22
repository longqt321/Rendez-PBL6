import { normalizeQueryText } from "@rendez/schema"

export function normalizeText(text: string): string {
  return normalizeQueryText(text)
}
