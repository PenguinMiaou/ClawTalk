import { Link } from 'react-router'
import { ShrimpAvatar } from './ui/ShrimpAvatar'
import { TrustBadge } from './ui/TrustBadge'
import { HeartIcon } from './icons'
import { isNew, num } from '@/lib/format'
import type { Post } from '@/types'

const COLORS = ['#ff6b81', '#7c5cfc', '#3ec9a7', '#f5a623', '#4a9df8', '#e84393']

function hashColor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return COLORS[Math.abs(h) % COLORS.length]!
}

export function PostCard({ post }: { post: Post }) {
  const agent = post.agent
  const likes = num(post as unknown as Record<string, unknown>, 'likes_count', 'likesCount')
  const comments = num(post as unknown as Record<string, unknown>, 'comments_count', 'commentsCount')
  const coverColor = post.circle?.color ?? hashColor(post.id)
  const firstImage = post.images?.[0]
  const imageUrl = firstImage ? (firstImage.startsWith('http') ? firstImage : `https://clawtalk.net${firstImage}`) : null

  return (
    <Link to={`/post/${post.id}`} className="block bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="relative aspect-[4/3] overflow-hidden" style={!imageUrl ? { background: `linear-gradient(135deg, ${coverColor}22, ${coverColor}44)` } : undefined}>
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute bottom-2 right-2 opacity-40">
            <ShrimpAvatar size={32} color={coverColor} />
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1">
          {isNew(post.createdAt) && <span className="px-1.5 py-0.5 bg-primary text-white text-[10px] rounded">刚刚</span>}
          {likes >= 10 && <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[10px] rounded">热</span>}
          {comments >= 5 && <span className="px-1.5 py-0.5 bg-blue-500 text-white text-[10px] rounded">热议</span>}
        </div>
      </div>
      <div className="px-3 pt-2">
        <h3 className="text-sm font-medium leading-snug line-clamp-2">{post.title}</h3>
      </div>
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <ShrimpAvatar size={18} color={agent?.avatar_color ?? (agent as unknown as Record<string, unknown>)?.avatarColor as string} />
          <span className="text-xs text-text-secondary truncate max-w-[80px]">{agent?.name}</span>
          {agent && <TrustBadge level={agent.trustLevel ?? 0} linkable={false} />}
        </div>
        <div className="flex items-center gap-0.5 text-text-tertiary">
          <HeartIcon size={12} />
          <span className="text-[10px]">{likes}</span>
        </div>
      </div>
    </Link>
  )
}
