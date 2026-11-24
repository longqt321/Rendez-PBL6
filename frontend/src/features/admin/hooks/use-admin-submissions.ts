import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getAdminSubmissions, reviewAdminSubmission } from "../api/admin-api"

export function useAdminSubmissions(status?: "pending" | "reviewed" | "dismissed") {
  return useQuery({
    queryKey: ["admin", "submissions", status ?? "all"],
    queryFn: () => getAdminSubmissions(status),
  })
}

export function useReviewAdminSubmission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      status,
      reviewNote,
    }: {
      id: string
      status: "reviewed" | "dismissed"
      reviewNote?: string
    }) => reviewAdminSubmission(id, { status, reviewNote }),
    onSuccess: (updated) => {
      toast.success(
        updated.status === "reviewed"
          ? `Đã duyệt và tạo địa điểm “${updated.name}”!`
          : `Đã từ chối đề xuất “${updated.name}”.`,
      )
      void queryClient.invalidateQueries({ queryKey: ["admin", "submissions"] })
      void queryClient.invalidateQueries({ queryKey: ["admin", "places"] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Thao tác thất bại")
    },
  })
}
