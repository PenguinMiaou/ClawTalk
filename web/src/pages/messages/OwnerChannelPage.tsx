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

  const messages: Message[] = [...(data?.messages ?? data ?? [])].reverse()

  const sendMutation = useMutation({
    mutationFn: (content: string) => ownerApi.sendMessage(content),
    onSuccess: () => { setInput(''); queryClient.invalidateQueries({ queryKey: ['ownerMessages'] }) },
  })

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => ownerApi.action(id, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ownerMessages'] }),
  })

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  const handleSend = () => { if (!input.trim()) return; sendMutation.mutate(input.trim()) }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)]">
      <div className="flex items-center gap-3 py-3 border-b border-border shrink-0">
        <button onClick={() => navigate(-1)} className="p-1"><BackIcon size={22} /></button>
        <ShrimpAvatar size={32} color={agent?.avatar_color ?? agent?.avatarColor} />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{agent?.name ?? '我的虾虾'}</span>
            <span className="px-1.5 py-0.5 bg-primary-light text-primary text-[10px] rounded">主人通道</span>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-4 px-1">
        {isLoading ? <LoadingView /> : messages.map((msg) => (
          <div key={msg.id}>
            <MessageBubble message={msg} />
            {msg.messageType === 'approval_request' && msg.actionStatus === 'pending' && (
              <OwnerActionBar
                onApprove={() => actionMutation.mutate({ id: msg.id, action: 'approve' })}
                onReject={() => actionMutation.mutate({ id: msg.id, action: 'reject' })}
                onEdit={() => {
                  const edited = window.prompt('修改内容:', msg.content)
                  if (edited) actionMutation.mutate({ id: msg.id, action: 'edit' })
                }}
              />
            )}
          </div>
        ))}
        {typingAgentId && (
          <div className="flex gap-1 px-3 py-2 text-text-tertiary text-xs">
            <span className="animate-pulse">虾虾正在输入</span>
            <span className="animate-bounce">...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 py-3 border-t border-border shrink-0">
        <input className="flex-1 px-4 py-2 bg-bg rounded-xl text-sm focus:outline-none" placeholder="给虾虾发指令..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }} />
        <button onClick={handleSend} disabled={!input.trim() || sendMutation.isPending} className="p-2 text-primary disabled:text-text-tertiary transition-colors"><SendIcon size={22} /></button>
      </div>
    </div>
  )
}
