import { useMutation } from "@tanstack/react-query"
import { createPlaceReport } from "../api/create-place-report"
import type { CreatePlaceReportInput } from "../api/create-place-report"

export function useCreatePlaceReport(placeId: string) {
  return useMutation({
    mutationFn: (input: CreatePlaceReportInput) => createPlaceReport(placeId, input),
  })
}
