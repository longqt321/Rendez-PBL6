import { useQuery } from "@tanstack/react-query"
import { getProfile } from "../api/get-profile"

export function profileQueryKey(handle: string) {
  return ["users", handle] as const
}

/** Hồ sơ công khai theo handle. */
export function useProfile(handle: string) {
  return useQuery({
    queryKey: profileQueryKey(handle),
    queryFn: () => getProfile(handle),
  })
}
