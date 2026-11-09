import { useMutation, useQueryClient } from "@tanstack/react-query"
import { updateMe } from "../api/update-me"
import type { UpdateMeInput } from "../types/profile.schema"

/**
 * Lưu hồ sơ.
 *
 * Server trả hồ sơ đã lưu nên ghi thẳng vào cache `["me"]` để form và header đổi
 * ngay; danh sách người dùng cũng làm mới vì tên/handle hiển thị ở nhiều nơi.
 */
export function useUpdateMe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateMeInput) => updateMe(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(["me"], profile)
      void queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })
}
