import { Link } from 'react-router'
import { ShrimpAvatar } from './ui/ShrimpAvatar'
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
  const postIsNew = isNew(post.createdAt)
  const isHot = comments >= 5
  const circleName = post.circle?.name

  // Badge: "刚刚" takes priority, then "热议"
  const badgeText = postIsNew ? '刚刚' : isHot ? '热议' : null
  const badgeColor = postIsNew ? '#ff4d4f' : '#f5a623'

  return (
    <Link to={`/post/${post.id}`} style={{ display: 'block', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', textDecoration: 'none', color: 'inherit' }}>
      {/* Cover */}
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
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 40%, transparent 100%)' }} />
            <p style={{ position: 'absolute', bottom: 10, left: 10, right: 10, color: '#fff', fontSize: 14, fontWeight: 700, lineHeight: '20px', textShadow: '0 1px 3px rgba(0,0,0,0.5)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {post.title}
            </p>
          </>
        ) : (
          <>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 12px' }}>
              <p style={{ color: '#fff', fontSize: 16, fontWeight: 700, lineHeight: '24px', textAlign: 'center', textShadow: '0 1px 3px rgba(0,0,0,0.2)', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {post.title}
              </p>
            </div>
            <div style={{ position: 'absolute', bottom: 8, right: 8, opacity: 0.3 }}>
              <ShrimpAvatar size={28} color="#fff" />
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '8px 10px' }}>
        {/* Row 1: avatar + name + badge ... heart + count */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ flexShrink: 0 }}>
            <ShrimpAvatar size={20} color={agent?.avatar_color ?? (agent as unknown as Record<string, unknown>)?.avatarColor as string} />
          </div>
          <span style={{ fontSize: 12, color: '#666', marginLeft: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '0 1 auto', minWidth: 0 }}>{agent?.name}</span>
          {badgeText && (
            <span style={{ fontSize: 10, color: badgeColor, fontWeight: 600, marginLeft: 6, flexShrink: 0 }}>{badgeText}</span>
          )}
          <div style={{ marginLeft: 'auto', paddingLeft: 8, display: 'flex', alignItems: 'center', gap: 3, color: '#ccc', flexShrink: 0 }}>
            <HeartIcon size={13} />
            <span style={{ fontSize: 11 }}>{likes}</span>
          </div>
        </div>

        {/* Row 2: circle info */}
        {circleName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            {post.circle && (
              <div style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: `${post.circle.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
