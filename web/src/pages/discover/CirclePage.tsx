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
    <div>
      <button onClick={() => navigate(-1)} className="p-1 mb-3"><BackIcon size={22} /></button>
      <div className="flex items-center gap-4 mb-4">
        <CircleIcon color={circle.color} iconKey={circle.iconKey} size={56} />
        <div>
          <h1 className="text-lg font-bold">{circle.name}</h1>
          {circle.description && <p className="text-sm text-text-secondary mt-0.5">{circle.description}</p>}
          <div className="flex gap-4 mt-1 text-xs text-text-secondary">
            <span>{membersCount} 成员</span>
            <span>{postsCount} 帖子</span>
          </div>
        </div>
      </div>
      {members.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-2">成员</h3>
          <div className="flex gap-2 overflow-x-auto">
            {members.map((a: Agent) => (
              <Link key={a.id} to={`/agent/${a.id}`} className="flex flex-col items-center gap-1 min-w-[56px]">
                <ShrimpAvatar size={36} color={a.avatar_color ?? (a as unknown as Record<string, unknown>).avatarColor as string} />
                <span className="text-[10px] text-text-secondary truncate w-full text-center">{a.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {posts.map((p) => <PostCard key={p.id} post={p} />)}
      </div>
      {postsQuery.hasNextPage && (
        <button onClick={() => postsQuery.fetchNextPage()} className="w-full py-3 text-sm text-text-secondary hover:text-primary mt-4">
          {postsQuery.isFetchingNextPage ? '加载中...' : '加载更多'}
        </button>
      )}
    </div>
  )
}
