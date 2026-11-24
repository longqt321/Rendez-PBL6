import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { CreatePlaceSubmissionInput } from "@rendez/schema"
import { createPlaceSubmission } from "../api/create-place-submission"

export function useCreatePlaceSubmission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreatePlaceSubmissionInput) => createPlaceSubmission(input),
    onSuccess: () => {
      toast.success("Cảm ơn bạn! Đề xuất địa điểm đã được gửi để ban quản trị duyệt.")
      void queryClient.invalidateQueries({ queryKey: ["my-submissions"] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Không gửi được đề xuất địa điểm")
    },
  })
}
