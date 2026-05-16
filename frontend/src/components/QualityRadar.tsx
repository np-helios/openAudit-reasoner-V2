'use client'

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'

interface QualityEntry {
  agent: string
  scores: {
    depth_score: number
    tool_diversity_score: number
    length_score: number
    coherence_score: number
    confidence: number
    overall: number
  }
}

const AGENT_COLORS: Record<string, string> = {
  Fast: '#FFB800',
  Careful: '#00FF9D',
  Creative: '#A855F7',
  Critical: '#FF4545',
}

interface Props {
  qualityScores: QualityEntry[]
}

export default function QualityRadar({ qualityScores }: Props) {
  // Build recharts-compatible data
  const dimensions = [
    { key: 'depth_score', label: 'Depth' },
    { key: 'tool_diversity_score', label: 'Tool Use' },
    { key: 'length_score', label: 'Verbosity' },
    { key: 'coherence_score', label: 'Coherence' },
    { key: 'confidence', label: 'Confidence' },
  ]

  const radarData = dimensions.map(dim => {
    const entry: Record<string, any> = { dimension: dim.label }
    qualityScores.forEach(q => {
      entry[q.agent] = (q.scores as any)[dim.key]
    })
    return entry
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-widest" style={{ color: '#3D5166' }}>
          ── reasoning quality radar
        </span>
        <div className="flex items-center gap-3">
          {qualityScores.map(q => (
            <div key={q.agent} className="flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: AGENT_COLORS[q.agent] }}
              />
              <span className="text-xs font-mono" style={{ color: '#8B949E' }}>
                {q.agent}: {q.scores.overall.toFixed(0)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
            <PolarGrid stroke="#1E2D3D" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: '#8B949E', fontFamily: 'IBM Plex Mono', fontSize: 11 }}
            />
            {qualityScores.map(q => (
              <Radar
                key={q.agent}
                name={q.agent}
                dataKey={q.agent}
                stroke={AGENT_COLORS[q.agent]}
                fill={AGENT_COLORS[q.agent]}
                fillOpacity={0.08}
                strokeWidth={1.5}
              />
            ))}
            <Tooltip
              contentStyle={{
                background: '#0D1117',
                border: '1px solid #1E2D3D',
                borderRadius: '6px',
                fontFamily: 'IBM Plex Mono',
                fontSize: '12px',
                color: '#C9D1D9',
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Score table */}
      <div className="grid grid-cols-5 gap-2">
        {qualityScores.map(q => (
          <div
            key={q.agent}
            className="rounded p-2 text-center"
            style={{ background: '#080C10', border: `1px solid ${AGENT_COLORS[q.agent]}20` }}
          >
            <div className="text-xs font-mono mb-1" style={{ color: AGENT_COLORS[q.agent] }}>
              {q.agent}
            </div>
            <div className="text-lg font-display" style={{ color: AGENT_COLORS[q.agent] }}>
              {q.scores.overall.toFixed(0)}
            </div>
            <div className="text-xs font-mono" style={{ color: '#3D5166' }}>/100</div>
          </div>
        ))}
      </div>
    </div>
  )
}
