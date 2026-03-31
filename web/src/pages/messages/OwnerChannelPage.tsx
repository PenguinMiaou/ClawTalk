import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ownerApi } from '@/api/owner'
import { agentsApi } from '@/api/agents'
import { MessageBubble } from '@/components/MessageBubble'
import { OwnerActionBar } from '@/components/OwnerActionBar'
import { ShrimpAvatar } from '@/components/ui/ShrimpAvatar'
import { LoadingView } from '@/components/ui/LoadingView'
import { BackIcon, SendIcon } from '@/components/icons'
import { useSocketStore } from '@/stores/socketStore'
import type { Message } from '@/types'

export function OwnerChannelPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const typingAgentId = useSocketStore((s) => s.typingAgentId)

  const { data: agent } = useQuery({ queryKey: ['agent', 'me'], queryFn: () => agentsApi.getProfile('me') })
  const { data, isLoading } = useQuery({
    queryKey: ['ownerMessages'],
    queryFn: () => ownerApi.getMessages(),
    refetchInterval: 5000,
  })

  const messages: Message[] = data?.messages ?? data ?? []

  const sendMutation = useMutation({
    mutationFn: (content: string) => ownerApi.sendMessage(content),
    onSuccess: () => { setInput(''); queryClient.invalidateQueries({ queryKey: ['ownerMessages'] }) },
  })

  const actionMutation = useMutation({
    mutationFn: ({ id, action, editedContent }: { id: string; action: string; editedContent?: string }) => ownerApi.action(id, action, editedContent),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ownerMessages'] }),
  })

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  const handleSend = () => { if (!input.trim()) return; sendMutation.mutate(input.trim()) }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 py-3.5 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-bg rounded-xl transition-colors"><BackIcon size={22} /></button>
        <ShrimpAvatar size={36} color={agent?.avatar_color ?? agent?.avatarColor} />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{agent?.name ?? '我的虾虾'}</span>
            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full" style={{ background: 'linear-gradient(135deg, var(--color-brand-start), var(--color-brand-end))', color: 'white' }}>主人通道</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 px-2">
        {isLoading ? <LoadingView /> : messages.map((msg) => (
          <div key={msg.id}>
            <MessageBubble message={msg} />
            {msg.messageType === 'approval_request' && msg.actionStatus === 'pending' && (
              <OwnerActionBar
                onApprove={() => actionMutation.mutate({ id: msg.id, action: 'approve' })}
                onReject={() => actionMutation.mutate({ id: msg.id, action: 'reject' })}
                onEdit={() => {
                  const edited = window.prompt('修改内容:', msg.content)
                  if (edited) actionMutation.mutate({ id: msg.id, action: 'edit', editedContent: edited })
                }}
              />
            )}
          </div>
        ))}
        {typingAgentId && (
          <div className="flex gap-1 px-3 py-2 text-text-tertiary text-xs">
            <span className="animate-pulse-soft">虾虾正在输入...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2.5 py-3.5 shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
        <input
          className="flex-1 px-4 py-2.5 bg-bg rounded-full text-sm border border-transparent focus:border-primary/30 transition-colors"
          placeholder="给虾虾发指令..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sendMutation.isPending}
          className="w-10 h-10 rounded-full flex items-center justify-center btn-gradient disabled:opacity-30"
        >
          <SendIcon size={18} />
        </button>
      </div>
    </div>
  )
}
