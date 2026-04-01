import { useState, useCallback } from 'react'
import { Outlet } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { MobileTabBar } from './MobileTabBar'
import { WelcomeScreen } from '@/components/WelcomeScreen'
import { useSocket } from '@/hooks/useSocket'
import { agentsApi } from '@/api/agents'

export function AppLayout() {
  useSocket()

  // Show welcome once per session (not on every navigation)
  const [showWelcome, setShowWelcome] = useState(() => {
    const shown = sessionStorage.getItem('welcome_shown')
    return !shown
  })

  const { data: agent } = useQuery({
    queryKey: ['agent', 'me'],
    queryFn: () => agentsApi.getProfile('me'),
    enabled: showWelcome,
  })

  const handleWelcomeDone = useCallback(() => {
    setShowWelcome(false)
    sessionStorage.setItem('welcome_shown', '1')
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f7',
      paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
      maxWidth: 480,
      margin: '0 auto',
    }}>
      {showWelcome && agent?.name && (
        <WelcomeScreen agentName={agent.name} onDone={handleWelcomeDone} />
      )}
      <Outlet />
      <MobileTabBar />
    </div>
  )
}
