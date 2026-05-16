'use client'

import { AgentResult } from '@/lib/api'
import { useState } from 'react'

const TOOL_COLORS: Record<string, string> = {
  web_search: '#00D4FF',
  wikipedia: '#A855F7',
  python_repl: '#00FF9D',
}

const TOOL_LABELS: Record<string, string> = {
  web_search: '🌐 Web',
  wikipedia: '📖 Wiki',
  python_repl: '🐍 Code',
}

const VERDICT_STYLE: Record<string, { color: string; bg: string }> = {
  Valid: { color: '#00FF9D', bg: 'rgba(0,255,157,0.08)' },
  'Needs Review': { color: '#FFB800', bg: 'rgba(255,184,0,0.08)' },
  Contradicted: { color: '#FF4545', bg: 'rgba(255,69,69,0.08)' },
}

interface Props {
  result: AgentResult
  verdict?: { verdict: string; strength: number; key_insight: string; weakness: string } | null
  qualityScore?: { depth_score: number; tool_diversity_score: number; confidence: number; overall: number } | null
  isLoading?: boolean
}

export default function AgentCard({ result, verdict, qualityScore, isLoading }: Props) {
  const [expanded, setExpanded] = useState(true)
  const { agent, steps, metrics } = result

  const actionSteps = steps.filter(s => s.type === 'action')
  const finishStep = steps.find(s => s.type === 'finish')
  const uniqueTools = [...new Set(metrics.tool_calls)]

  const agentColorMap: Record<string, string> = {
    fast: '#FFB800',
    careful: '#00FF9D',
    creative: '#A855F7',
    critical: '#FF4545',
  }
  const color = agentColorMap[agent.key] || agent.color

  return (
    <div
      className="rounded-lg border relative overflow-hidden flex flex-col"
      style={{
        borderColor: color + '40',
        background: '#0D1117',
        boxShadow: `0 0 24px ${color}10`,
      }}
    >
      {/* Top bar */}
      <div
        className="h-0.5 w-full"
        style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#1E2D3D' }}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{agent.icon}</span>
          <span className="font-display text-sm font-bold tracking-widest uppercase" style={{ color }}>
            {agent.label}
          </span>
          {isLoading && (
            <span className="flex items-center gap-1 text-xs font-mono" style={{ color: '#8B949E' }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
              running
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Tool badges */}
          {uniqueTools.map(t => (
            <span
              key={t}
              className="text-xs font-mono px-2 py-0.5 rounded"
              style={{ color: TOOL_COLORS[t], background: TOOL_COLORS[t] + '15', border: `1px solid ${TOOL_COLORS[t]}30` }}
            >
              {TOOL_LABELS[t] || t}
            </span>
          ))}

          {/* Response time */}
          <span className="text-xs font-mono" style={{ color: '#3D5166' }}>
            {metrics.response_time}s
          </span>

          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs font-mono px-2 py-1 rounded transition-colors"
            style={{ color: '#8B949E', background: '#1E2D3D' }}
          >
            {expanded ? '▲ collapse' : '▼ expand'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="flex flex-col gap-0 flex-1">
          {/* ReAct Steps */}
          {actionSteps.length > 0 && (
            <div className="px-4 py-3 border-b" style={{ borderColor: '#1E2D3D' }}>
              <div className="text-xs font-mono mb-2 tracking-widest uppercase" style={{ color: '#3D5166' }}>
                ── reasoning chain ({actionSteps.length} steps)
              </div>
              <div className="flex flex-col gap-2">
                {actionSteps.map((step, i) => (
                  <div key={i} className="step-reveal text-xs" style={{ animationDelay: `${i * 80}ms` }}>
                    {/* Thought */}
                    {step.thought && (
                      <div className="flex gap-2 mb-1">
                        <span className="font-mono shrink-0" style={{ color: '#3D5166' }}>
                          T{i + 1}›
                        </span>
                        <span className="font-mono" style={{ color: '#8B949E' }}>{step.thought}</span>
                      </div>
                    )}
                    {/* Action */}
                    {step.tool && (
                      <div className="flex gap-2 items-center mb-1 ml-4">
                        <span
                          className="font-mono px-1.5 py-0.5 rounded text-xs"
                          style={{
                            color: TOOL_COLORS[step.tool] || '#8B949E',
                            background: (TOOL_COLORS[step.tool] || '#8B949E') + '15',
                          }}
                        >
                          {TOOL_LABELS[step.tool] || step.tool}
                        </span>
                        <span className="font-mono truncate max-w-xs" style={{ color: '#C9D1D9' }}>
                          {step.tool_input}
                        </span>
                      </div>
                    )}
                    {/* Observation */}
                    {step.observation && (
                      <div
                        className="ml-4 font-mono p-2 rounded text-xs leading-relaxed"
                        style={{ background: '#080C10', color: '#8B949E', borderLeft: `2px solid ${color}30` }}
                      >
                        {step.observation.length > 200
                          ? step.observation.slice(0, 200) + '…'
                          : step.observation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Final Answer */}
          {finishStep && (
            <div className="px-4 py-3 border-b" style={{ borderColor: '#1E2D3D' }}>
              <div className="text-xs font-mono mb-2 tracking-widest uppercase" style={{ color: '#3D5166' }}>
                ── final answer
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#C9D1D9' }}>
                {finishStep.output}
              </p>
            </div>
          )}

          {/* Metrics Bar */}
          <div className="px-4 py-3 grid grid-cols-4 gap-3">
            <Metric label="Confidence" value={`${metrics.confidence}%`} color={color} />
            <Metric label="Depth" value={`${metrics.reasoning_depth} steps`} color={color} />
            <Metric label="Tools used" value={`${metrics.tool_count}`} color={color} />
            <Metric
              label="Quality"
              value={qualityScore ? `${qualityScore.overall.toFixed(0)}` : '—'}
              color={color}
              suffix="/100"
            />
          </div>

          {/* Verdict */}
          {verdict && (
            <div
              className="mx-4 mb-3 px-3 py-2 rounded text-xs font-mono flex items-start gap-3"
              style={{
                background: VERDICT_STYLE[verdict.verdict]?.bg || 'rgba(255,255,255,0.05)',
                border: `1px solid ${VERDICT_STYLE[verdict.verdict]?.color || '#8B949E'}30`,
              }}
            >
              <span
                className="font-bold shrink-0"
                style={{ color: VERDICT_STYLE[verdict.verdict]?.color || '#8B949E' }}
              >
                {verdict.verdict === 'Valid' ? '✓' : verdict.verdict === 'Needs Review' ? '⚠' : '✗'}{' '}
                {verdict.verdict}
              </span>
              <div className="flex flex-col gap-0.5">
                <span style={{ color: '#C9D1D9' }}>↑ {verdict.key_insight}</span>
                <span style={{ color: '#8B949E' }}>↓ {verdict.weakness}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Metric({ label, value, color, suffix }: { label: string; value: string; color: string; suffix?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-mono uppercase tracking-widest" style={{ color: '#3D5166' }}>
        {label}
      </span>
      <span className="text-sm font-display" style={{ color }}>
        {value}
        {suffix && <span style={{ color: '#3D5166' }}>{suffix}</span>}
      </span>
    </div>
  )
}
