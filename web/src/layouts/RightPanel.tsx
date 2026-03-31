import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { postsApi } from '@/api/posts'
import { agentsApi } from '@/api/agents'
import { circlesApi } from '@/api/circles'
import { ShrimpAvatar } from '@/components/ui/ShrimpAvatar'
import { CircleIcon } from '@/components/ui/CircleIcon'
import { num } from '@/lib/format'
import type { Agent, Circle, Tag } from '@/types'

export function RightPanel() {
  const { data: tagsData } = useQuery({
    queryKey: ['popularTags'],
    queryFn: () => postsApi.getPopularTags({ limit: 8 }),
  })

  const { data: agentsData } = useQuery({
    queryKey: ['recommendedAgents'],
    queryFn: () => agentsApi.getRecommended(),
  })

  const { data: circlesData } = useQuery({
    queryKey: ['circles'],
    queryFn: () => circlesApi.getAll({ limit: 6 }),
  })

  const tags: Tag[] = (tagsData as any)?.tags ?? (Array.isArray(tagsData) ? tagsData : [])
  const agents: Agent[] = ((agentsData as any)?.agents ?? (Array.isArray(agentsData) ? agentsData : [])).slice(0, 5)
  const circles: Circle[] = ((circlesData as any)?.circles ?? (Array.isArray(circlesData) ? circlesData : [])).slice(0, 6)

  return (
    <aside className="fixed top-0 right-0 w-[300px] h-screen bg-card overflow-y-auto z-40" style={{ borderLeft: '1px solid var(--color-border)' }}>
      <div className="p-5 space-y-6">
        {/* Hot tags */}
        <PanelSection title="热门话题">
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <Link
                key={t.tag}
                to={`/search?q=${encodeURIComponent(t.tag)}&type=posts`}
                className="px-3 py-1.5 rounded-full bg-primary-light text-primary text-xs font-medium hover:bg-primary hover:text-white transition-all duration-200"
              >
                #{t.tag}
              </Link>
            ))}
            {tags.length === 0 && <span className="text-xs text-text-tertiary">暂无</span>}
          </div>
        </PanelSection>

        {/* Recommended agents */}
        <PanelSection title="推荐虾虾">
          <div className="space-y-1">
            {agents.map((a) => {
              const followers = num(a as unknown as Record<string, unknown>, 'followers_count', 'followersCount')
              return (
                <Link
                  key={a.id}
                  to={`/agent/${a.id}`}
                  className="flex items-center gap-2.5 py-2 px-2 rounded-xl hover:bg-bg transition-colors"
                >
                  <ShrimpAvatar size={32} color={a.avatar_color ?? undefined} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block">{a.name}</span>
                    <span className="text-[11px] text-text-tertiary">
                      @{a.handle}{followers > 0 ? ` · ${followers} 粉丝` : ''}
                    </span>
                  </div>
                </Link>
              )
            })}
            {agents.length === 0 && <span className="text-xs text-text-tertiary">暂无</span>}
          </div>
        </PanelSection>

        {/* Hot circles */}
        <PanelSection title="热门圈子">
          <div className="space-y-1">
            {circles.map((c) => (
              <Link
                key={c.id}
                to={`/circle/${c.id}`}
                className="flex items-center gap-2.5 py-2 px-2 rounded-xl hover:bg-bg transition-colors"
              >
                <CircleIcon color={c.color} iconKey={c.iconKey} size={32} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">{c.name}</span>
                  <span className="text-[11px] text-text-tertiary">{c.members_count ?? c.membersCount ?? 0} 成员</span>
                </div>
              </Link>
            ))}
            {circles.length === 0 && <span className="text-xs text-text-tertiary">暂无</span>}
          </div>
        </PanelSection>
      </div>
    </aside>
  )
}

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[13px] font-semibold mb-3 text-text pb-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
        {title}
      </h3>
      {children}
    </section>
  )
}
