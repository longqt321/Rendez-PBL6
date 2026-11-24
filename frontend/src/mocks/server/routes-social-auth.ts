import { subDays } from "date-fns"
import type { CollectionSummary } from "@/features/collections/types/collection"
import type { Post } from "@/features/social/types/post"
import type { Page } from "@/types/api"
import { CURRENT_USER } from "../fixtures/users"
import { normalizeText } from "../text"
import { formatInitials } from "@/lib/format"
import { MAX_PROFILE_NAME_LENGTH } from "@rendez/schema"
import {
  POSTS_PAGE_SIZE,
  NOTIFICATIONS_PAGE_SIZE,
  db,
  mockPlaceMedia,
  nextUserId,
  findPlace,
  toPostDto,
  toNotificationDto,
  paginate,
  syncPlaceSuggestions,
  attachPlaceToPost,
  createPost,
  createMediaTicket,
  findComment,
  listComments,
  createComment,
  listUserCollections,
  setCommentLike,
  deleteCommentSoft,
  findUserByHandle,
  listProfilePosts,
  setFollow,
  scenario,
  created,
  notFound,
  badRequest,
  forbidden,
  conflict,
  unauthorized,
  parseBody,
  query,
  updateMe,
  type Route,
} from "./context"

export const socialAuthMockRoutes: Route[] = [
  {
    method: "get",
    pattern: /^\/posts$/,
    handler: (config) => {
      const { filter = "all", q, cursor } = query(config)
      const needle = typeof q === "string" ? normalizeText(q.trim()) : ""
      const items = db.posts.filter((post) => {
        if (filter === "unplaced" && post.placeId !== null) return false
        if (filter === "mine" && post.author.id !== CURRENT_USER.id) return false
        if (filter === "saved" && !post.savedByMe) return false
        if (filter === "following") {
          // Chưa đăng nhập hoặc chưa theo dõi ai → feed rỗng (khớp backend).
          if (!db.authenticated) return false
          const author = db.users[post.author.id]
          if (!author?.followedByMe) return false
        }
        if (needle.length > 0 && !normalizeText(post.caption).includes(needle)) return false
        return true
      })
      return paginate(items.map(toPostDto), cursor ?? null, POSTS_PAGE_SIZE)
    },
  },
  {
    method: "post",
    // Khớp backend thật: `POST /media` trả 201.
    pattern: /^\/media$/,
    status: 201,
    handler: (config) => createMediaTicket(config),
  },
  {
    method: "post",
    pattern: /^\/posts$/,
    handler: (config) => createPost(config),
  },
  {
    method: "get",
    // Chỉ khớp đúng `/posts/:id` — không nuốt `/posts/:id/comments` vì `[^/]+` loại dấu `/`.
    pattern: /^\/posts\/([^/]+)$/,
    handler: (config, [postId]) => {
      const post = db.posts.find((item) => item.id === postId)
      if (!post) notFound(config, "Không tìm thấy bài đăng")
      return toPostDto(post)
    },
  },
  {
    method: "patch",
    pattern: /^\/posts\/([^/]+)\/place$/,
    handler: (config, [postId]) => {
      const body = parseBody<{ placeId?: string }>(config)
      if (!body.placeId) notFound(config, "Thiếu placeId")
      const post = attachPlaceToPost(postId, body.placeId)
      if (!post) notFound(config, "Không tìm thấy bài đăng")
      return post
    },
  },
  {
    method: "patch",
    pattern: /^\/posts\/([^/]+)\/like$/,
    handler: (config, [postId]) => {
      const body = parseBody<{ liked?: boolean }>(config)
      const post = db.posts.find((item) => item.id === postId)
      if (!post) notFound(config, "Không tìm thấy bài đăng")
      const liked = body.liked ?? !post.likedByMe
      if (liked !== post.likedByMe) {
        post.likedByMe = liked
        post.likeCount += liked ? 1 : -1
      }
      return toPostDto(post)
    },
  },
  {
    method: "patch",
    pattern: /^\/posts\/([^/]+)\/save$/,
    handler: (config, [postId]) => {
      const body = parseBody<{ saved?: boolean }>(config)
      const post = db.posts.find((item) => item.id === postId)
      if (!post) notFound(config, "Không tìm thấy bài đăng")
      post.savedByMe = body.saved ?? !post.savedByMe
      return toPostDto(post)
    },
  },
  {
    method: "get",
    pattern: /^\/posts\/([^/]+)\/comments$/,
    handler: (config, [postId]) => {
      const { sort = "new" } = query(config)
      if (!db.posts.some((item) => item.id === postId)) notFound(config, "Không tìm thấy bài đăng")
      return listComments(postId, sort === "top" ? "top" : "new")
    },
  },
  {
    method: "post",
    pattern: /^\/posts\/([^/]+)\/comments$/,
    handler: (config, [postId]) => {
      const body = parseBody<{ body?: string; parentId?: string | null }>(config)
      try {
        return createComment(postId, body)
      } catch (error) {
        badRequest(config, error instanceof Error ? error.message : "Yêu cầu không hợp lệ")
      }
    },
  },
  {
    method: "patch",
    pattern: /^\/comments\/([^/]+)\/like$/,
    handler: (config, [commentId]) => {
      const body = parseBody<{ liked?: boolean }>(config)
      const comment = findComment(commentId)
      if (!comment || comment.deleted) notFound(config, "Không tìm thấy bình luận")
      return setCommentLike(commentId, body.liked ?? !comment.likedByMe)
    },
  },
  {
    method: "delete",
    pattern: /^\/comments\/([^/]+)$/,
    handler: (config, [commentId]) => {
      const comment = findComment(commentId)
      if (!comment || comment.deleted) notFound(config, "Không tìm thấy bình luận")
      // Chỉ tác giả mới xoá được — trước đây thiếu kiểm tra này nên ai cũng xoá được.
      if (comment.author.id !== CURRENT_USER.id) {
        forbidden(config, "Không phải bình luận của bạn")
      }
      deleteCommentSoft(commentId)
      return { deleted: true }
    },
  },
  {
    method: "get",
    pattern: /^\/places\/([^/]+)\/posts$/,
    handler: (config, [placeId]) => {
      const place = findPlace(placeId)
      if (!place || place.publishedAt === null) notFound(config, "Không tìm thấy địa điểm")
      const items = db.posts.filter((post) => post.placeId === placeId).map(toPostDto)
      return { items, next: null } satisfies Page<Post>
    },
  },
  {
    method: "get",
    pattern: /^\/me$/,
    handler: (config) => {
      // Dev có thể tắt bypass auth (`VITE_DEV_BYPASS_AUTH=false`) hoặc đăng xuất
      // (`DELETE /session`) để thấy đúng trạng thái chưa đăng nhập; prod không
      // nạp file này nên luôn đi backend.
      if (!db.authenticated) unauthorized(config, "Chưa đăng nhập")
      return { ...db.me }
    },
  },
  {
    method: "patch",
    pattern: /^\/me$/,
    handler: (config) => {
      if (!db.authenticated) unauthorized(config, "Chưa đăng nhập")
      return updateMe(config)
    },
  },
  {
    /** Đăng xuất: tắt phiên mock. Client xoá cache và quay về trạng thái chưa đăng nhập. */
    method: "delete",
    pattern: /^\/session$/,
    handler: (config) => {
      if (!db.authenticated) unauthorized(config, "Chưa đăng nhập")
      db.authenticated = false
      return { loggedOut: true }
    },
  },
  {
    /** Đăng nhập email + password — so khớp tài khoản mock (xem `MOCK_EMAIL`). */
    method: "post",
    pattern: /^\/session$/,
    handler: (config) => {
      if (scenario.unauthorized) unauthorized(config, "Chưa đăng nhập")
      const body = parseBody<{ email?: unknown; password?: unknown }>(config)
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
      const password = typeof body.password === "string" ? body.password : ""
      const account = db.accounts.find((item) => item.email === email && item.password === password)
      if (!account || db.deletedUserIds.has(account.userId)) {
        unauthorized(config, "Email hoặc mật khẩu không đúng")
      }
      // Bắt buộc xác thực email (khớp backend thật): chưa verified → 403 riêng,
      // không lẫn vào "Email hoặc mật khẩu không đúng".
      if (!account.verified) {
        forbidden(
          config,
          "Email chưa được xác thực. Hãy mở link trong email xác thực (kiểm tra cả mục spam) rồi đăng nhập lại.",
        )
      }
      const user = db.users[account.userId]
      if (!user) unauthorized(config, "Email hoặc mật khẩu không đúng")
      db.me = { ...user }
      db.authenticated = true
      return { ...db.me }
    },
  },
  {
    /**
     * Đăng ký — tạo tài khoản CHƯA xác thực email (khớp backend thật từ
     * 2026-11-12): không mở phiên, trả `{requiresVerification:true}` (201).
     */
    method: "post",
    pattern: /^\/register$/,
    handler: (config) => {
      const body = parseBody<Record<string, unknown>>(config)
      const name = typeof body.name === "string" ? body.name.trim() : ""
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
      const password = typeof body.password === "string" ? body.password : ""
      const handle = typeof body.handle === "string" ? body.handle.trim().toLowerCase() : ""

      if (name.length < 2 || name.length > MAX_PROFILE_NAME_LENGTH) {
        badRequest(config, "Tên cần từ 2 đến 40 ký tự")
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) badRequest(config, "Email không hợp lệ")
      if (password.length < 8) badRequest(config, "Mật khẩu cần ít nhất 8 ký tự")
      if (!/^[a-z0-9_]{3,30}$/u.test(handle)) {
        badRequest(config, "Handle chỉ gồm chữ thường, số và gạch dưới (3–30 ký tự)")
      }
      if (body.acceptTerms !== true) {
        badRequest(config, "Bạn cần đồng ý với Điều khoản sử dụng để đăng ký tài khoản")
      }
      // Trùng email: backend thật trả "generic" 201 như đăng ký mới (không lộ
      // email tồn tại) — mock giữ đúng hợp đồng đó.
      if (db.accounts.some((account) => account.email === email)) {
        return created(config, { requiresVerification: true })
      }
      if (Object.values(db.users).some((user) => user.handle === handle)) {
        conflict(config, "Handle đã được sử dụng")
      }

      const id = nextUserId()
      const user: (typeof db.users)[string] = {
        id,
        name,
        handle,
        initials: formatInitials(name),
        bio: "",
        location: "",
        avatarUrl: null,
        coverUrl: null,
        joinedAt: new Date().toISOString(),
        postCount: 0,
        followerCount: 0,
        followingCount: 0,
        followedByMe: false,
        isMe: true,
        privateProfile: false,
      }
      db.users[id] = user
      db.accounts.push({ userId: id, email, password, verified: false })
      return created(config, { requiresVerification: true })
    },
  },
  {
    /**
     * Gửi lại mail xác thực.
     *
     * Mock không có hộp thư thật: coi thao tác này là "người dùng đã mở link
     * xác thực" và đánh dấu tài khoản đã xác thực — nhờ vậy e2e mock đi được
     * trọn luồng đăng ký → chưa xác thực bị chặn → xác thực → đăng nhập được.
     * Luôn trả `{status:true}` như backend (không lộ email tồn tại).
     */
    method: "post",
    pattern: /^\/auth\/send-verification-email$/,
    handler: (config) => {
      const body = parseBody<{ email?: unknown }>(config)
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
      const account = db.accounts.find((item) => item.email === email)
      if (account) account.verified = true
      return { status: true }
    },
  },
  {
    /** Quên mật khẩu — luôn thành công để không lộ email có tồn tại. */
    method: "post",
    pattern: /^\/auth\/request-password-reset$/,
    handler: () => ({
      status: true,
      message: "If this email exists in our system, check your email for the reset link",
    }),
  },
  {
    /** Đặt lại mật khẩu — mock không có token thật, chỉ kiểm đầu vào tối thiểu. */
    method: "post",
    pattern: /^\/auth\/reset-password$/,
    handler: (config) => {
      const body = parseBody<{ token?: unknown; newPassword?: unknown }>(config)
      const token = typeof body.token === "string" ? body.token : ""
      const newPassword = typeof body.newPassword === "string" ? body.newPassword : ""
      if (token.length === 0) badRequest(config, "Token không hợp lệ")
      if (newPassword.length < 8) badRequest(config, "Mật khẩu cần ít nhất 8 ký tự")
      return { status: true }
    },
  },
  {
    /** Xoá tài khoản — đánh dấu đã xoá, tắt phiên (khớp xoá mềm của backend). */
    method: "delete",
    pattern: /^\/me$/,
    handler: (config) => {
      if (!db.authenticated) unauthorized(config, "Chưa đăng nhập")
      db.deletedUserIds.add(db.me.id)
      db.authenticated = false
      return { deleted: true }
    },
  },
  {
    method: "get",
    pattern: /^\/users$/,
    handler: (config) => {
      const { q } = query(config)
      const needle = typeof q === "string" ? normalizeText(q.trim()) : ""
      const items = Object.values(db.users).filter((user) => {
        if (needle.length === 0) return true
        return (
          normalizeText(user.name).includes(needle) || normalizeText(user.handle).includes(needle)
        )
      })
      return { items, next: null } satisfies Page<(typeof db.users)[string]>
    },
  },
  {
    method: "get",
    pattern: /^\/users\/([^/]+)$/,
    handler: (config, [handle]) => {
      const user = findUserByHandle(handle)
      if (!user) notFound(config, "Không tìm thấy người dùng")
      return { ...user }
    },
  },
  {
    method: "get",
    pattern: /^\/users\/([^/]+)\/posts$/,
    handler: (config, [handle]) => {
      const { tab = "posts" } = query(config)
      try {
        const items = listProfilePosts(handle, tab)
        return { items, next: null } satisfies Page<Post>
      } catch {
        notFound(config, "Không tìm thấy người dùng")
      }
    },
  },
  {
    method: "get",
    pattern: /^\/users\/([^/]+)\/collections$/,
    handler: (config, [handle]) => {
      try {
        const items = listUserCollections(handle)
        return { items, next: null } satisfies Page<CollectionSummary>
      } catch {
        notFound(config, "Không tìm thấy người dùng")
      }
    },
  },
  {
    method: "post",
    pattern: /^\/users\/([^/]+)\/follow$/,
    handler: (config, [handle]) => {
      try {
        return setFollow(handle, true)
      } catch (error) {
        badRequest(config, error instanceof Error ? error.message : "Yêu cầu không hợp lệ")
      }
    },
  },
  {
    method: "delete",
    pattern: /^\/users\/([^/]+)\/follow$/,
    handler: (config, [handle]) => {
      try {
        return setFollow(handle, false)
      } catch (error) {
        badRequest(config, error instanceof Error ? error.message : "Yêu cầu không hợp lệ")
      }
    },
  },
  {
    method: "get",
    pattern: /^\/notifications$/,
    handler: (config) => {
      syncPlaceSuggestions()
      const { cursor } = query(config)
      const items = db.notifications.map(toNotificationDto)
      return paginate(items, cursor ?? null, NOTIFICATIONS_PAGE_SIZE)
    },
  },
  {
    method: "patch",
    pattern: /^\/notifications$/,
    handler: () => {
      for (const notification of db.notifications) notification.read = true
      return db.notifications.map(toNotificationDto)
    },
  },
  {
    method: "patch",
    pattern: /^\/notifications\/([^/]+)$/,
    handler: (config, [notificationId]) => {
      const notification = db.notifications.find((item) => item.id === notificationId)
      if (!notification) notFound(config, "Không tìm thấy thông báo")
      notification.read = true
      return toNotificationDto(notification)
    },
  },

  {
    method: "get",
    pattern: /^\/places\/([^/]+)\/media$/,
    handler: (config, match) => {
      const placeId = match[0]
      const place = findPlace(placeId)
      if (!place) notFound(config, "Không tìm thấy địa điểm")
      const custom = mockPlaceMedia.get(placeId) ?? []
      const seeded = place.imageUrl
        ? [
            {
              id: `pm-${placeId}-1`,
              url: place.imageUrl,
              kind: "dish_real" as const,
              capturedAt: subDays(new Date(), 3).toISOString(),
              sourceType: "post" as const,
              authorName: "Lan Anh",
            },
            {
              id: `pm-${placeId}-2`,
              url: place.imageUrl,
              kind: "venue" as const,
              capturedAt: subDays(new Date(), 10).toISOString(),
              sourceType: "place" as const,
              authorName: "Rendez",
            },
          ]
        : []
      return { items: [...custom, ...seeded], next: null }
    },
  },
  {
    method: "post",
    pattern: /^\/places\/([^/]+)\/images$/,
    handler: (config, match) => {
      const placeId = match[0]
      const body = parseBody<{
        images: Array<{ url: string; kind: "venue" | "dish_real" | "menu_price" }>
      }>(config)
      const list = mockPlaceMedia.get(placeId) ?? []
      const created = (body.images ?? []).map((img, i) => ({
        id: `pm-up-${Date.now()}-${i}`,
        url: img.url,
        kind: img.kind,
        capturedAt: new Date().toISOString(),
        sourceType: "place" as const,
        authorName: db.me.name,
      }))
      mockPlaceMedia.set(placeId, [...created, ...list])
      return { items: created }
    },
  },
]
