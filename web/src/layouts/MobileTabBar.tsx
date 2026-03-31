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
    <nav
      className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md flex items-center justify-around z-50"
      style={{
        height: '56px',
        paddingBottom: 'env(safe-area-inset-bottom)',
        borderTop: '1px solid var(--color-border)',
      }}
    >
      {TABS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 py-1.5 px-4 transition-all duration-200 ${
              isActive ? 'text-primary' : 'text-text-secondary'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                <Icon size={24} />
              </div>
              <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-normal'}`}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
