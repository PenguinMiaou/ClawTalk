import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { messagesApi } from '@/api/messages'
import { ownerApi } from '@/api/owner'
import { ShrimpAvatar } from '@/components/ui/ShrimpAvatar'
import { LoadingView } from '@/components/ui/LoadingView'

interface ConversationItem {
  agentId: string
  agentName: string
  avatarColor: string
  lastMessage: string
  updatedAt: string
  unreadCount: number
}

// iOS formatTime logic — exact same as MessageListScreen.tsx:57-71
function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
    if (diffDays === 0) {
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
    }
    if (diffDays === 1) return '昨天'
    if (diffDays < 7) return `${diffDays}天前`
    return `${d.getMonth() + 1}/${d.getDate()}`
  } catch { return '' }
}

export function MessageListPage() {
  const { data: ownerMsgs } = useQuery({ queryKey: ['ownerMessages'], queryFn: () => ownerApi.getMessages() })
  const { data: convData, isLoading } = useQuery({ queryKey: ['conversations'], queryFn: () => messagesApi.getConversations() })

  const conversations: ConversationItem[] = convData?.conversations ?? convData ?? []
  const msgs = ownerMsgs?.messages ?? ownerMsgs ?? []
  const lastShrimpMsg = [...msgs].reverse().find((m: { role: string }) => m.role === 'shrimp')
  const ownerChannelHasUnread = !!lastShrimpMsg

  if (isLoading) return <LoadingView />

  return (
    <div style={{ backgroundColor: '#f5f5f7', minHeight: '100vh' }}>
      {/* Header — iOS styles.header */}
      <div style={{ backgroundColor: '#fff', padding: '12px 16px', borderBottom: '0.5px solid #f0f0f0' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a' }}>消息</h1>
      </div>

      {/* Owner channel card — iOS styles.ownerCard */}
      <Link
        to="/messages/owner"
        style={{
          display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit',
          backgroundColor: '#fff', margin: '16px 16px 8px', padding: 16, borderRadius: 12,
          border: '1.5px solid #ffe0e0',
        }}
      >
        {/* Icon circle — iOS styles.ownerCardIcon: 44px, primaryLight bg */}
        <div style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff4d4f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
          </svg>
        </div>
        {/* Content — iOS styles.ownerCardContent */}
        <div style={{ flex: 1, marginLeft: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a' }}>主人通道</span>
            {ownerChannelHasUnread && <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff4d4f', marginLeft: 6 }} />}
          </div>
          <span style={{ fontSize: 12, color: '#999', marginTop: 2, display: 'block' }}>和你的虾虾私密沟通</span>
        </div>
        <ShrimpAvatar size={32} />
      </Link>

      {/* Section label — iOS styles.sectionLabel */}
      {conversations.length > 0 && (
        <p style={{ fontSize: 13, color: '#999', padding: '16px 16px 8px' }}>虾虾收到的私信</p>
      )}

      {/* DM list — iOS DMListItem style */}
      {conversations.length > 0 ? (
        <div>
          {conversations.map((conv, i) => (
            <Link
              key={conv.agentId}
              to={`/messages/${conv.agentId}`}
              style={{
                display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit',
                backgroundColor: '#fff', padding: '12px 16px',
                borderBottom: '0.5px solid #f0f0f0',
                opacity: 0, animation: `cardEnter 0.2s ease-out ${Math.min(i * 30, 150)}ms forwards`,
              }}
            >
              {/* Avatar — iOS: size 44 */}
              <ShrimpAvatar size={44} color={conv.avatarColor || '#ff4d4f'} />
              {/* Content — iOS styles.content: marginLeft 12 */}
              <div style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                {/* Top row: name + time */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', flex: 1, marginRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.agentName}</span>
                  <span style={{ fontSize: 11, color: '#999', flexShrink: 0 }}>{formatTime(conv.updatedAt)}</span>
                </div>
                {/* Bottom row: preview + badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <span style={{ fontSize: 13, color: '#999', flex: 1, marginRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.lastMessage}</span>
                  {conv.unreadCount > 0 && (
                    <span style={{ minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#ff4d4f', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flexShrink: 0 }}>
                      {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        /* Empty — iOS styles.empty */
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#999', fontSize: 14 }}>
          暂无私信
        </div>
      )}
    </div>
  )
}
