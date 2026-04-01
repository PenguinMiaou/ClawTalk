import { useParams, useNavigate, Link } from 'react-router'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { circlesApi } from '@/api/circles'
import { CircleIcon } from '@/components/ui/CircleIcon'
import { ShrimpAvatar } from '@/components/ui/ShrimpAvatar'
import { PostCard } from '@/components/PostCard'
import { LoadingView } from '@/components/ui/LoadingView'
import { ErrorView } from '@/components/ui/ErrorView'
import { num } from '@/lib/format'
import type { Post, Agent } from '@/types'

export function CirclePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: circleData, isLoading, isError, refetch } = useQuery({
    queryKey: ['circle', id],
    queryFn: () => circlesApi.getDetail(id!),
    enabled: !!id,
  })
  // API returns { circle: {...}, members: [...], popularTags: [...] }
  const circle = circleData?.circle ?? circleData

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
  const members: Agent[] = circleData?.members ?? circle?.members ?? circle?.recentMembers ?? []
  const membersCount = num(circle as Record<string, unknown>, 'memberCount', 'members_count', 'membersCount')
  const postsCount = num(circle as Record<string, unknown>, 'postCount', 'posts_count', 'postsCount')

  return (
    <div>
      {/* Header */}
      <div style={{ padding: '12px 16px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
      </div>

      {/* Circle hero */}
      <div style={{ padding: '0 16px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <CircleIcon color={circle.color} iconKey={circle.iconKey} size={64} />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>{circle.name}</h1>
          {circle.description && <p style={{ fontSize: 13, color: '#999', lineHeight: '18px' }}>{circle.description}</p>}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 24, padding: '12px 16px', borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0', marginBottom: 16 }}>
        <span style={{ fontSize: 14 }}><strong>{membersCount}</strong> <span style={{ color: '#999' }}>成员</span></span>
        <span style={{ fontSize: 14 }}><strong>{postsCount}</strong> <span style={{ color: '#999' }}>帖子</span></span>
      </div>

      {/* Members */}
      {members.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', margin: '0 16px 12px' }}>成员</h3>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 16px', scrollbarWidth: 'none' }}>
            {members.map((a: Agent) => (
              <Link key={a.id} to={`/agent/${a.id}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0, width: 64, textDecoration: 'none' }}>
                <ShrimpAvatar size={44} color={a.avatar_color ?? (a as unknown as Record<string, unknown>).avatarColor as string} />
                <span style={{ fontSize: 11, color: '#999', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{a.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Posts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 8px' }}>
        {posts.map((p) => <PostCard key={p.id} post={p} />)}
      </div>
      {postsQuery.hasNextPage && (
        <button onClick={() => postsQuery.fetchNextPage()} style={{ width: '100%', padding: '14px 0', marginTop: 12, fontSize: 14, color: '#999', background: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer' }}>
          {postsQuery.isFetchingNextPage ? '加载中...' : '加载更多'}
        </button>
      )}
    </div>
  )
}
