import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { postsApi } from '@/api/posts'
import { PostCard } from '@/components/PostCard'
import { LoadingView } from '@/components/ui/LoadingView'
import { ErrorView } from '@/components/ui/ErrorView'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Post } from '@/types'

type TabKey = 'following' | 'discover' | 'trending'

/* ── Animated Tab Indicator ── */
function TabBar({ activeTab, onTabChange }: { activeTab: TabKey; onTabChange: (k: TabKey) => void }) {
  const { t } = useTranslation('web')
  const TABS = [
    { key: 'following' as TabKey, label: t('feed.following') },
    { key: 'discover' as TabKey, label: t('feed.discover') },
    { key: 'trending' as TabKey, label: t('feed.trending') },
  ]
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })
  const activeIndex = TABS.findIndex((t) => t.key === activeTab)

  useEffect(() => {
    const el = tabRefs.current[activeIndex]
    if (el) {
      const parent = el.parentElement!
      const parentRect = parent.getBoundingClientRect()
      const rect = el.getBoundingClientRect()
      const centerX = rect.left - parentRect.left + (rect.width - 20) / 2
      setIndicator({ left: centerX, width: 20 })
    }
  }, [activeIndex])

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#fff', borderBottom: '0.5px solid #f0f0f0' }}>
      <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
        {TABS.map(({ key, label }, i) => (
          <button
            key={key}
            ref={(el) => { tabRefs.current[i] = el }}
            onClick={() => onTabChange(key)}
            style={{
              padding: '14px 20px 12px',
              fontSize: 16,
              fontWeight: activeTab === key ? 600 : 400,
              color: activeTab === key ? '#1a1a1a' : '#999',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'color 0.2s, font-weight 0.2s',
            }}
          >
            {label}
          </button>
        ))}
        {/* Animated indicator */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          height: 2.5,
          borderRadius: 2,
          backgroundColor: '#ff4d4f',
          width: indicator.width,
          left: indicator.left,
          transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.15s',
        }} />
      </div>
    </div>
  )
}

/* ── Staggered Card Entry ── */
function AnimatedPostCard({ post, index }: { post: Post; index: number }) {
  const delay = Math.min(index * 50, 300)
  return (
    <div style={{
      opacity: 0,
      transform: 'translateY(20px)',
      animation: `cardEnter 0.3s cubic-bezier(0.33, 1, 0.68, 1) ${delay}ms forwards`,
    }}>
      <PostCard post={post} />
    </div>
  )
}

/* ── Tab Content Slide ── */
function SlideContent({ direction, children }: { direction: 'left' | 'right'; children: React.ReactNode }) {
  const enterFrom = direction === 'right' ? '60px' : '-60px'
  return (
    <div
      key={direction + Date.now()}
      style={{
        animation: `slideContent 0.25s cubic-bezier(0.33, 1, 0.68, 1) forwards`,
        // @ts-expect-error CSS custom property
        '--slide-from': enterFrom,
      }}
    >
      {children}
    </div>
  )
}

export function FeedPage() {
  const { tab: paramTab } = useParams()
  const [activeTab, setActiveTab] = useState<TabKey>((paramTab as TabKey) ?? 'discover')
  const prevTab = useRef(activeTab)
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('right')

  const handleTabChange = (key: TabKey) => {
    const keys: TabKey[] = ['following', 'discover', 'trending']
    const prevIdx = keys.indexOf(prevTab.current)
    const newIdx = keys.indexOf(key)
    setSlideDir(newIdx > prevIdx ? 'right' : 'left')
    prevTab.current = key
    setActiveTab(key)
  }

  return (
    <div>
      <TabBar activeTab={activeTab} onTabChange={handleTabChange} />
      <div style={{ padding: '8px 8px 0' }}>
        <SlideContent direction={slideDir}>
          {activeTab === 'trending' ? <TrendingList /> : <FeedList filter={activeTab} />}
        </SlideContent>
      </div>
    </div>
  )
}

function PostGrid({ posts }: { posts: Post[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {posts.map((post, i) => <AnimatedPostCard key={post.id} post={post} index={i} />)}
    </div>
  )
}

function FeedList({ filter }: { filter: string }) {
  const { t } = useTranslation()
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } = useInfiniteQuery({
    queryKey: ['feed', filter],
    queryFn: ({ pageParam }) => postsApi.getFeed({ filter, cursor: pageParam, limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last?.next_cursor ?? undefined,
  })

  if (isLoading) return <LoadingView />
  if (isError) return <ErrorView onRetry={refetch} />

  const posts: Post[] = data?.pages.flatMap((p) => p.posts ?? []) ?? []
  if (posts.length === 0) return <EmptyState message={t('common:empty.noPosts')} />

  return (
    <>
      <PostGrid posts={posts} />
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          style={{ width: '100%', padding: '14px 0', marginTop: 12, fontSize: 14, color: '#999', background: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer' }}
        >
          {isFetchingNextPage ? t('common:action.loading') : t('common:action.loadMore')}
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
