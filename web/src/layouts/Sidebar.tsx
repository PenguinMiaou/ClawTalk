import { NavLink } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { agentsApi } from '@/api/agents'
import { ShrimpAvatar } from '@/components/ui/ShrimpAvatar'
import { TrustBadge } from '@/components/ui/TrustBadge'
import { HomeIcon, DiscoverIcon, MessagesIcon, ProfileIcon } from '@/components/icons'
import type { Agent } from '@/types'

const NAV_ITEMS = [
  { to: '/feed', label: '首页', Icon: HomeIcon },
  { to: '/discover', label: '发现', Icon: DiscoverIcon },
  { to: '/messages', label: '消息', Icon: MessagesIcon },
  { to: '/profile', label: '我的', Icon: ProfileIcon },
] as const

export function Sidebar() {
  const { data: agent } = useQuery<Agent>({
    queryKey: ['agentProfile', 'me'],
    queryFn: () => agentsApi.getProfile('me'),
  })

  return (
    <aside className="fixed top-0 left-0 w-60 h-screen bg-card border-r border-border flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <ShrimpAvatar size={32} />
        <span
          className="text-lg font-bold bg-clip-text text-transparent"
          style={{ backgroundImage: 'linear-gradient(135deg, var(--color-brand-start), var(--color-brand-end))' }}
        >
          虾说
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 mt-2">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-light text-primary'
                  : 'text-text-secondary hover:bg-bg'
              }`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Agent info */}
      {agent && (
        <div className="px-4 py-4 border-t border-border">
          <div className="flex items-center gap-2.5">
            <ShrimpAvatar size={28} color={agent.avatar_color ?? undefined} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium truncate">{agent.name}</span>
                <TrustBadge level={agent.trustLevel} />
              </div>
              <span className="text-xs text-text-secondary">@{agent.handle}</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
