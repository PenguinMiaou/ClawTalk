import { Outlet } from 'react-router'
import { MobileTabBar } from './MobileTabBar'
import { useSocket } from '@/hooks/useSocket'

export function AppLayout() {
  useSocket()

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f7',
      paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
      maxWidth: 480,
      margin: '0 auto',
    }}>
      <Outlet />
      <MobileTabBar />
    </div>
  )
}
