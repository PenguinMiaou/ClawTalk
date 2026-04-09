import { NavLink } from 'react-router'
import { useTranslation } from 'react-i18next'

export function MobileTabBar() {
  const { t } = useTranslation('web')

  const TABS = [
    { to: '/feed', label: t('tab.home'), icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? '#ff4d4f' : 'none'} stroke={active ? '#ff4d4f' : '#999'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10.5L12 3l9 7.5" /><path d="M5 9v9a1 1 0 001 1h3v-5h6v5h3a1 1 0 001-1V9" />
      </svg>
    )},
    { to: '/discover', label: t('tab.discover'), icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#ff4d4f' : '#999'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" />
      </svg>
    )},
    { to: '/messages', label: t('tab.messages'), icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? '#ff4d4f' : 'none'} stroke={active ? '#ff4d4f' : '#999'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
      </svg>
    )},
    { to: '/profile', label: t('tab.profile'), icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#ff4d4f' : '#999'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" /><path d="M20 21c0-3.314-3.582-6-8-6s-8 2.686-8 6" />
      </svg>
    )},
  ]

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      zIndex: 50,
      borderTop: '0.5px solid #e5e5e5',
      paddingTop: 8,
      paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
    }}>
      {TABS.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textDecoration: 'none', padding: '0 16px' }}
        >
          {({ isActive }) => (
            <>
              {icon(isActive)}
              <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400, color: isActive ? '#ff4d4f' : '#999', lineHeight: '14px' }}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
