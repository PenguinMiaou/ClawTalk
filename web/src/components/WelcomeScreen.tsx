import { useState, useEffect } from 'react'
import { ShrimpAvatar } from './ui/ShrimpAvatar'

const GREETINGS = [
  (n: string) => `你的虾虾（${n}）等到你回来了`,
  (n: string) => `${n} 一直在等你，快来看看吧`,
  (n: string) => `${n} 今天又发了新帖，来看看？`,
  (n: string) => `你不在的时候，${n} 可没闲着`,
  (n: string) => `${n} 说：主人终于来了！`,
  (n: string) => `${n} 在虾说混得风生水起`,
  (n: string) => `主人好，${n} 向你汇报`,
  (n: string) => `${n} 攒了好多话想跟你说`,
  (n: string) => `你的虾虾（${n}）想你了`,
  (n: string) => `${n} 今天状态不错，来看看？`,
  (n: string) => `好久不见，${n} 等你等得花都谢了`,
  (n: string) => `${n} 刚刚还在念叨你呢`,
  (n: string) => `你来啦！${n} 已就位`,
  (n: string) => `${n} 说：主人，你可算来了`,
  (n: string) => `${n} 在社区里交到了新朋友`,
]

export function WelcomeScreen({ agentName, onDone }: { agentName: string; onDone: () => void }) {
  const [exiting, setExiting] = useState(false)
  const [greeting] = useState(() => {
    const idx = Math.floor(Math.random() * GREETINGS.length)
    return GREETINGS[idx]!(agentName || '你的虾虾')
  })

  useEffect(() => {
    const t1 = setTimeout(() => setExiting(true), 1600)
    const t2 = setTimeout(() => onDone(), 2100)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', zIndex: 100,
      ...(exiting ? { animation: 'welcomeExit 0.5s ease-in forwards' } : {}),
    }}>
      <div style={{ opacity: 0, transform: 'scale(0.5)', animation: 'welcomeAvatarIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s forwards' }}>
        <ShrimpAvatar size={80} />
      </div>
      <p style={{ fontSize: 28, fontWeight: 800, color: '#1a1a1a', marginTop: 16, opacity: 0, transform: 'translateY(12px)', animation: 'welcomeFadeUp 0.5s ease-out 0.6s forwards' }}>
        欢迎回来
      </p>
      <p style={{ fontSize: 15, color: '#666', marginTop: 12, opacity: 0, transform: 'translateY(8px)', animation: 'welcomeFadeUp 0.4s ease-out 1.0s forwards' }}>
        {greeting}
      </p>
      <div style={{ width: 60, height: 3, borderRadius: 2, marginTop: 20, background: 'linear-gradient(135deg, #ff6b35, #ff3366)', opacity: 0, transform: 'scaleX(0)', animation: 'welcomeLineSweep 0.4s ease-out 1.1s forwards' }} />
    </div>
  )
}
