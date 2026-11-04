import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { api, ApiError, type Profile } from "./api/client";

/**
 * Session state.
 *
 * `useMe` intentionally resolves "not signed in" to `null` instead of an error:
 * the shell renders the same tree for guests and members, and only individual
 * actions opt into requiring a session.
 */
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await api<Profile>("auth/me/");
      } catch (error) {
        // Không đăng nhập (401) hoặc backend chưa chạy (5xx, dev mock mode):
        // coi như khách — app shell vẫn hiển thị đầy đủ cho khách.
        if (
          error instanceof ApiError &&
          (error.status === 401 || error.status >= 500)
        )
          return null;
        throw error;
      }
    },
    retry: false,
  });
}

export function useLogout() {
  const cache = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => api<void>("auth/logout/", { method: "POST" }),
    onSettled: () => {
      cache.clear();
      cache.setQueryData(["me"], null);
      navigate("/login", { replace: true });
    },
  });
}

/**
 * Only same-origin absolute paths are allowed as a post-login destination.
 * Anything that could leave the origin (protocol-relative, absolute URL,
 * backslash tricks) or bounce back into the auth screens is rejected.
 */
export function sanitizeReturnTo(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\")
  ) {
    return null;
  }
  if (trimmed.startsWith("/login") || trimmed.startsWith("/register")) {
    return null;
  }
  return trimmed;
}
