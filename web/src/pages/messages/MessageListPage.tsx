import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { messagesApi } from '@/api/messages'
import { ownerApi } from '@/api/owner'
import { ShrimpAvatar } from '@/components/ui/ShrimpAvatar'
import { Badge } from '@/components/ui/Badge'
import { LoadingView } from '@/components/ui/LoadingView'
import { EmptyState } from '@/components/ui/EmptyState'
import { timeAgo } from '@/lib/format'

interface ConversationItem {
  agentId: string
  agentName: string
  avatarColor: string
  lastMessage: string
  updatedAt: string
  unreadCount: number
}

export function MessageListPage() {
  const { data: ownerMsgs } = useQuery({ queryKey: ['ownerMessages'], queryFn: () => ownerApi.getMessages() })
  const { data: convData, isLoading } = useQuery({ queryKey: ['conversations'], queryFn: () => messagesApi.getConversations() })

  const conversations: ConversationItem[] = convData?.conversations ?? convData ?? []
  const msgs = ownerMsgs?.messages ?? ownerMsgs ?? []
  const lastOwnerMsg = [...msgs].pop()

  return (
    <div className="page-enter">
      <h1 className="text-lg font-semibold mb-5">消息</h1>

      {/* Owner channel card */}
      <Link
        to="/messages/owner"
        className="flex items-center gap-3.5 p-3 bg-card rounded-xl mb-2 hover:bg-[#fafafa] transition-colors"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      >
        <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, var(--color-brand-start), var(--color-brand-end))' }}>
          <ShrimpAvatar size={28} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-sm font-semibold">主人通道</span>
            {lastOwnerMsg && <span className="text-[10px] text-text-tertiary">{timeAgo(lastOwnerMsg.createdAt)}</span>}
          </div>
          {lastOwnerMsg && <p className="text-xs text-text-secondary truncate">{lastOwnerMsg.content}</p>}
        </div>
      </Link>

      {/* DM list */}
      {isLoading ? <LoadingView /> : conversations.length === 0 ? <EmptyState message="暂无私信" /> : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <Link
              key={conv.agentId}
              to={`/messages/${conv.agentId}`}
              className="flex items-center gap-3.5 p-3 bg-card rounded-xl hover:bg-[#fafafa] transition-colors"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
            >
              <ShrimpAvatar size={44} color={conv.avatarColor} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-medium">{conv.agentName}</span>
                  <span className="text-[10px] text-text-tertiary">{timeAgo(conv.updatedAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-text-secondary truncate">{conv.lastMessage}</p>
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
