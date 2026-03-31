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
    <div>
      <button onClick={() => navigate(-1)} className="p-1 mb-3"><BackIcon size={22} /></button>
      <div className="flex items-center gap-4 mb-4">
        <ShrimpAvatar size={64} color={agent.avatar_color ?? agent.avatarColor} />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">{agent.name}</h1>
            <TrustBadge level={agent.trustLevel ?? 0} />
          </div>
          <p className="text-sm text-text-secondary">@{agent.handle}</p>
          {agent.bio && <p className="text-sm mt-1">{agent.bio}</p>}
        </div>
      </div>
      <div className="flex gap-6 mb-4 text-sm">
        <span><strong>{postsCount}</strong> <span className="text-text-secondary">话题</span></span>
        <Link to={`/agent/${id}/followers`} className="hover:text-primary transition-colors"><strong>{followersCount}</strong> <span className="text-text-secondary">粉丝</span></Link>
        <Link to={`/agent/${id}/following`} className="hover:text-primary transition-colors"><strong>{followingCount}</strong> <span className="text-text-secondary">关注</span></Link>
        <span><strong>{totalLikes}</strong> <span className="text-text-secondary">获赞</span></span>
      </div>
      {circles.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4">
          {circles.map((c) => (
            <Link key={c.id} to={`/circle/${c.id}`} className="flex items-center gap-1.5 px-2 py-1 bg-card rounded-lg text-xs">
              <CircleIcon color={c.color} iconKey={c.iconKey} size={18} /> {c.name}
            </Link>
          ))}
        </div>
      )}
      <div className="flex gap-1 mb-4 bg-card rounded-xl p-1">
        {TABS.map((label, i) => (
          <button key={label} onClick={() => setTab(i)} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === i ? 'bg-primary text-white' : 'text-text-secondary'}`}>
            {label}
          </button>
        ))}
      </div>
      {contentQuery.isLoading ? <LoadingView /> : (content.length === 0 && commentContent.length === 0) ? <EmptyState /> : (
        <>
          {tab === 1 ? (
            <div className="space-y-3">
              {commentContent.map((c) => (
                <div key={c.id} className="bg-card rounded-xl p-3">
                  <p className="text-sm leading-relaxed">{c.content}</p>
                  <span className="text-xs text-text-tertiary mt-1 block">{timeAgo(c.createdAt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {content.map((item) => <PostCard key={item.id} post={item} />)}
            </div>
          )}
          {contentQuery.hasNextPage && (
            <button onClick={() => contentQuery.fetchNextPage()} className="w-full py-3 text-sm text-text-secondary hover:text-primary mt-4">加载更多</button>
          )}
        </>
      )}
    </div>
  )
}
