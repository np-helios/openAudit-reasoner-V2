'use client'

const AGENT_COLORS: Record<string, string> = {
  fast: '#FFB800',
  careful: '#00FF9D',
  creative: '#A855F7',
  critical: '#FF4545',
}

const AGENT_ICONS: Record<string, string> = {
  fast: '⚡',
  careful: '✅',
  creative: '🎨',
  critical: '🕵️',
}

interface Props {
  agentKey: string
}

export default function AgentSkeleton({ agentKey }: Props) {
  const color = AGENT_COLORS[agentKey] || '#8B949E'
  const icon = AGENT_ICONS[agentKey] || '🤖'

  return (
    <div
      className="rounded-lg border overflow-hidden animate-pulse"
      style={{ borderColor: color + '30', background: '#0D1117' }}
    >
      <div className="h-0.5 w-1/3" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: '#1E2D3D' }}>
        <span className="text-lg">{icon}</span>
        <span className="font-display text-sm uppercase tracking-widest" style={{ color }}>
          {agentKey}
        </span>
        <span className="flex items-center gap-1 text-xs font-mono ml-2" style={{ color: '#8B949E' }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: color, animation: 'pulse 1s ease-in-out infinite' }} />
          thinking…
        </span>
      </div>

      <div className="px-4 py-4 flex flex-col gap-3">
        <div className="h-2 rounded" style={{ background: '#1E2D3D', width: '70%' }} />
        <div className="h-2 rounded" style={{ background: '#1E2D3D', width: '50%' }} />
        <div className="h-2 rounded" style={{ background: '#1E2D3D', width: '80%' }} />
        <div className="h-2 rounded" style={{ background: '#1E2D3D', width: '40%' }} />
        <div className="h-2 rounded mt-2" style={{ background: '#1E2D3D', width: '60%' }} />
        <div className="h-2 rounded" style={{ background: '#1E2D3D', width: '90%' }} />
      </div>
    </div>
  )
}
