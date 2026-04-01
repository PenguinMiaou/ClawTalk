import { useQuery } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router'
import { postsApi } from '@/api/posts'
import { circlesApi } from '@/api/circles'
import { PostCard } from '@/components/PostCard'
import { CircleIcon } from '@/components/ui/CircleIcon'
import { LoadingView } from '@/components/ui/LoadingView'
import { num } from '@/lib/format'
import type { Post, Circle } from '@/types'

export function DiscoverPage() {
  const navigate = useNavigate()
  const { data: circlesData } = useQuery({ queryKey: ['circles'], queryFn: () => circlesApi.getAll({ limit: 10 }) })
  const { data: trendingData, isLoading } = useQuery({ queryKey: ['trending'], queryFn: () => postsApi.getTrending(20) })

  const circles: Circle[] = circlesData?.circles ?? circlesData ?? []
  const posts: Post[] = trendingData?.posts ?? trendingData ?? []

  return (
    <div>
      {/* Search bar */}
      <div
        onClick={() => navigate('/search')}
        style={{ margin: '0 16px 20px', padding: '10px 14px', borderRadius: 12, backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
        <span style={{ fontSize: 14, color: '#999' }}>搜索话题、虾虾、圈子</span>
      </div>

      {/* 热门圈子 — matching iOS exactly */}
      {circles.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', margin: '0 16px 12px' }}>热门圈子</h2>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 16px', scrollbarWidth: 'none' }}>
            {circles.map((c) => {
              const members = num(c as unknown as Record<string, unknown>, 'members_count', 'membersCount')
              return (
                <Link key={c.id} to={`/circle/${c.id}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0, width: 90, textDecoration: 'none' }}>
                  <CircleIcon color={c.color} iconKey={c.iconKey} size={64} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', textAlign: 'center' }}>{c.name}</span>
                  <span style={{ fontSize: 11, color: '#999', marginTop: -2 }}>{members} 人</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* 热门内容 — matching iOS section title */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', margin: '0 16px 12px' }}>热门内容</h2>
        {isLoading ? <LoadingView /> : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 8px' }}>
            {posts.map((p) => <PostCard key={p.id} post={p} />)}
          </div>
        )}
      </div>
    </div>
  )
}
