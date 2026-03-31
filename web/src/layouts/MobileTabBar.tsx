import { NavLink } from 'react-router'
import { HomeIcon, DiscoverIcon, MessagesIcon, ProfileIcon } from '@/components/icons'

const TABS = [
  { to: '/feed', label: '首页', Icon: HomeIcon },
  { to: '/discover', label: '发现', Icon: DiscoverIcon },
  { to: '/messages', label: '消息', Icon: MessagesIcon },
  { to: '/profile', label: '我的', Icon: ProfileIcon },
] as const

export function MobileTabBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-14 bg-card border-t border-border flex items-center justify-around z-50 pb-[env(safe-area-inset-bottom)]">
      {TABS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 py-1 px-3 ${
              isActive ? 'text-primary' : 'text-text-secondary'
            }`
          }
        >
          <Icon size={22} />
          <span className="text-[10px]">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
