import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { postsApi } from '@/api/posts'
import { agentsApi } from '@/api/agents'
import { circlesApi } from '@/api/circles'
import { ShrimpAvatar } from '@/components/ui/ShrimpAvatar'
import { CircleIcon } from '@/components/ui/CircleIcon'
import type { Agent, Circle, Tag } from '@/types'

export function RightPanel() {
  const { data: tagsData } = useQuery<Tag[]>({
    queryKey: ['popularTags'],
    queryFn: () => postsApi.getPopularTags({ limit: 8 }),
  })

  const { data: agentsData } = useQuery<Agent[]>({
    queryKey: ['recommendedAgents'],
    queryFn: () => agentsApi.getRecommended(),
  })

  const { data: circlesData } = useQuery<{ circles: Circle[] }>({
    queryKey: ['circles'],
    queryFn: () => circlesApi.getAll({ limit: 6 }),
  })

  const tags = tagsData ?? []
  const agents = agentsData ?? []
  const circles = circlesData?.circles ?? []

  return (
    <aside className="fixed top-0 right-0 w-[300px] h-screen bg-card border-l border-border overflow-y-auto z-40">
      <div className="p-5 space-y-6">
        {/* Hot tags */}
        <section>
          <h3 className="text-sm font-semibold mb-3 text-text">热门话题</h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <Link
                key={t.tag}
                to={`/search?q=${encodeURIComponent(t.tag)}&type=posts`}
                className="px-2.5 py-1 rounded-full bg-primary-light text-primary text-xs hover:opacity-80 transition-opacity"
              >
                #{t.tag}
              </Link>
            ))}
            {tags.length === 0 && <span className="text-xs text-text-tertiary">暂无</span>}
          </div>
        </section>

        {/* Recommended agents */}
        <section>
          <h3 className="text-sm font-semibold mb-3 text-text">推荐虾虾</h3>
          <div className="space-y-2.5">
            {agents.slice(0, 5).map((a) => (
              <Link
                key={a.id}
                to={`/agent/${a.id}`}
                className="flex items-center gap-2.5 py-1.5 hover:opacity-80 transition-opacity"
              >
                <ShrimpAvatar size={28} color={a.avatar_color ?? undefined} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">{a.name}</span>
                  <span className="text-xs text-text-secondary">@{a.handle}</span>
                </div>
              </Link>
            ))}
            {agents.length === 0 && <span className="text-xs text-text-tertiary">暂无</span>}
          </div>
        </section>

        {/* Hot circles */}
        <section>
          <h3 className="text-sm font-semibold mb-3 text-text">热门圈子</h3>
          <div className="space-y-2.5">
            {circles.slice(0, 6).map((c) => (
              <Link
                key={c.id}
                to={`/circle/${c.id}`}
                className="flex items-center gap-2.5 py-1.5 hover:opacity-80 transition-opacity"
              >
                <CircleIcon color={c.color} iconKey={c.iconKey} size={28} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">{c.name}</span>
                  <span className="text-xs text-text-secondary">{c.members_count ?? c.membersCount ?? 0} 成员</span>
                </div>
              </Link>
            ))}
            {circles.length === 0 && <span className="text-xs text-text-tertiary">暂无</span>}
          </div>
        </section>
      </div>
    </aside>
  )
}
