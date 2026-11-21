import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type {
  UpdateAdminPlaceInput,
  UpdateAdminReportInput,
  UpdateAdminUserInput,
} from "@rendez/schema"
import { toast } from "sonner"
import {
  getAdminObservability,
  getAdminOverview,
  getAdminPlaces,
  getAdminReports,
  getAdminUsers,
  getAuditLogs,
  updateAdminPlace,
  updateAdminReport,
  updateAdminUser,
  type AdminPlacesQuery,
  type AdminReportsQuery,
  type AdminUsersQuery,
  type AuditLogsQuery,
  type ObservabilityEventKind,
} from "../api/admin-api"

export const ADMIN_KEYS = {
  all: ["admin"] as const,
  overview: () => ["admin", "overview"] as const,
  observability: (query: { kind?: ObservabilityEventKind; q?: string }) =>
    ["admin", "observability", query] as const,
  reports: (query: Omit<AdminReportsQuery, "cursor">) => ["admin", "reports", query] as const,
  places: (query: Omit<AdminPlacesQuery, "cursor">) => ["admin", "places", query] as const,
  users: (query: Omit<AdminUsersQuery, "cursor">) => ["admin", "users", query] as const,
  logs: (query: Omit<AuditLogsQuery, "cursor">) => ["admin", "logs", query] as const,
}

export function useAdminOverview() {
  return useQuery({
    queryKey: ADMIN_KEYS.overview(),
    queryFn: getAdminOverview,
  })
}

export function useAdminObservability(
  query: { kind?: ObservabilityEventKind; q?: string } = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ADMIN_KEYS.observability(query),
    queryFn: () => getAdminObservability(query),
    enabled: options?.enabled ?? true,
  })
}

export function useAdminReports(
  query: Omit<AdminReportsQuery, "cursor"> = {},
  options?: { enabled?: boolean },
) {
  return useInfiniteQuery({
    queryKey: ADMIN_KEYS.reports(query),
    queryFn: ({ pageParam }) => getAdminReports({ ...query, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next,
    enabled: options?.enabled ?? true,
  })
}

export function useUpdateAdminReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ reportId, input }: { reportId: string; input: UpdateAdminReportInput }) =>
      updateAdminReport(reportId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "reports"] })
      void queryClient.invalidateQueries({ queryKey: ["admin", "places"] })
      void queryClient.invalidateQueries({ queryKey: ["admin", "logs"] })
      void queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.overview() })
      void queryClient.invalidateQueries({ queryKey: ["places"] })
      toast.success("Đã cập nhật báo cáo")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useAdminPlaces(
  query: Omit<AdminPlacesQuery, "cursor"> = {},
  options?: { enabled?: boolean },
) {
  return useInfiniteQuery({
    queryKey: ADMIN_KEYS.places(query),
    queryFn: ({ pageParam }) => getAdminPlaces({ ...query, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next,
    enabled: options?.enabled ?? true,
  })
}

export function useUpdateAdminPlace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ placeId, input }: { placeId: string; input: UpdateAdminPlaceInput }) =>
      updateAdminPlace(placeId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "places"] })
      void queryClient.invalidateQueries({ queryKey: ["admin", "logs"] })
      void queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.overview() })
      void queryClient.invalidateQueries({ queryKey: ["places"] })
      toast.success("Đã lưu thay đổi địa điểm")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useAdminUsers(
  query: Omit<AdminUsersQuery, "cursor"> = {},
  options?: { enabled?: boolean },
) {
  return useInfiniteQuery({
    queryKey: ADMIN_KEYS.users(query),
    queryFn: ({ pageParam }) => getAdminUsers({ ...query, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next,
    enabled: options?.enabled ?? true,
  })
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: UpdateAdminUserInput }) =>
      updateAdminUser(userId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
      void queryClient.invalidateQueries({ queryKey: ["admin", "logs"] })
      void queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.overview() })
      toast.success("Đã cập nhật tài khoản")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useAuditLogs(
  query: Omit<AuditLogsQuery, "cursor"> = {},
  options?: { enabled?: boolean },
) {
  return useInfiniteQuery({
    queryKey: ADMIN_KEYS.logs(query),
    queryFn: ({ pageParam }) => getAuditLogs({ ...query, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next,
    enabled: options?.enabled ?? true,
  })
}
