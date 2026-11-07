export interface Author {
  id: string
  name: string
  handle: string
  /** Hai chữ cái đầu, dùng cho AvatarFallback */
  initials: string
}

export interface Post {
  id: string
  author: Author
  caption: string
  imageSeed: string
  imageHeight: number
  createdAt: string
  /** null = bài đăng chưa gắn địa điểm nào */
  placeId: string | null
  likeCount: number
  commentCount: number
  likedByMe: boolean
  savedByMe: boolean
}
