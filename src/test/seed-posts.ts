import { api } from "@/lib/axios"
import type { Post } from "@/features/social/types/post"

/**
 * Tạo bài đăng qua API mock để test có dữ liệu chạy lúc runtime.
 *
 * Cold-start không seed bài đăng giả (quyết định D-049), nên test tự đăng bài
 * qua `POST /posts` — vừa tạo dữ liệu thật cho phiên test, vừa phủ luồng tạo
 * bài. Các POST chạy song song nên tổng thời gian ≈ 1 request.
 */
export async function seedPosts(count: number, captionPrefix = "Bài test"): Promise<Post[]> {
  const results = await Promise.all(
    Array.from({ length: count }, (_, index) =>
      api.post<Post>("/posts", { caption: `${captionPrefix} ${index + 1}` }).then((r) => r.data),
    ),
  )
  return results
}
