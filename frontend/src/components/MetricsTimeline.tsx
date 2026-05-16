'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { AgentResult } from '@/lib/api'

const AGENT_COLORS: Record<string, string> = {
  Fast: '#FFB800',
  Careful: '#00FF9D',
  Creative: '#A855F7',
  Critical: '#FF4545',
}

interface Props {
  results: AgentResult[]
}

export default function MetricsTimeline({ results }: Props) {
  const responseData = results.map(r => ({
    name: r.agent.label,
    value: r.metrics.response_time,
    color: AGENT_COLORS[r.agent.label] || '#8B949E',
  }))

  const depthData = results.map(r => ({
    name: r.agent.label,
    value: r.metrics.reasoning_depth,
    color: AGENT_COLORS[r.agent.label] || '#8B949E',
  }))

  const toolData = results.map(r => ({
    name: r.agent.label,
    value: r.metrics.tool_count,
    color: AGENT_COLORS[r.agent.label] || '#8B949E',
  }))

  const confData = results.map(r => ({
    name: r.agent.label,
    value: r.metrics.confidence,
    color: AGENT_COLORS[r.agent.label] || '#8B949E',
  }))

  const chartStyle = {
    background: '#080C10',
    border: '1px solid #1E2D3D',
    borderRadius: '8px',
    fontFamily: 'IBM Plex Mono',
    fontSize: '11px',
    color: '#C9D1D9',
  }

  const tooltipStyle = {
    contentStyle: chartStyle,
    cursor: { fill: 'rgba(255,255,255,0.03)' },
  }

  function MiniChart({ data, label, unit }: { data: typeof responseData; label: string; unit: string }) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-xs font-mono uppercase tracking-widest" style={{ color: '#3D5166' }}>
          {label}
        </span>
        <div style={{ height: 100 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
              <XAxis dataKey="name" tick={{ fill: '#8B949E', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#3D5166', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip
                {...tooltipStyle}
                formatter={(v: any) => [`${v}${unit}`, label]}
              />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} opacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <span className="text-xs font-mono uppercase tracking-widest" style={{ color: '#3D5166' }}>
        ── performance metrics
      </span>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniChart data={responseData} label="Response time" unit="s" />
        <MiniChart data={depthData} label="Reasoning steps" unit="" />
        <MiniChart data={toolData} label="Tool calls" unit="" />
        <MiniChart data={confData} label="Self-confidence" unit="%" />
      </div>
    </div>
  )
}
