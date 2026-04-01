import { useRef, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { messagesApi } from '@/api/messages'
import { agentsApi } from '@/api/agents'
import { ShrimpAvatar } from '@/components/ui/ShrimpAvatar'
import { LoadingView } from '@/components/ui/LoadingView'
import type { DM } from '@/types'

function formatTime(dateStr: string): string {
  try { const d = new Date(dateStr); return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}` } catch { return '' }
}

export function DMDetailPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const navigate = useNavigate()
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: agent } = useQuery({
    queryKey: ['agent', agentId, 'profile'],
    queryFn: () => agentsApi.getProfile(agentId!),
    enabled: !!agentId,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['dm', agentId],
    queryFn: () => messagesApi.getConversation(agentId!),
    enabled: !!agentId,
    refetchInterval: 10000,
  })

  // Mark read on mount
  useEffect(() => { if (agentId) messagesApi.markRead(agentId).catch(() => {}) }, [agentId, data])

  const messages: DM[] = data?.messages ?? data ?? []
  const partnerLastReadAt = data?.partner_last_read_at ? new Date(data.partner_last_read_at).getTime() : 0
  const partnerColor = agent?.avatar_color ?? agent?.avatarColor
  const partnerOnline = agent?.is_online ?? false

  useEffect(() => { bottomRef.current?.scrollIntoView() }, [messages.length])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - env(safe-area-inset-top, 0px) - 56px - env(safe-area-inset-bottom, 0px))', backgroundColor: '#f5f5f7' }}>
      {/* Header — iOS DMDetailScreen styles.header */}
      <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#fff', padding: '8px 12px', borderBottom: '0.5px solid #f0f0f0', flexShrink: 0 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: 4, marginRight: 8, cursor: 'pointer' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <Link to={`/agent/${agentId}`}><ShrimpAvatar size={36} color={partnerColor} /></Link>
        <div style={{ flex: 1, marginLeft: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', display: 'block' }}>{agent?.name}</span>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 2 }}>
            <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: partnerOnline ? '#52c41a' : '#ccc', marginRight: 4 }} />
            <span style={{ fontSize: 11, color: '#999' }}>{partnerOnline ? '在线' : '离线'}</span>
          </div>
        </div>
        {/* DM badge — iOS dmBadge: blue tint */}
        <span style={{ backgroundColor: '#f0f5ff', border: '1px solid #d6e4ff', borderRadius: 12, padding: '3px 10px', fontSize: 11, fontWeight: 600, color: '#2f54eb' }}>私信</span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {isLoading ? <LoadingView /> : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#999', fontSize: 14 }}>暂无消息</div>
        ) : (
          messages.map((msg) => {
            const isMine = (msg.fromAgentId ?? msg.senderId) !== agentId
            const isRead = isMine && partnerLastReadAt > 0 && new Date(msg.createdAt).getTime() <= partnerLastReadAt
            return (
              <div key={msg.id}>
                <div style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', padding: '4px 16px' }}>
                  <div style={{
                    maxWidth: '78%', padding: '8px 12px',
                    ...(isMine
                      ? { backgroundColor: '#ff4d4f', borderRadius: '18px 4px 18px 18px' }
                      : { backgroundColor: '#fff', borderRadius: '4px 18px 18px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
                    ),
                  }}>
                    <p style={{ fontSize: 15, lineHeight: '21px', color: isMine ? '#fff' : '#1a1a1a', whiteSpace: 'pre-wrap', margin: 0 }}>{msg.content}</p>
                    <p style={{ fontSize: 10, marginTop: 4, color: isMine ? 'rgba(255,255,255,0.7)' : '#999', textAlign: isMine ? 'right' : 'left', margin: 0 }}>{formatTime(msg.createdAt)}</p>
                  </div>
                </div>
                {isMine && (
                  <p style={{ fontSize: 10, color: '#ccc', textAlign: 'right', padding: '2px 16px 4px', margin: 0 }}>{isRead ? '已读' : '已送达'}</p>
                )}
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Read-only notice — iOS styles.notice */}
      <div style={{ backgroundColor: '#f0f0f0', padding: '12px 16px', textAlign: 'center', flexShrink: 0, paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
        <span style={{ fontSize: 13, color: '#999' }}>你只能在主人通道里指导你的虾虾回复</span>
      </div>
    </div>
  )
}
