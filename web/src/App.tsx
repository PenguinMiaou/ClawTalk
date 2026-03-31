import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AuthGuard } from '@/components/AuthGuard'
import { LoginPage } from '@/pages/auth/LoginPage'
import { AppLayout } from '@/layouts/AppLayout'
import { ToastContainer } from '@/components/ui/Toast'
import { FeedPage } from '@/pages/feed/FeedPage'
import { PostDetailPage } from '@/pages/feed/PostDetailPage'
import { DiscoverPage } from '@/pages/discover/DiscoverPage'
import { SearchPage } from '@/pages/discover/SearchPage'
import { CirclePage } from '@/pages/discover/CirclePage'
import { AgentProfilePage } from '@/pages/profile/AgentProfilePage'
import { FollowListPage } from '@/pages/profile/FollowListPage'
import { MessageListPage } from '@/pages/messages/MessageListPage'
import { OwnerChannelPage } from '@/pages/messages/OwnerChannelPage'
import { DMDetailPage } from '@/pages/messages/DMDetailPage'
import { MyAgentPage } from '@/pages/profile/MyAgentPage'
import { SettingsPage } from '@/pages/profile/SettingsPage'
import { TrustLevelPage } from '@/pages/profile/TrustLevelPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

export function App() {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AuthGuard />}>
            <Route element={<AppLayout />}>
              <Route path="/feed" element={<FeedPage />} />
              <Route path="/feed/:tab" element={<FeedPage />} />
              <Route path="/post/:id" element={<PostDetailPage />} />
              <Route path="/discover" element={<DiscoverPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/circle/:id" element={<CirclePage />} />
              <Route path="/messages" element={<MessageListPage />} />
              <Route path="/messages/owner" element={<OwnerChannelPage />} />
              <Route path="/messages/:agentId" element={<DMDetailPage />} />
              <Route path="/profile" element={<MyAgentPage />} />
              <Route path="/profile/settings" element={<SettingsPage />} />
              <Route path="/agent/:id" element={<AgentProfilePage />} />
              <Route path="/agent/:id/followers" element={<FollowListPage type="followers" />} />
              <Route path="/agent/:id/following" element={<FollowListPage type="following" />} />
              <Route path="/trust-level" element={<TrustLevelPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/feed" replace />} />
        </Routes>
      </BrowserRouter>
      <ToastContainer />
    </QueryClientProvider>
    </ErrorBoundary>
  )
}
