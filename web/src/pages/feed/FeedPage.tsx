import { useState } from 'react'
import { useParams } from 'react-router'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { postsApi } from '@/api/posts'
import { PostCard } from '@/components/PostCard'
import { LoadingView } from '@/components/ui/LoadingView'
import { ErrorView } from '@/components/ui/ErrorView'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Post } from '@/types'

const TABS = [
  { key: 'following', label: '关注' },
  { key: 'discover', label: '发现' },
  { key: 'trending', label: '热门' },
] as const

type TabKey = (typeof TABS)[number]['key']

export function FeedPage() {
  const { tab: paramTab } = useParams()
  const [activeTab, setActiveTab] = useState<TabKey>((paramTab as TabKey) ?? 'discover')

  return (
    <div>
      {/* Tab bar — centered, iOS style */}
      <div style={{ display: 'flex', justifyContent: 'center', backgroundColor: '#fff', position: 'sticky', top: 0, zIndex: 20, borderBottom: '0.5px solid #f0f0f0' }}>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              padding: '14px 24px 12px',
              fontSize: 16,
              fontWeight: activeTab === key ? 600 : 400,
              color: activeTab === key ? '#1a1a1a' : '#999',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === key ? '2.5px solid #ff4d4f' : '2.5px solid transparent',
              cursor: 'pointer',
              transition: 'color 0.2s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Post grid */}
      <div style={{ padding: '8px 8px 0' }}>
        {activeTab === 'trending' ? <TrendingList /> : <FeedList filter={activeTab} />}
      </div>
    </div>
  )
}

function PostGrid({ posts }: { posts: Post[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {posts.map((post) => <PostCard key={post.id} post={post} />)}
    </div>
  )
}

function FeedList({ filter }: { filter: string }) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } = useInfiniteQuery({
    queryKey: ['feed', filter],
    queryFn: ({ pageParam }) => postsApi.getFeed({ filter, cursor: pageParam, limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last?.next_cursor ?? undefined,
  })

  if (isLoading) return <LoadingView />
  if (isError) return <ErrorView onRetry={refetch} />

  const posts: Post[] = data?.pages.flatMap((p) => p.posts ?? []) ?? []
  if (posts.length === 0) return <EmptyState message="还没有内容，去发现看看吧" />

  return (
    <>
      <PostGrid posts={posts} />
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          style={{ width: '100%', padding: '14px 0', marginTop: 12, fontSize: 14, color: '#999', background: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer' }}
        >
          {isFetchingNextPage ? '加载中...' : '加载更多'}
        </button>
      )}
    </>
  )
}

function TrendingList() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['trending'],
    queryFn: () => postsApi.getTrending(40),
  })

  if (isLoading) return <LoadingView />
  if (isError) return <ErrorView onRetry={refetch} />

  const posts: Post[] = data?.posts ?? data ?? []
  if (posts.length === 0) return <EmptyState />

  return <PostGrid posts={posts} />
}
