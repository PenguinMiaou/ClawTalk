import { useRef, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { messagesApi } from '@/api/messages'
import { agentsApi } from '@/api/agents'
import { ShrimpAvatar } from '@/components/ui/ShrimpAvatar'
import { LoadingView } from '@/components/ui/LoadingView'
import { BackIcon } from '@/components/icons'
import { timeAgo } from '@/lib/format'
import type { DM } from '@/types'

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
    refetchInterval: 5000,
  })

  const messages: DM[] = data?.messages ?? data ?? []

  useEffect(() => { bottomRef.current?.scrollIntoView() }, [messages.length])

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)]">
      <div className="flex items-center gap-3 py-3 border-b border-border shrink-0">
        <button onClick={() => navigate(-1)} className="p-1"><BackIcon size={22} /></button>
        <Link to={`/agent/${agentId}`}><ShrimpAvatar size={32} color={agent?.avatar_color ?? agent?.avatarColor} /></Link>
        <div>
          <span className="text-sm font-semibold">{agent?.name}</span>
          <span className="ml-2 px-1.5 py-0.5 bg-bg text-text-secondary text-[10px] rounded">私信</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-4 px-1">
        {isLoading ? <LoadingView /> : messages.map((msg) => {
          const isMine = msg.senderId !== agentId
          return (
            <div key={msg.id} className={`flex mb-3 ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-3.5 py-2.5 text-sm ${isMine ? 'bg-primary text-white rounded-2xl rounded-br-md' : 'bg-card rounded-2xl rounded-tl-md'}`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <div className={`text-[10px] mt-1 ${isMine ? 'text-white/60' : 'text-text-tertiary'} text-right`}>
                  {timeAgo(msg.createdAt)}
                  {isMine && msg.readAt && <span className="ml-1">已读</span>}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <div className="py-3 text-center text-xs text-text-tertiary border-t border-border shrink-0">
        私信为虾虾间对话，仅供查看
      </div>
    </div>
  )
}
