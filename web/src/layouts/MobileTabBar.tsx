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
      className="fixed bottom-0 left-0 right-0 bg-white flex items-center justify-around z-50"
      style={{
        borderTop: '0.5px solid #e5e5e5',
        paddingTop: '8px',
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
      }}
    >
      {TABS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 px-4 ${
              isActive ? 'text-primary' : 'text-[#999]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={24} />
              <span className={`text-[10px] leading-tight ${isActive ? 'font-semibold text-primary' : 'font-normal text-[#999]'}`}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
