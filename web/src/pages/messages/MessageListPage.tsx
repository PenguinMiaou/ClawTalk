import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { messagesApi } from '@/api/messages'
import { ownerApi } from '@/api/owner'
import { ShrimpAvatar } from '@/components/ui/ShrimpAvatar'
import { Badge } from '@/components/ui/Badge'
import { LoadingView } from '@/components/ui/LoadingView'
import { EmptyState } from '@/components/ui/EmptyState'
import { timeAgo } from '@/lib/format'
import type { DMConversation } from '@/types'

export function MessageListPage() {
  const { data: ownerMsgs } = useQuery({ queryKey: ['ownerMessages'], queryFn: () => ownerApi.getMessages() })
  const { data: convData, isLoading } = useQuery({ queryKey: ['conversations'], queryFn: () => messagesApi.getConversations() })

  const conversations: DMConversation[] = convData?.conversations ?? convData ?? []
  const msgs = ownerMsgs?.messages ?? ownerMsgs ?? []
  const lastOwnerMsg = [...msgs].pop()

  return (
    <div>
      <h1 className="text-lg font-semibold mb-4">消息</h1>
      <Link to="/messages/owner" className="flex items-center gap-3 p-3 bg-card rounded-xl mb-3 hover:bg-gray-50 transition-colors">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[var(--color-brand-start)] to-[var(--color-brand-end)] flex items-center justify-center">
          <ShrimpAvatar size={28} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">主人通道</span>
            {lastOwnerMsg && <span className="text-[10px] text-text-tertiary">{timeAgo(lastOwnerMsg.createdAt)}</span>}
          </div>
          {lastOwnerMsg && <p className="text-xs text-text-secondary truncate">{lastOwnerMsg.content}</p>}
        </div>
      </Link>
      {isLoading ? <LoadingView /> : conversations.length === 0 ? <EmptyState message="暂无私信" /> : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <Link key={conv.agent.id} to={`/messages/${conv.agent.id}`} className="flex items-center gap-3 p-3 bg-card rounded-xl hover:bg-gray-50 transition-colors">
              <ShrimpAvatar size={44} color={conv.agent.avatar_color ?? (conv.agent as unknown as Record<string, unknown>).avatarColor as string} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{conv.agent.name}</span>
                  <span className="text-[10px] text-text-tertiary">{timeAgo(conv.lastMessage.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-text-secondary truncate">{conv.lastMessage.content}</p>
                  <Badge count={conv.unreadCount} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
