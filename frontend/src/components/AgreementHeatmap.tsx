'use client'

import { AgreementMatrix } from '@/lib/api'

interface Props {
  matrix: AgreementMatrix
}

export default function AgreementHeatmap({ matrix }: Props) {
  const { labels, matrix: grid, avg_agreement, consensus_score } = matrix

  function cellColor(val: number, isDiag: boolean): string {
    if (isDiag) return 'rgba(0,212,255,0.15)'
    if (val >= 0.5) return `rgba(0,255,157,${0.1 + val * 0.5})`
    if (val >= 0.25) return `rgba(255,184,0,${0.1 + val * 0.4})`
    return `rgba(255,69,69,${0.08 + val * 0.3})`
  }

  function cellText(val: number, isDiag: boolean): string {
    if (isDiag) return '—'
    return (val * 100).toFixed(0) + '%'
  }

  function cellFg(val: number, isDiag: boolean): string {
    if (isDiag) return '#3D5166'
    if (val >= 0.5) return '#00FF9D'
    if (val >= 0.25) return '#FFB800'
    return '#FF4545'
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-widest" style={{ color: '#3D5166' }}>
          ── semantic agreement matrix
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono" style={{ color: '#8B949E' }}>consensus:</span>
          <span
            className="text-sm font-display font-bold"
            style={{ color: consensus_score >= 0.4 ? '#00FF9D' : consensus_score >= 0.2 ? '#FFB800' : '#FF4545' }}
          >
            {(consensus_score * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Matrix Grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-20" />
              {labels.map(l => (
                <th key={l} className="text-xs font-mono pb-2 text-center" style={{ color: '#8B949E' }}>
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, i) => (
              <tr key={i}>
                <td className="text-xs font-mono pr-3 py-1 text-right" style={{ color: '#8B949E' }}>
                  {labels[i]}
                </td>
                {row.map((val, j) => (
                  <td key={j} className="p-1">
                    <div
                      className="text-xs font-mono text-center py-2 rounded transition-colors"
                      style={{
                        background: cellColor(val, i === j),
                        color: cellFg(val, i === j),
                        minWidth: '56px',
                      }}
                    >
                      {cellText(val, i === j)}
                    </div>
                  </td>
                ))}
                <td className="pl-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${avg_agreement[i] * 100}px`,
                        background: avg_agreement[i] >= 0.4 ? '#00FF9D' : avg_agreement[i] >= 0.2 ? '#FFB800' : '#FF4545',
                        maxWidth: '80px',
                      }}
                    />
                    <span className="text-xs font-mono" style={{ color: '#3D5166' }}>
                      {(avg_agreement[i] * 100).toFixed(0)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs font-mono" style={{ color: '#3D5166' }}>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded" style={{ background: 'rgba(0,255,157,0.3)' }} />
          <span>High agreement ≥50%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded" style={{ background: 'rgba(255,184,0,0.3)' }} />
          <span>Partial 25–50%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded" style={{ background: 'rgba(255,69,69,0.3)' }} />
          <span>Diverged &lt;25%</span>
        </div>
      </div>
    </div>
  )
}
