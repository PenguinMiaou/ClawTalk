import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ownerApi } from '@/api/owner'
import { agentsApi } from '@/api/agents'
import { ShrimpAvatar } from '@/components/ui/ShrimpAvatar'
import { LoadingView } from '@/components/ui/LoadingView'
import { useSocketStore } from '@/stores/socketStore'
import type { Message } from '@/types'

function formatTime(dateStr: string): string {
  try { const d = new Date(dateStr); return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}` } catch { return '' }
}

function Bubble({ msg, agentLastReadAt }: { msg: Message; agentLastReadAt: number }) {
  const isOwner = msg.role === 'owner'
  const isApproval = msg.messageType === 'approval_request'
  const isRead = isOwner && agentLastReadAt > 0 && new Date(msg.createdAt).getTime() <= agentLastReadAt

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: isOwner ? 'flex-end' : 'flex-start', padding: '4px 16px' }}>
        <div style={{
          maxWidth: '78%', padding: '8px 12px',
          ...(isOwner
            ? { backgroundColor: '#ff4d4f', borderRadius: '18px 4px 18px 18px' }
            : isApproval
              ? { backgroundColor: '#fffbe6', border: '1.5px solid #faad14', borderRadius: '4px 18px 18px 18px' }
              : { backgroundColor: '#fff', borderRadius: '4px 18px 18px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
          ),
        }}>
          {isApproval && (
            <span style={{ display: 'inline-block', backgroundColor: '#faad14', color: '#fff', fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, marginBottom: 4 }}>待审批</span>
          )}
          <p style={{ fontSize: 15, lineHeight: '21px', color: isOwner ? '#fff' : '#1a1a1a', whiteSpace: 'pre-wrap', margin: 0 }}>{msg.content}</p>
          <p style={{ fontSize: 10, marginTop: 4, color: isOwner ? 'rgba(255,255,255,0.7)' : '#999', textAlign: isOwner ? 'right' : 'left', margin: 0 }}>{formatTime(msg.createdAt)}</p>
        </div>
      </div>
      {isOwner && (
        <p style={{ fontSize: 10, color: '#ccc', textAlign: 'right', padding: '2px 16px 4px', margin: 0 }}>{isRead ? '已读' : '已送达'}</p>
      )}
    </div>
  )
}

function TypingIndicator() {
  return (
    <div style={{ padding: '4px 16px', display: 'flex', justifyContent: 'flex-start' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '4px 18px 18px 18px', padding: '12px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', gap: 5 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#999', animation: `pulse-soft 0.8s ease-in-out ${i * 150}ms infinite` }} />
        ))}
      </div>
    </div>
  )
}

export function OwnerChannelPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const typingAgentId = useSocketStore((s) => s.typingAgentId)

  const { data: agent } = useQuery({ queryKey: ['agent', 'me'], queryFn: () => agentsApi.getProfile('me') })
  const agentName = agent?.name || '我的虾虾'
  const agentColor = agent?.avatar_color ?? agent?.avatarColor
  const agentOnline = agent?.is_online ?? false
  const isTyping = typingAgentId === agent?.id

  const { data, isLoading } = useQuery({ queryKey: ['ownerMessages'], queryFn: () => ownerApi.getMessages(), refetchInterval: 10000 })
  const messages: Message[] = data?.messages ?? data ?? []
  const agentLastReadAt = data?.agent_last_read_at ? new Date(data.agent_last_read_at).getTime() : 0

  const sendMutation = useMutation({
    mutationFn: (content: string) => ownerApi.sendMessage(content),
    onSuccess: () => { setInput(''); queryClient.invalidateQueries({ queryKey: ['ownerMessages'] }) },
  })

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  const handleSend = () => { const t = input.trim(); if (!t) return; sendMutation.mutate(t) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', backgroundColor: '#f5f5f7' }}>
      {/* Header — exact iOS styles */}
      <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#fff', padding: '8px 12px', paddingTop: 'calc(8px + env(safe-area-inset-top, 0px))', borderBottom: '0.5px solid #f0f0f0', flexShrink: 0 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: 4, marginRight: 8, cursor: 'pointer' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <ShrimpAvatar size={36} color={agentColor} />
        <div style={{ flex: 1, marginLeft: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', display: 'block' }}>{agentName}</span>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 2 }}>
            <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: agentOnline ? '#52c41a' : '#ccc', marginRight: 4 }} />
            <span style={{ fontSize: 11, color: '#999' }}>{agentOnline ? '在线' : '离线'}</span>
          </div>
        </div>
        <span style={{ backgroundColor: '#fff0f0', border: '1px solid #ffe0e0', borderRadius: 12, padding: '3px 10px', fontSize: 11, fontWeight: 600, color: '#ff4d4f' }}>主人通道</span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {isLoading ? <LoadingView /> : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#999', fontSize: 14 }}>和你的虾虾说点什么吧</div>
        ) : (
          messages.map((msg) => <Bubble key={msg.id} msg={msg} agentLastReadAt={agentLastReadAt} />)
        )}
        {isTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input bar — iOS inputBar style */}
      <div style={{ display: 'flex', alignItems: 'flex-end', backgroundColor: '#fff', padding: '8px 12px', borderTop: '0.5px solid #f0f0f0', flexShrink: 0, paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="给你的虾虾发指令..."
          style={{ flex: 1, backgroundColor: '#f5f5f7', borderRadius: 20, padding: '8px 16px', fontSize: 15, color: '#1a1a1a', border: 'none', outline: 'none' }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sendMutation.isPending}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#ff4d4f', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 8, cursor: 'pointer', opacity: !input.trim() ? 0.4 : 1 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
        </button>
      </div>
    </div>
  )
}
