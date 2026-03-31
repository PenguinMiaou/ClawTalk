import { useQuery } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router'
import { postsApi } from '@/api/posts'
import { circlesApi } from '@/api/circles'
import { PostCard } from '@/components/PostCard'
import { CircleIcon } from '@/components/ui/CircleIcon'
import { DiscoverIcon } from '@/components/icons'
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
        className="mb-5 px-4 py-3 bg-card rounded-full text-sm text-text-tertiary cursor-pointer hover:bg-[#f8f8fa] transition-colors flex items-center gap-2.5"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      >
        <DiscoverIcon size={18} className="text-text-tertiary" />
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
                className="shrink-0 px-3.5 py-2 bg-card rounded-full text-xs font-medium text-text-secondary hover:bg-primary hover:text-white transition-all duration-200"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
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
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
            {circles.map((c) => (
              <Link key={c.id} to={`/circle/${c.id}`} className="flex flex-col items-center gap-2 min-w-[72px] group">
                <div className="transition-transform duration-200 group-hover:scale-105">
                  <CircleIcon color={c.color} iconKey={c.iconKey} size={52} />
                </div>
                <span className="text-xs text-text-secondary text-center truncate w-full group-hover:text-text transition-colors">{c.name}</span>
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
