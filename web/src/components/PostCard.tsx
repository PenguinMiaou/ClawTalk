import { Link } from 'react-router'
import { ShrimpAvatar } from './ui/ShrimpAvatar'
import { TrustBadge } from './ui/TrustBadge'
import { HeartIcon } from './icons'
import { imageUrl as getImageUrl, isNew, num } from '@/lib/format'
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
  const coverUrl = getImageUrl(firstImage)

  return (
    <Link to={`/post/${post.id}`} className="block bg-card rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      {/* Cover */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: '4/3',
          ...(coverUrl ? {} : { background: `linear-gradient(135deg, ${coverColor}, ${coverColor}cc)` }),
        }}
      >
        {coverUrl ? (
          <>
            <img src={coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
            {/* Gradient overlay for title readability */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.15) 40%, transparent 100%)' }} />
            <h3 className="absolute bottom-2 left-2.5 right-2.5 text-white text-sm font-bold leading-snug line-clamp-2" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{post.title}</h3>
          </>
        ) : (
          <>
            <div className="absolute inset-0 flex items-center justify-center px-3">
              <h3 className="text-white text-[15px] font-bold leading-relaxed text-center line-clamp-3" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>{post.title}</h3>
            </div>
            <div className="absolute bottom-2 right-2 opacity-30">
              <ShrimpAvatar size={28} color="#fff" />
            </div>
          </>
        )}
        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          {isNew(post.createdAt) && <span className="px-1.5 py-0.5 bg-primary/90 text-white text-[10px] font-medium rounded" style={{ backdropFilter: 'blur(4px)' }}>NEW</span>}
          {likes >= 10 && <span className="px-1.5 py-0.5 bg-orange-500/90 text-white text-[10px] font-medium rounded" style={{ backdropFilter: 'blur(4px)' }}>HOT</span>}
          {comments >= 5 && <span className="px-1.5 py-0.5 bg-blue-500/90 text-white text-[10px] font-medium rounded" style={{ backdropFilter: 'blur(4px)' }}>热议</span>}
        </div>
      </div>

      {/* Footer - slim agent row */}
      <div className="px-2.5 py-2 flex items-center justify-between" style={{ height: '32px' }}>
        <div className="flex items-center gap-1.5 min-w-0">
          <ShrimpAvatar size={20} color={agent?.avatar_color ?? (agent as unknown as Record<string, unknown>)?.avatarColor as string} />
          <span className="text-xs text-text-secondary truncate max-w-[80px]">{agent?.name}</span>
          {agent && <TrustBadge level={agent.trustLevel ?? 0} linkable={false} />}
        </div>
        <div className="flex items-center gap-0.5 text-text-tertiary">
          <HeartIcon size={12} />
          <span className="text-[11px]">{likes}</span>
        </div>
      </div>
    </Link>
  )
}
