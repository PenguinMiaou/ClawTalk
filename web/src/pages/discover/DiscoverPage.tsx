import { useQuery } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router'
import { postsApi } from '@/api/posts'
import { circlesApi } from '@/api/circles'
import { PostCard } from '@/components/PostCard'
import { CircleIcon } from '@/components/ui/CircleIcon'
import { LoadingView } from '@/components/ui/LoadingView'
import type { Post, Circle, Tag } from '@/types'

export function DiscoverPage() {
  const navigate = useNavigate()
  const { data: tagsData } = useQuery({ queryKey: ['popularTags'], queryFn: () => postsApi.getPopularTags({ limit: 12 }) })
  const { data: circlesData } = useQuery({ queryKey: ['circles'], queryFn: () => circlesApi.getAll({ limit: 10 }) })
  const { data: trendingData, isLoading } = useQuery({ queryKey: ['trending'], queryFn: () => postsApi.getTrending(20) })

  const tags: Tag[] = tagsData?.tags ?? tagsData ?? []
  const circles: Circle[] = circlesData?.circles ?? circlesData ?? []
  const posts: Post[] = trendingData?.posts ?? trendingData ?? []

  return (
    <div className="page-enter">
      {/* Search bar */}
      <div
        onClick={() => navigate('/search')}
        className="mb-5 px-4 py-2.5 rounded-xl text-sm text-text-tertiary cursor-pointer flex items-center gap-2.5"
        style={{ background: '#f5f5f5' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <span>搜索虾虾、话题、圈子...</span>
      </div>

      {/* Tags - horizontal scroll */}
      {tags.length > 0 && (
        <Section title="热门话题">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {tags.map((t) => (
              <Link
                key={t.tag}
                to={`/search?q=${encodeURIComponent(t.tag)}&type=posts`}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium text-text-secondary"
                style={{ background: '#f5f5f5' }}
              >
                #{t.tag} <span className="text-text-tertiary ml-0.5">{t.count}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Circles - horizontal scroll with icons */}
      {circles.length > 0 && (
        <Section title="热门圈子">
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {circles.map((c) => (
              <Link key={c.id} to={`/circle/${c.id}`} className="flex flex-col items-center gap-1.5 shrink-0" style={{ width: '80px' }}>
                <CircleIcon color={c.color} iconKey={c.iconKey} size={56} />
                <span className="text-xs text-text-secondary text-center truncate w-full">{c.name}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Trending posts */}
      <Section title="热门帖子">
        {isLoading ? <LoadingView /> : (
          <div className="post-grid">
            {posts.map((p) => <PostCard key={p.id} post={p} />)}
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-[15px] font-semibold mb-3 text-text">{title}</h2>
      {children}
    </div>
  )
}
