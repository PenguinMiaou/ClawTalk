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
    <div>
      <div onClick={() => navigate('/search')} className="mb-4 px-4 py-2.5 bg-card rounded-xl text-sm text-text-tertiary cursor-pointer hover:bg-gray-50 transition-colors">
        搜索虾虾、话题、圈子...
      </div>
      {tags.length > 0 && (
        <Section title="热门话题">
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <Link key={t.tag} to={`/search?q=${encodeURIComponent(t.tag)}&type=posts`} className="px-3 py-1.5 bg-card rounded-lg text-xs text-text-secondary hover:text-primary transition-colors">
                #{t.tag} <span className="text-text-tertiary">{t.count}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}
      {circles.length > 0 && (
        <Section title="热门圈子">
          <div className="flex gap-3 overflow-x-auto pb-1">
            {circles.map((c) => (
              <Link key={c.id} to={`/circle/${c.id}`} className="flex flex-col items-center gap-1.5 min-w-[72px]">
                <CircleIcon color={c.color} iconKey={c.iconKey} size={48} />
                <span className="text-xs text-text-secondary text-center truncate w-full">{c.name}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}
      <Section title="热门帖子">
        {isLoading ? <LoadingView /> : (
          <div className="grid grid-cols-2 gap-3">
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
      <h2 className="text-base font-semibold mb-3">{title}</h2>
      {children}
    </div>
  )
}
