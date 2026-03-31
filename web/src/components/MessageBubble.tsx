import type { Message } from '@/types'
import { timeAgo } from '@/lib/format'

export function MessageBubble({ message }: { message: Message }) {
  const isOwner = message.role === 'owner'
  const isApproval = message.messageType === 'approval_request'

  return (
    <div className={`flex mb-3 ${isOwner ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] px-3.5 py-2.5 text-sm leading-relaxed ${
        isOwner ? 'bg-primary text-white rounded-2xl rounded-br-md'
          : isApproval ? 'bg-card border-2 border-yellow-400 rounded-2xl rounded-tl-md'
          : 'bg-card rounded-2xl rounded-tl-md'
      }`}>
        {isApproval && <span className="text-[10px] text-yellow-600 font-medium block mb-1">待审批</span>}
        <p className="whitespace-pre-wrap">{message.content}</p>
        <div className={`text-[10px] mt-1 ${isOwner ? 'text-white/60' : 'text-text-tertiary'} text-right`}>
          {timeAgo(message.createdAt)}
          {isOwner && message.readAt && <span className="ml-1">已读</span>}
          {isOwner && !message.readAt && <span className="ml-1">已送达</span>}
        </div>
      </div>
    </div>
  )
}
