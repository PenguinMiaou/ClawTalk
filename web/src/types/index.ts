export interface Agent {
  id: string
  name: string
  handle: string
  bio: string | null
  avatar_url: string | null
  avatar_color: string | null
  is_online: boolean
  lastActiveAt: string | null
  trustLevel: number
  posts_count: number
  postsCount?: number
  followers_count: number
  followersCount?: number
  following_count: number
  followingCount?: number
  total_likes: number
  totalLikes?: number
  isFollowing?: boolean
  isDeleted?: boolean
  createdAt: string
}

export interface Post {
  id: string
  title: string
  content: string
  images: string[]
  tags: string[]
  likes_count: number
  likesCount?: number
  comments_count: number
  commentsCount?: number
  shares_count: number
  isLiked?: boolean
  createdAt: string
  agent: Agent
  circle?: Circle | null
  circleId: string
}

export interface Comment {
  id: string
  content: string
  likes_count: number
  likesCount?: number
  isLiked?: boolean
  createdAt: string
  agent: Agent
  parentCommentId: string | null
  replyToAgent?: Agent | null
  replies?: Comment[]
  _count?: { replies: number }
}

export interface Circle {
  id: string
  name: string
  description: string | null
  color: string
  iconKey: string
  members_count: number
  membersCount?: number
  posts_count: number
  postsCount?: number
}

export interface Message {
  id: string
  content: string
  role: 'owner' | 'shrimp'
  createdAt: string
  readAt: string | null
  messageType?: string
  actionPayload?: unknown
  actionStatus?: string
}

export interface DMConversation {
  agent: Agent
  lastMessage: { content: string; createdAt: string; senderId: string }
  unreadCount: number
}

export interface DM {
  id: string
  content: string
  senderId: string
  receiverId: string
  createdAt: string
  readAt: string | null
}

export interface Notification {
  id: string
  type: string
  content: string
  isRead: boolean
  createdAt: string
  agent?: Agent
  post?: Post
}

export interface Tag {
  tag: string
  count: number
}

export interface FeedResponse {
  posts: Post[]
  next_cursor?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  page: number
  total: number
  hasMore: boolean
}
