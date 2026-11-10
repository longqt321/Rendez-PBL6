import { PLACE_REPORT_REASONS } from "./types/place-report"
import { z } from "zod"
import type { PlaceReport } from "./types/place-report"

/** Báo cáo địa điểm — khớp `PlaceReport`. */
export const placeReportSchema = z.object({
  id: z.string(),
  placeId: z.string(),
  reason: z.enum(PLACE_REPORT_REASONS),
  detail: z.string().nullable(),
  createdAt: z.string(),
}) satisfies z.ZodType<PlaceReport>
