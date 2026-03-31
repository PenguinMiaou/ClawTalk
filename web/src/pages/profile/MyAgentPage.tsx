import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { agentsApi } from '@/api/agents'
import { circlesApi } from '@/api/circles'
import { ShrimpAvatar } from '@/components/ui/ShrimpAvatar'
import { TrustBadge } from '@/components/ui/TrustBadge'
import { CircleIcon } from '@/components/ui/CircleIcon'
import { PostCard } from '@/components/PostCard'
import { LoadingView } from '@/components/ui/LoadingView'
import { EmptyState } from '@/components/ui/EmptyState'
import { SettingsIcon } from '@/components/icons'
import { num } from '@/lib/format'
import type { Post, Circle } from '@/types'

const TABS = ['话题', '回复', '赞过'] as const

export function MyAgentPage() {
  const [tab, setTab] = useState(0)
  const { data: agent, isLoading } = useQuery({ queryKey: ['agent', 'me'], queryFn: () => agentsApi.getProfile('me') })
  const { data: circlesData } = useQuery({ queryKey: ['agentCircles', 'me'], queryFn: () => circlesApi.getAgentCircles('me') })

  const agentId = agent?.id
  const fetcher = tab === 0 ? agentsApi.getPosts : tab === 1 ? agentsApi.getComments : agentsApi.getLiked
  const contentQuery = useInfiniteQuery({
    queryKey: ['agentContent', agentId, tab],
    queryFn: ({ pageParam }) => fetcher(agentId!, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, _all, lastPage) => {
      const items = last?.posts ?? last?.comments ?? last?.data ?? last ?? []
      return items.length === 20 ? lastPage + 1 : undefined
    },
    enabled: !!agentId,
  })

  if (isLoading || !agent) return <LoadingView />

  const a = agent as Record<string, unknown>
  const postsCount = num(a, 'posts_count', 'postsCount')
  const followersCount = num(a, 'followers_count', 'followersCount')
  const followingCount = num(a, 'following_count', 'followingCount')
  const totalLikes = num(a, 'total_likes', 'totalLikes')
  const circles: Circle[] = circlesData?.circles ?? circlesData ?? []
  const content: Post[] = contentQuery.data?.pages.flatMap((p) => p.posts ?? p.comments ?? p.data ?? p ?? []) ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">我的</h1>
        <Link to="/profile/settings" className="p-1 text-text-secondary hover:text-text transition-colors"><SettingsIcon size={22} /></Link>
      </div>
      <div className="flex items-center gap-4 mb-4">
        <ShrimpAvatar size={64} color={agent.avatar_color ?? agent.avatarColor} />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{agent.name}</span>
            <TrustBadge level={agent.trustLevel ?? 0} />
          </div>
          <span className="text-sm text-text-secondary">@{agent.handle}</span>
          {agent.bio && <p className="text-sm mt-1">{agent.bio}</p>}
        </div>
      </div>
      <div className="flex gap-6 mb-4 text-sm">
        <span><strong>{postsCount}</strong> <span className="text-text-secondary">话题</span></span>
        <Link to={`/agent/${agentId}/followers`} className="hover:text-primary"><strong>{followersCount}</strong> <span className="text-text-secondary">粉丝</span></Link>
        <Link to={`/agent/${agentId}/following`} className="hover:text-primary"><strong>{followingCount}</strong> <span className="text-text-secondary">关注</span></Link>
        <span><strong>{totalLikes}</strong> <span className="text-text-secondary">获赞</span></span>
      </div>
      <Link to="/messages/owner" className="block p-3 bg-primary-light text-primary text-sm font-medium rounded-xl mb-4 text-center hover:opacity-90">进入主人通道</Link>
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
          <button key={label} onClick={() => setTab(i)} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === i ? 'bg-primary text-white' : 'text-text-secondary'}`}>{label}</button>
        ))}
      </div>
      {contentQuery.isLoading ? <LoadingView /> : content.length === 0 ? <EmptyState /> : (
        <>
          <div className="grid grid-cols-2 gap-3">{content.map((item) => <PostCard key={item.id} post={item} />)}</div>
          {contentQuery.hasNextPage && (
            <button onClick={() => contentQuery.fetchNextPage()} className="w-full py-3 text-sm text-text-secondary hover:text-primary mt-4">加载更多</button>
          )}
        </>
      )}
    </div>
  )
}
