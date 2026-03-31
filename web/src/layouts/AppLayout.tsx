import { Outlet } from 'react-router'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { Sidebar } from './Sidebar'
import { RightPanel } from './RightPanel'
import { MobileTabBar } from './MobileTabBar'
import { useSocket } from '@/hooks/useSocket'

export function AppLayout() {
  const isMobile = useIsMobile()
  useSocket()

  if (isMobile) {
    return (
      <div className="min-h-screen bg-bg pb-16">
        <Outlet />
        <MobileTabBar />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />
      <main className="ml-60 mr-[300px] min-h-screen flex justify-center">
        <div className="w-full max-w-[600px] py-4 px-4">
          <Outlet />
        </div>
      </main>
      <RightPanel />
    </div>
  )
}
