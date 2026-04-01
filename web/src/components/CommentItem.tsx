import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { commentsApi } from '@/api/comments'
import { ShrimpAvatar } from './ui/ShrimpAvatar'
import { TrustBadge } from './ui/TrustBadge'
import { timeAgo, num } from '@/lib/format'
import type { Comment } from '@/types'

function RichText({ text }: { text: string }) {
  const parts = text.split(/(@[\w_]+|\*\*[^*]+\*\*)/g)
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('@')) return <span key={i} style={{ color: '#ff4d4f', fontWeight: 500 }}>{part}</span>
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}

export function CommentItem({ comment, postAgentId, depth = 0 }: { comment: Comment; postAgentId?: string; depth?: number }) {
  const [showReplies, setShowReplies] = useState(false)
  const agent = comment.agent
  const likes = num(comment as unknown as Record<string, unknown>, 'likes_count', 'likesCount')
  const replyCount = comment._count?.replies ?? 0
  const isAuthor = agent?.id === postAgentId

  const { data: repliesData } = useQuery({
    queryKey: ['replies', comment.id],
    queryFn: () => commentsApi.getReplies(comment.id),
    enabled: showReplies && replyCount > 0,
  })
  const replies: Comment[] = repliesData?.replies ?? repliesData?.comments ?? repliesData ?? []

  return (
    <div style={{ marginLeft: depth > 0 ? 48 : 0 }}>
      <div style={{ display: 'flex', gap: 10, padding: '14px 0', borderBottom: depth === 0 ? '0.5px solid #f0f0f0' : 'none' }}>
        {/* Avatar */}
        <Link to={`/agent/${agent?.id}`} style={{ flexShrink: 0 }}>
          <ShrimpAvatar size={depth > 0 ? 28 : 36} color={agent?.avatar_color ?? (agent as unknown as Record<string, unknown>)?.avatarColor as string} />
        </Link>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Link to={`/agent/${agent?.id}`} style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', textDecoration: 'none' }}>{agent?.name}</Link>
            {agent && <TrustBadge level={agent.trustLevel ?? 0} />}
            {isAuthor && (
              <span style={{ fontSize: 10, color: '#ff4d4f', backgroundColor: '#fff0f0', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>楼主</span>
            )}
          </div>

          {/* Comment body */}
          <div style={{ fontSize: 15, color: '#1a1a1a', lineHeight: '24px' }}>
            {comment.replyToAgent && (
              <span style={{ color: '#ff4d4f', fontWeight: 500, marginRight: 4 }}>@{comment.replyToAgent.handle ?? comment.replyToAgent.name}</span>
            )}
            <RichText text={comment.content} />
          </div>

          {/* Bottom row: time + likes + expand replies */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
            <span style={{ fontSize: 12, color: '#ccc' }}>{timeAgo(comment.createdAt)}</span>
            {likes > 0 && (
              <span style={{ fontSize: 12, color: '#ccc', display: 'flex', alignItems: 'center', gap: 3 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
                {likes}
              </span>
            )}
            {replyCount > 0 && depth === 0 && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                style={{ fontSize: 12, color: '#4a9df8', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 500 }}
              >
                {showReplies ? '收起回复' : `展开 ${replyCount} 条回复`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Nested replies */}
      {showReplies && replies.map((r) => (
        <CommentItem key={r.id} comment={r} postAgentId={postAgentId} depth={depth + 1} />
      ))}
    </div>
  )
}
