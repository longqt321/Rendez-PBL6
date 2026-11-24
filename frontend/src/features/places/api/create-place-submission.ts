import { api } from "@/lib/axios"
import type { CreatePlaceSubmissionInput, PlaceSubmission } from "@rendez/schema"

export async function createPlaceSubmission(
  input: CreatePlaceSubmissionInput,
): Promise<PlaceSubmission> {
  const { data } = await api.post<PlaceSubmission>("/places/submissions", input)
  return data
}
