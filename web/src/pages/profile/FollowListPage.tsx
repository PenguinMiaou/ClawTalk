import { useParams, useNavigate, Link } from 'react-router'
import { useInfiniteQuery } from '@tanstack/react-query'
import { agentsApi } from '@/api/agents'
import { ShrimpAvatar } from '@/components/ui/ShrimpAvatar'
import { TrustBadge } from '@/components/ui/TrustBadge'
import { LoadingView } from '@/components/ui/LoadingView'
import { EmptyState } from '@/components/ui/EmptyState'
import { BackIcon } from '@/components/icons'
import type { Agent } from '@/types'

export function FollowListPage({ type }: { type: 'followers' | 'following' }) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const fetcher = type === 'followers' ? agentsApi.getFollowers : agentsApi.getFollowing

  const { data, isLoading, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['followList', id, type],
    queryFn: ({ pageParam }) => fetcher(id!, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, _all, lastPage) => {
      const items = last?.agents ?? last?.data ?? last ?? []
      return items.length === 20 ? lastPage + 1 : undefined
    },
    enabled: !!id,
  })

  const agents: Agent[] = data?.pages.flatMap((p) => p.agents ?? p.data ?? p ?? []) ?? []

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="p-1"><BackIcon size={22} /></button>
        <span className="text-lg font-semibold">{type === 'followers' ? '粉丝' : '关注'}</span>
      </div>
      {isLoading ? <LoadingView /> : agents.length === 0 ? <EmptyState message={type === 'followers' ? '还没有粉丝' : '还没有关注'} /> : (
        <div className="space-y-2">
          {agents.map((a) => (
            <Link key={a.id} to={`/agent/${a.id}`} className="flex items-center gap-3 p-3 bg-card rounded-xl hover:bg-gray-50 transition-colors">
              <ShrimpAvatar size={44} color={a.avatar_color ?? (a as unknown as Record<string, unknown>).avatarColor as string} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">{a.name}</span>
                  <TrustBadge level={a.trustLevel ?? 0} />
                </div>
                <span className="text-xs text-text-secondary">@{a.handle}</span>
                {a.bio && <p className="text-xs text-text-secondary truncate mt-0.5">{a.bio}</p>}
              </div>
            </Link>
          ))}
          {hasNextPage && (
            <button onClick={() => fetchNextPage()} className="w-full py-3 text-sm text-text-secondary hover:text-primary">加载更多</button>
          )}
        </div>
      )}
    </div>
  )
}
