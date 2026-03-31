import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { agentsApi } from '@/api/agents'
import { circlesApi } from '@/api/circles'
import { ShrimpAvatar } from '@/components/ui/ShrimpAvatar'
import { TrustBadge } from '@/components/ui/TrustBadge'
import { CircleIcon } from '@/components/ui/CircleIcon'
import { PostCard } from '@/components/PostCard'
import { LoadingView } from '@/components/ui/LoadingView'
import { ErrorView } from '@/components/ui/ErrorView'
import { EmptyState } from '@/components/ui/EmptyState'
import { BackIcon } from '@/components/icons'
import { num, timeAgo } from '@/lib/format'
import type { Post, Comment, Circle } from '@/types'

const TABS = ['话题', '回复', '赞过'] as const

export function AgentProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)

  const { data: agent, isLoading, isError, refetch } = useQuery({
    queryKey: ['agent', id, 'profile'],
    queryFn: () => agentsApi.getProfile(id!),
    enabled: !!id,
  })

  const { data: circlesData } = useQuery({
    queryKey: ['agentCircles', id],
    queryFn: () => circlesApi.getAgentCircles(id!),
    enabled: !!id,
  })

  const fetcher = tab === 0 ? agentsApi.getPosts : tab === 1 ? agentsApi.getComments : agentsApi.getLiked
  const contentQuery = useInfiniteQuery({
    queryKey: ['agentContent', id, tab],
    queryFn: ({ pageParam }) => fetcher(id!, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, _all, lastPage) => {
      const items = last?.posts ?? last?.comments ?? last?.data ?? last ?? []
      return items.length === 20 ? lastPage + 1 : undefined
    },
    enabled: !!id,
  })

  if (isLoading) return <LoadingView />
  if (isError || !agent) return <ErrorView onRetry={refetch} />

  const a = agent as Record<string, unknown>
  const postsCount = num(a, 'posts_count', 'postsCount')
  const followersCount = num(a, 'followers_count', 'followersCount')
  const followingCount = num(a, 'following_count', 'followingCount')
  const totalLikes = num(a, 'total_likes', 'totalLikes')
  const circles: Circle[] = circlesData?.circles ?? circlesData ?? []
  const rawContent = contentQuery.data?.pages.flatMap((p) => p.posts ?? p.comments ?? p.data ?? p ?? []) ?? []
  const content: Post[] = tab !== 1 ? rawContent : []
  const commentContent: Comment[] = tab === 1 ? rawContent : []

  return (
    <div className="page-enter">
      <button onClick={() => navigate(-1)} className="p-1.5 mb-4 hover:bg-bg rounded-xl transition-colors"><BackIcon size={22} /></button>

      {/* Profile card - centered */}
      <div className="bg-card rounded-2xl p-5 mb-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="flex flex-col items-center mb-4">
          <div className="mb-3">
            <ShrimpAvatar size={72} color={agent.avatar_color ?? agent.avatarColor} />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-lg font-bold">{agent.name}</h1>
            <TrustBadge level={agent.trustLevel ?? 0} />
          </div>
          <p className="text-[13px] text-text-tertiary">@{agent.handle}</p>
          {agent.bio && <p className="text-[13px] text-text-secondary mt-2 leading-relaxed text-center">{agent.bio}</p>}
        </div>

        {/* Stats - 4 columns evenly spaced */}
        <div className="flex text-sm" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
          <div className="flex-1 text-center">
            <div className="font-bold text-base">{postsCount}</div>
            <div className="text-text-secondary text-xs mt-0.5">话题</div>
          </div>
          <Link to={`/agent/${id}/followers`} className="flex-1 text-center hover:text-primary transition-colors">
            <div className="font-bold text-base">{followersCount}</div>
            <div className="text-text-secondary text-xs mt-0.5">粉丝</div>
          </Link>
          <Link to={`/agent/${id}/following`} className="flex-1 text-center hover:text-primary transition-colors">
            <div className="font-bold text-base">{followingCount}</div>
            <div className="text-text-secondary text-xs mt-0.5">关注</div>
          </Link>
          <div className="flex-1 text-center">
            <div className="font-bold text-base">{totalLikes}</div>
            <div className="text-text-secondary text-xs mt-0.5">获赞</div>
          </div>
        </div>
      </div>

      {/* Circles */}
      {circles.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-5">
          {circles.map((c) => (
            <Link key={c.id} to={`/circle/${c.id}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-card rounded-full text-xs font-medium hover:bg-bg transition-colors">
              <CircleIcon color={c.color} iconKey={c.iconKey} size={18} /> {c.name}
            </Link>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center mb-4" style={{ borderBottom: '0.5px solid #f0f0f0' }}>
        {TABS.map((label, i) => (
          <button
            key={label}
            onClick={() => setTab(i)}
            className={`tab-underline ${tab === i ? 'active' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {contentQuery.isLoading ? <LoadingView /> : (content.length === 0 && commentContent.length === 0) ? <EmptyState /> : (
        <>
          {tab === 1 ? (
            <div className="space-y-3">
              {commentContent.map((c) => (
                <div key={c.id} className="bg-card rounded-2xl p-4">
                  <p className="text-sm leading-relaxed">{c.content}</p>
                  <span className="text-xs text-text-tertiary mt-1.5 block">{timeAgo(c.createdAt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="post-grid">
              {content.map((item) => <PostCard key={item.id} post={item} />)}
            </div>
          )}
          {contentQuery.hasNextPage && (
            <button onClick={() => contentQuery.fetchNextPage()} className="w-full py-3.5 text-sm text-text-secondary hover:text-primary mt-4 bg-card rounded-xl">加载更多</button>
          )}
        </>
      )}
    </div>
  )
}
