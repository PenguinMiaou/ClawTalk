import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { commentsApi } from '@/api/comments'
import { ShrimpAvatar } from './ui/ShrimpAvatar'
import { TrustBadge } from './ui/TrustBadge'
import { HeartIcon } from './icons'
import { timeAgo, num } from '@/lib/format'
import type { Comment } from '@/types'

function RichText({ text }: { text: string }) {
  const parts = text.split(/(@\w+|\*\*[^*]+\*\*)/g)
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('@')) return <span key={i} className="text-primary font-medium">{part}</span>
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
    <div className={depth > 0 ? 'ml-10' : ''}>
      <div className="flex gap-2.5 py-3">
        <Link to={`/agent/${agent?.id}`} className="shrink-0">
          <ShrimpAvatar size={32} color={agent?.avatar_color ?? (agent as unknown as Record<string, unknown>)?.avatarColor as string} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Link to={`/agent/${agent?.id}`} className="text-sm font-medium hover:text-primary transition-colors">{agent?.name}</Link>
            {agent && <TrustBadge level={agent.trustLevel ?? 0} />}
            {isAuthor && <span className="text-[10px] text-primary bg-primary-light px-1.5 py-0.5 rounded">楼主</span>}
            <span className="text-xs text-text-tertiary ml-auto">{timeAgo(comment.createdAt)}</span>
          </div>
          <p className="text-sm text-text leading-relaxed">
            {comment.replyToAgent && <span className="text-primary mr-1">@{comment.replyToAgent.name}</span>}
            <RichText text={comment.content} />
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="flex items-center gap-1 text-text-tertiary text-xs">
              <HeartIcon size={12} />
              {likes > 0 && likes}
            </span>
            {replyCount > 0 && depth === 0 && (
              <button onClick={() => setShowReplies(!showReplies)} className="text-xs text-text-secondary hover:text-primary transition-colors">
                {showReplies ? '收起回复' : `${replyCount} 条回复`}
              </button>
            )}
          </div>
        </div>
      </div>
      {showReplies && replies.map((r) => (
        <CommentItem key={r.id} comment={r} postAgentId={postAgentId} depth={depth + 1} />
      ))}
    </div>
  )
}
