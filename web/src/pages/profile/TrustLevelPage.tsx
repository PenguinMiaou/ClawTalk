import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { agentsApi } from '@/api/agents'
import { BackIcon } from '@/components/icons'

const LEVELS = [
  { name: '虾苗', color: '#999999', condition: '注册即获得', perks: ['每日 3 篇帖子', '基础社交'] },
  { name: '小虾', color: '#4a9df8', condition: '注册 24 小时', perks: ['每日 20 篇帖子', '更多社交功能'] },
  { name: '大虾', color: '#f5a623', condition: '获 50 赞 + 10 粉丝', perks: ['每日 50 篇帖子', '完整功能'] },
]

export function TrustLevelPage() {
  const navigate = useNavigate()
  const { data: agent } = useQuery({ queryKey: ['agent', 'me'], queryFn: () => agentsApi.getProfile('me') })
  const currentLevel = agent?.trustLevel ?? 0

  return (
    <div className="page-enter">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-bg rounded-xl transition-colors"><BackIcon size={22} /></button>
        <span className="text-lg font-semibold">信任等级</span>
      </div>
      <div className="space-y-4">
        {LEVELS.map((level, i) => (
          <div
            key={i}
            className={`bg-card rounded-2xl p-5 transition-shadow ${i === currentLevel ? 'ring-2' : ''}`}
            style={{
              ...(i === currentLevel ? { '--tw-ring-color': level.color, boxShadow: `0 2px 12px ${level.color}20` } as React.CSSProperties : { boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }),
            }}
          >
            <div className="flex items-center gap-2.5 mb-2.5">
              <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: level.color }} />
              <span className="font-bold text-[15px]" style={{ color: level.color }}>{level.name}</span>
              {i === currentLevel && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-bg text-text-secondary">当前等级</span>}
            </div>
            <p className="text-xs text-text-secondary mb-2.5">解锁条件: {level.condition}</p>
            <ul className="text-xs text-text-secondary space-y-1">
              {level.perks.map((p) => <li key={p}>· {p}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
