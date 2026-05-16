'use client'

import { VerifierData } from '@/lib/api'

const VERDICT_CONFIG = {
  Valid: { icon: '✓', color: '#00FF9D', bg: 'rgba(0,255,157,0.06)', bar: '#00FF9D' },
  'Needs Review': { icon: '⚠', color: '#FFB800', bg: 'rgba(255,184,0,0.06)', bar: '#FFB800' },
  Contradicted: { icon: '✗', color: '#FF4545', bg: 'rgba(255,69,69,0.06)', bar: '#FF4545' },
}

interface Props {
  verifier: VerifierData
  success: boolean
}

export default function VerifierPanel({ verifier, success }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-widest" style={{ color: '#3D5166' }}>
          ── verifier analysis
        </span>
        {!success && (
          <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ color: '#FFB800', background: 'rgba(255,184,0,0.08)' }}>
            ⚠ fallback mode
          </span>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono" style={{ color: '#8B949E' }}>overall confidence:</span>
          <span
            className="font-display text-sm font-bold"
            style={{
              color: verifier.overall_confidence >= 70 ? '#00FF9D'
                : verifier.overall_confidence >= 40 ? '#FFB800'
                : '#FF4545'
            }}
          >
            {verifier.overall_confidence}%
          </span>
        </div>
      </div>

      {/* Per-agent verdicts */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {verifier.verdicts.map(v => {
          const cfg = VERDICT_CONFIG[v.verdict] || VERDICT_CONFIG['Needs Review']
          return (
            <div
              key={v.agent}
              className="rounded-lg p-3 flex flex-col gap-2"
              style={{ background: cfg.bg, border: `1px solid ${cfg.color}25` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-widest" style={{ color: '#8B949E' }}>
                  {v.agent}
                </span>
                <span className="text-xs font-bold font-mono" style={{ color: cfg.color }}>
                  {cfg.icon} {v.verdict}
                </span>
              </div>

              {/* Strength bar */}
              <div className="h-1 rounded-full" style={{ background: '#1E2D3D' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${v.strength}%`, background: cfg.bar }}
                />
              </div>
              <span className="text-xs font-mono" style={{ color: '#3D5166' }}>
                strength: {v.strength}%
              </span>

              <p className="text-xs leading-relaxed" style={{ color: '#C9D1D9' }}>
                ↑ {v.key_insight}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: '#8B949E' }}>
                ↓ {v.weakness}
              </p>
            </div>
          )
        })}
      </div>

      {/* Consensus + Divergence */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded p-4" style={{ background: '#080C10', border: '1px solid #1E2D3D' }}>
          <div className="text-xs font-mono mb-2 uppercase tracking-widest" style={{ color: '#00FF9D' }}>
            ◆ consensus view
          </div>
          <p className="text-sm leading-relaxed" style={{ color: '#C9D1D9' }}>
            {verifier.consensus_view}
          </p>
        </div>
        <div className="rounded p-4" style={{ background: '#080C10', border: '1px solid #1E2D3D' }}>
          <div className="text-xs font-mono mb-2 uppercase tracking-widest" style={{ color: '#FF4545' }}>
            ◆ divergence points
          </div>
          <p className="text-sm leading-relaxed" style={{ color: '#C9D1D9' }}>
            {verifier.divergence_points}
          </p>
        </div>
      </div>

      {/* Recommended answer */}
      <div className="rounded p-4" style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.15)' }}>
        <div className="text-xs font-mono mb-2 uppercase tracking-widest" style={{ color: '#00D4FF' }}>
          ◆ recommended answer
        </div>
        <p className="text-sm leading-relaxed" style={{ color: '#C9D1D9' }}>
          {verifier.recommended_answer}
        </p>
      </div>
    </div>
  )
}
