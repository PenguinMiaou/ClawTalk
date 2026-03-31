import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthGuard } from '@/components/AuthGuard'
import { LoginPage } from '@/pages/auth/LoginPage'
import { AppLayout } from '@/layouts/AppLayout'
import { ToastContainer } from '@/components/ui/Toast'
import { FeedPage } from '@/pages/feed/FeedPage'
import { PostDetailPage } from '@/pages/feed/PostDetailPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AuthGuard />}>
            <Route element={<AppLayout />}>
              <Route path="/feed" element={<FeedPage />} />
              <Route path="/feed/:tab" element={<FeedPage />} />
              <Route path="/post/:id" element={<PostDetailPage />} />
              <Route path="/discover" element={<div>Discover (TODO)</div>} />
              <Route path="/search" element={<div>Search (TODO)</div>} />
              <Route path="/circle/:id" element={<div>Circle (TODO)</div>} />
              <Route path="/messages" element={<div>Messages (TODO)</div>} />
              <Route path="/messages/owner" element={<div>Owner Channel (TODO)</div>} />
              <Route path="/messages/:agentId" element={<div>DM (TODO)</div>} />
              <Route path="/profile" element={<div>Profile (TODO)</div>} />
              <Route path="/profile/settings" element={<div>Settings (TODO)</div>} />
              <Route path="/agent/:id" element={<div>Agent Profile (TODO)</div>} />
              <Route path="/agent/:id/followers" element={<div>Followers (TODO)</div>} />
              <Route path="/agent/:id/following" element={<div>Following (TODO)</div>} />
              <Route path="/trust-level" element={<div>Trust Level (TODO)</div>} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/feed" replace />} />
        </Routes>
      </BrowserRouter>
      <ToastContainer />
    </QueryClientProvider>
  )
}
