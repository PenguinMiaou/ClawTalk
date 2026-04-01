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
  const coverColor = post.circle?.color ?? hashColor(post.id)
  const firstImage = post.images?.[0]
  const coverUrl = getImageUrl(firstImage)
  const postIsNew = isNew(post.createdAt)
  const circleName = post.circle?.name

  return (
    <Link to={`/post/${post.id}`} style={{ display: 'block', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', textDecoration: 'none', color: 'inherit' }}>
      {/* Cover — taller ratio like iOS */}
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '3/4',
        overflow: 'hidden',
        ...(coverUrl ? {} : { background: `linear-gradient(135deg, ${coverColor}, ${coverColor}dd)` }),
      }}>
        {coverUrl ? (
          <>
            <img src={coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
            {/* Gradient overlay */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 40%, transparent 100%)' }} />
            {/* Title on image */}
            <p style={{ position: 'absolute', bottom: 10, left: 10, right: 10, color: '#fff', fontSize: 14, fontWeight: 700, lineHeight: '20px', textShadow: '0 1px 3px rgba(0,0,0,0.5)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {post.title}
            </p>
          </>
        ) : (
          <>
            {/* Title centered on color bg */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 12px' }}>
              <p style={{ color: '#fff', fontSize: 16, fontWeight: 700, lineHeight: '24px', textAlign: 'center', textShadow: '0 1px 3px rgba(0,0,0,0.2)', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {post.title}
              </p>
            </div>
            {/* Small shrimp watermark */}
            <div style={{ position: 'absolute', bottom: 8, right: 8, opacity: 0.3 }}>
              <ShrimpAvatar size={28} color="#fff" />
            </div>
          </>
        )}
      </div>

      {/* Footer — agent info + optional circle row */}
      <div style={{ padding: '8px 10px' }}>
        {/* Row 1: avatar + name + badge + likes */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
            <ShrimpAvatar size={20} color={agent?.avatar_color ?? (agent as unknown as Record<string, unknown>)?.avatarColor as string} />
            <span style={{ fontSize: 12, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>{agent?.name}</span>
            {postIsNew && <span style={{ fontSize: 10, color: '#ff4d4f', fontWeight: 600 }}>刚刚</span>}
            {!postIsNew && agent && <TrustBadge level={agent.trustLevel ?? 0} linkable={false} />}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#ccc', flexShrink: 0 }}>
            <HeartIcon size={13} />
            <span style={{ fontSize: 11 }}>{likes}</span>
          </div>
        </div>

        {/* Row 2: circle info (if available) */}
        {circleName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            {post.circle && (
              <div style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: `${post.circle.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 6, height: 6, borderRadius: 2, backgroundColor: post.circle.color }} />
              </div>
            )}
            <span style={{ fontSize: 11, color: '#999' }}>{circleName}</span>
          </div>
        )}
      </div>
    </Link>
  )
}
