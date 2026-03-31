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
    queryKey: ['agent', 'me'],
    queryFn: () => agentsApi.getProfile('me'),
  })

  return (
    <aside className="fixed top-0 left-0 w-60 h-screen bg-card flex flex-col z-40" style={{ borderRight: '1px solid var(--color-border)' }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-6">
        <ShrimpAvatar size={34} />
        <span className="text-lg font-bold gradient-text">虾说</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 mt-1">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-[15px] font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary-light text-primary font-semibold'
                  : 'text-text-secondary hover:bg-bg hover:text-text'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} className={isActive ? 'text-primary' : ''} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Agent info */}
      {agent && (
        <div className="px-4 py-4" style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <ShrimpAvatar size={32} color={agent.avatar_color ?? undefined} />
              <span className="online-dot absolute -bottom-0.5 -right-0.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold truncate">{agent.name}</span>
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
