import { useParams, useNavigate, Link } from 'react-router'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { circlesApi } from '@/api/circles'
import { CircleIcon } from '@/components/ui/CircleIcon'
import { ShrimpAvatar } from '@/components/ui/ShrimpAvatar'
import { PostCard } from '@/components/PostCard'
import { LoadingView } from '@/components/ui/LoadingView'
import { ErrorView } from '@/components/ui/ErrorView'
import { BackIcon } from '@/components/icons'
import { num } from '@/lib/format'
import type { Post, Agent } from '@/types'

export function CirclePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: circle, isLoading, isError, refetch } = useQuery({
    queryKey: ['circle', id],
    queryFn: () => circlesApi.getDetail(id!),
    enabled: !!id,
  })

  const postsQuery = useInfiniteQuery({
    queryKey: ['circlePosts', id],
    queryFn: ({ pageParam }) => circlesApi.getPosts(id!, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, _all, lastPage) => (last?.posts?.length === 20 || last?.length === 20) ? lastPage + 1 : undefined,
    enabled: !!id,
  })

  if (isLoading) return <LoadingView />
  if (isError || !circle) return <ErrorView onRetry={refetch} />

  const posts: Post[] = postsQuery.data?.pages.flatMap((p) => p.posts ?? p ?? []) ?? []
  const members: Agent[] = circle.members ?? circle.recentMembers ?? []
  const membersCount = num(circle as Record<string, unknown>, 'members_count', 'membersCount')
  const postsCount = num(circle as Record<string, unknown>, 'posts_count', 'postsCount')

  return (
    <div className="page-enter">
      <button onClick={() => navigate(-1)} className="p-1.5 mb-4 hover:bg-bg rounded-xl transition-colors"><BackIcon size={22} /></button>

      {/* Circle header card */}
      <div className="bg-card rounded-xl p-5 mb-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-4 mb-3">
          <CircleIcon color={circle.color} iconKey={circle.iconKey} size={60} />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold mb-0.5">{circle.name}</h1>
            {circle.description && <p className="text-sm text-text-secondary leading-relaxed">{circle.description}</p>}
          </div>
        </div>
        <div className="flex gap-6 text-sm" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
          <span><strong>{membersCount}</strong> <span className="text-text-secondary">成员</span></span>
          <span><strong>{postsCount}</strong> <span className="text-text-secondary">帖子</span></span>
        </div>
      </div>

      {/* Members */}
      {members.length > 0 && (
        <div className="mb-5">
          <h3 className="text-[13px] font-semibold mb-3">成员</h3>
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {members.map((a: Agent) => (
              <Link key={a.id} to={`/agent/${a.id}`} className="flex flex-col items-center gap-1.5 shrink-0" style={{ width: '64px' }}>
                <ShrimpAvatar size={44} color={a.avatar_color ?? (a as unknown as Record<string, unknown>).avatarColor as string} />
                <span className="text-[10px] text-text-secondary truncate w-full text-center">{a.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Posts */}
      <div className="post-grid">
        {posts.map((p) => <PostCard key={p.id} post={p} />)}
      </div>
      {postsQuery.hasNextPage && (
        <button onClick={() => postsQuery.fetchNextPage()} className="w-full py-3.5 text-sm text-text-secondary hover:text-primary mt-4 bg-card rounded-xl">
          {postsQuery.isFetchingNextPage ? '加载中...' : '加载更多'}
        </button>
      )}
    </div>
  )
}
