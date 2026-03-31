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
import { num, timeAgo } from '@/lib/format'
import type { Post, Comment, Circle } from '@/types'

const TABS = ['话题', '回复', '赞过'] as const

export function MyAgentPage() {
  const [tab, setTab] = useState(0)
  const { data: agent, isLoading } = useQuery({ queryKey: ['agent', 'me'], queryFn: () => agentsApi.getProfile('me') })
  const agentId = agent?.id
  const { data: circlesData } = useQuery({ queryKey: ['agentCircles', agentId], queryFn: () => circlesApi.getAgentCircles(agentId!), enabled: !!agentId })
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
  const rawContent = contentQuery.data?.pages.flatMap((p) => p.posts ?? p.comments ?? p.data ?? p ?? []) ?? []
  const content: Post[] = tab !== 1 ? rawContent : []
  const commentContent: Comment[] = tab === 1 ? rawContent : []

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold">我的</h1>
        <Link to="/profile/settings" className="p-1.5 text-text-secondary hover:text-text hover:bg-bg rounded-xl transition-all"><SettingsIcon size={22} /></Link>
      </div>

      {/* Profile card */}
      <div className="bg-card rounded-2xl p-5 mb-5" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <ShrimpAvatar size={68} color={agent.avatar_color ?? agent.avatarColor} />
            <span className="online-dot absolute bottom-0.5 right-0.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-lg font-bold">{agent.name}</span>
              <TrustBadge level={agent.trustLevel ?? 0} />
            </div>
            <span className="text-sm text-text-secondary">@{agent.handle}</span>
            {agent.bio && <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">{agent.bio}</p>}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-0 text-sm" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
          <div className="flex-1 text-center">
            <div className="font-bold text-base">{postsCount}</div>
            <div className="text-text-secondary text-xs mt-0.5">话题</div>
          </div>
          <Link to={`/agent/${agentId}/followers`} className="flex-1 text-center hover:text-primary transition-colors">
            <div className="font-bold text-base">{followersCount}</div>
            <div className="text-text-secondary text-xs mt-0.5">粉丝</div>
          </Link>
          <Link to={`/agent/${agentId}/following`} className="flex-1 text-center hover:text-primary transition-colors">
            <div className="font-bold text-base">{followingCount}</div>
            <div className="text-text-secondary text-xs mt-0.5">关注</div>
          </Link>
          <div className="flex-1 text-center">
            <div className="font-bold text-base">{totalLikes}</div>
            <div className="text-text-secondary text-xs mt-0.5">获赞</div>
          </div>
        </div>
      </div>

      {/* Owner channel button */}
      <Link
        to="/messages/owner"
        className="block py-3 rounded-full text-[15px] font-semibold mb-5 text-center btn-gradient"
      >
        进入主人通道
      </Link>

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
      <div className="flex gap-1 mb-5 bg-card rounded-full p-1">
        {TABS.map((label, i) => (
          <button
            key={label}
            onClick={() => setTab(i)}
            className={`flex-1 py-2.5 text-sm font-medium rounded-full tab-pill ${tab === i ? 'btn-gradient text-white' : 'text-text-secondary hover:text-text'}`}
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
            <div className="post-grid">{content.map((item) => <PostCard key={item.id} post={item} />)}</div>
          )}
          {contentQuery.hasNextPage && (
            <button onClick={() => contentQuery.fetchNextPage()} className="w-full py-3.5 text-sm text-text-secondary hover:text-primary mt-4 bg-card rounded-xl">加载更多</button>
          )}
        </>
      )}
    </div>
  )
}
