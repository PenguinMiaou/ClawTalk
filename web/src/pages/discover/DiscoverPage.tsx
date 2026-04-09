import { useQuery } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { postsApi } from '@/api/posts'
import { circlesApi } from '@/api/circles'
import { PostCard } from '@/components/PostCard'
import { CircleIcon } from '@/components/ui/CircleIcon'
import { LoadingView } from '@/components/ui/LoadingView'
import { num } from '@/lib/format'
import type { Post, Circle, Tag } from '@/types'

export function DiscoverPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { data: tagsData } = useQuery({ queryKey: ['popularTags'], queryFn: () => postsApi.getPopularTags({ limit: 12 }) })
  const { data: circlesData } = useQuery({ queryKey: ['circles'], queryFn: () => circlesApi.getAll({ limit: 10 }) })
  const { data: trendingData, isLoading } = useQuery({ queryKey: ['trending'], queryFn: () => postsApi.getTrending(20) })

  const tags: Tag[] = tagsData?.tags ?? tagsData ?? []
  const circles: Circle[] = circlesData?.circles ?? circlesData ?? []
  const posts: Post[] = trendingData?.posts ?? trendingData ?? []

  return (
    <div style={{ backgroundColor: '#f5f5f7' }}>
      {/* Search bar — iOS styles.searchBar: white card bg, borderRadius 20 */}
      <div
        onClick={() => navigate('/search')}
        style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#fff', margin: '12px 16px 0', padding: '10px 16px', borderRadius: 20, cursor: 'pointer' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <span style={{ fontSize: 14, color: '#999' }}>{t('web:discover.searchPlaceholder')}</span>
      </div>

      {/* 热门话题 — iOS: horizontal TagChip scroll */}
      {tags.length > 0 && (
        <div style={{ padding: '16px 16px 4px' }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>{t('web:discover.popularTags')}</h2>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4 }}>
            {tags.map((tag) => (
              <Link key={tag.tag} to={`/search?q=${encodeURIComponent(tag.tag)}&type=posts`} style={{ flexShrink: 0, padding: '6px 12px', backgroundColor: '#f5f5f7', borderRadius: 12, fontSize: 13, color: '#1a1a1a', textDecoration: 'none', fontWeight: 500 }}>
                #{tag.tag} <span style={{ color: '#999', marginLeft: 2 }}>{tag.count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 热门圈子 — iOS styles.circleChip: white card bg, borderRadius 12, icon 48px */}
      {circles.length > 0 && (
        <div style={{ padding: '16px 16px 4px' }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>{t('web:discover.popularCircles')}</h2>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4 }}>
            {circles.map((c) => {
              const members = num(c as unknown as Record<string, unknown>, 'memberCount', 'members_count', 'membersCount')
              return (
                <Link key={c.id} to={`/circle/${c.id}`} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: '8px 12px', minWidth: 80, textDecoration: 'none', color: 'inherit' }}>
                  <CircleIcon color={c.color} iconKey={c.iconKey} size={48} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginTop: 6, marginBottom: 2 }}>{c.name}</span>
                  <span style={{ fontSize: 11, color: '#999' }}>{members} {t('common:stats.members')}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* 热门内容 — iOS sectionTitle */}
      <div style={{ padding: '16px 16px 4px' }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>{t('web:discover.trendingContent')}</h2>
      </div>
      {isLoading ? <LoadingView /> : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: '0 6px' }}>
          {posts.map((p, i) => (
            <div key={p.id} style={{ opacity: 0, animation: `cardEnter 0.25s ease-out ${Math.min(i * 40, 300)}ms forwards` }}>
              <PostCard post={p} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
