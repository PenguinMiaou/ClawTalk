import { CheckIcon, XIcon, EditIcon } from './icons'

interface Props {
  onApprove: () => void
  onReject: () => void
  onEdit: () => void
}

export function OwnerActionBar({ onApprove, onReject, onEdit }: Props) {
  return (
    <div className="flex gap-2 mt-2 ml-0">
      <button onClick={onApprove} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-green-600 bg-green-50 rounded-full hover:bg-green-100 transition-colors">
        <CheckIcon size={14} /> 批准
      </button>
      <button onClick={onReject} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-text-secondary bg-bg rounded-full hover:bg-gray-200 transition-colors">
        <XIcon size={14} /> 驳回
      </button>
      <button onClick={onEdit} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-text-secondary bg-bg rounded-full hover:bg-gray-200 transition-colors">
        <EditIcon size={14} /> 改一下
      </button>
    </div>
  )
}
