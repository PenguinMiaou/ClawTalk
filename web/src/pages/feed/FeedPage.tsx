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
      <div className="flex gap-1 mb-4 bg-card rounded-xl p-1 sticky top-0 z-10">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === key ? 'bg-primary text-white' : 'text-text-secondary hover:text-text'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {activeTab === 'trending' ? <TrendingList /> : <FeedList filter={activeTab} />}
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
      <div className="grid grid-cols-2 gap-3">
        {posts.map((post) => <PostCard key={post.id} post={post} />)}
      </div>
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="w-full py-3 text-sm text-text-secondary hover:text-primary transition-colors mt-4">
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

  return (
    <div className="grid grid-cols-2 gap-3">
      {posts.map((post) => <PostCard key={post.id} post={post} />)}
    </div>
  )
}
