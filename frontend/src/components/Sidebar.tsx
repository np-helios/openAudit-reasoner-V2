'use client'

import { useState } from 'react'
import { AgentPersona } from '@/lib/api'

const AGENT_COLORS: Record<string, string> = {
  fast: '#FFB800',
  careful: '#00FF9D',
  creative: '#A855F7',
  critical: '#FF4545',
}

interface Props {
  agents: AgentPersona[]
  onSubmit: (prompt: string, selectedAgents: string[], model: string) => void
  isRunning: boolean
}

const EXAMPLE_PROMPTS = [
  'Should hospitals rely on AI for triage decisions?',
  'Explain the Monty Hall problem and whether switching doors matters.',
  'What are the risks of open-sourcing frontier AI models?',
  'Calculate the compound interest on $10,000 at 7% over 20 years.',
]

export default function Sidebar({ agents, onSubmit, isRunning }: Props) {
  const [prompt, setPrompt] = useState('')
  const [selectedAgents, setSelectedAgents] = useState<string[]>(agents.map(a => a.key))
  const [model, setModel] = useState('llama3')

  function toggleAgent(key: string) {
    setSelectedAgents(prev =>
      prev.includes(key)
        ? prev.length > 1 ? prev.filter(k => k !== key) : prev
        : [...prev, key]
    )
  }

  function handleSubmit() {
    if (!prompt.trim() || isRunning) return
    onSubmit(prompt.trim(), selectedAgents, model)
  }

  return (
    <aside
      className="flex flex-col gap-5 h-full overflow-y-auto"
      style={{ minWidth: 280, maxWidth: 320 }}
    >
      {/* Logo */}
      <div className="pt-6 px-5">
        <div className="font-display text-xs tracking-widest uppercase mb-0.5" style={{ color: '#3D5166' }}>
          OpenAudit
        </div>
        <div className="font-display text-lg font-bold" style={{ color: '#00D4FF' }}>
          Reasoner<span style={{ color: '#3D5166' }}> v2</span>
        </div>
        <div className="text-xs font-mono mt-1" style={{ color: '#3D5166' }}>
          LangChain · ReAct · Ollama
        </div>
      </div>

      <div className="border-t" style={{ borderColor: '#1E2D3D' }} />

      {/* Agent selector */}
      <div className="px-5 flex flex-col gap-3">
        <span className="text-xs font-mono uppercase tracking-widest" style={{ color: '#3D5166' }}>
          ── agents
        </span>
        {agents.map(agent => {
          const color = AGENT_COLORS[agent.key] || agent.color
          const active = selectedAgents.includes(agent.key)
          return (
            <button
              key={agent.key}
              onClick={() => toggleAgent(agent.key)}
              className="flex items-start gap-3 p-3 rounded-lg text-left transition-all"
              style={{
                background: active ? color + '10' : '#0D1117',
                border: `1px solid ${active ? color + '40' : '#1E2D3D'}`,
                opacity: active ? 1 : 0.5,
              }}
            >
              <span className="text-base mt-0.5">{agent.icon}</span>
              <div>
                <div className="text-sm font-mono font-bold" style={{ color: active ? color : '#8B949E' }}>
                  {agent.label}
                </div>
                <div className="text-xs mt-0.5 leading-snug" style={{ color: '#3D5166' }}>
                  {agent.description}
                </div>
              </div>
              <div className="ml-auto mt-1">
                <div
                  className="w-3 h-3 rounded-full border transition-colors"
                  style={{
                    borderColor: active ? color : '#3D5166',
                    background: active ? color : 'transparent',
                    boxShadow: active ? `0 0 6px ${color}` : 'none',
                  }}
                />
              </div>
            </button>
          )
        })}
      </div>

      <div className="border-t" style={{ borderColor: '#1E2D3D' }} />

      {/* Model */}
      <div className="px-5 flex flex-col gap-2">
        <span className="text-xs font-mono uppercase tracking-widest" style={{ color: '#3D5166' }}>
          ── model
        </span>
        <input
          type="text"
          value={model}
          onChange={e => setModel(e.target.value)}
          placeholder="llama3"
          className="w-full font-mono text-sm px-3 py-2 rounded outline-none"
          style={{
            background: '#080C10',
            border: '1px solid #1E2D3D',
            color: '#C9D1D9',
          }}
        />
      </div>

      <div className="border-t" style={{ borderColor: '#1E2D3D' }} />

      {/* Prompt */}
      <div className="px-5 flex flex-col gap-3 flex-1">
        <span className="text-xs font-mono uppercase tracking-widest" style={{ color: '#3D5166' }}>
          ── prompt
        </span>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleSubmit() }}
          placeholder="Enter your question..."
          rows={5}
          className="w-full font-mono text-sm px-3 py-2 rounded outline-none resize-none leading-relaxed"
          style={{
            background: '#080C10',
            border: '1px solid #1E2D3D',
            color: '#C9D1D9',
          }}
        />

        {/* Example prompts */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-mono" style={{ color: '#3D5166' }}>try:</span>
          {EXAMPLE_PROMPTS.map((ex, i) => (
            <button
              key={i}
              onClick={() => setPrompt(ex)}
              className="text-left text-xs font-mono px-2 py-1.5 rounded transition-colors"
              style={{ color: '#8B949E', background: '#0D1117', border: '1px solid #1E2D3D' }}
            >
              {ex.length > 52 ? ex.slice(0, 52) + '…' : ex}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="px-5 pb-6">
        <button
          onClick={handleSubmit}
          disabled={!prompt.trim() || isRunning || selectedAgents.length === 0}
          className="w-full py-3 rounded-lg font-display text-sm font-bold tracking-widest uppercase transition-all"
          style={{
            background: isRunning ? '#1E2D3D' : 'linear-gradient(135deg, #00D4FF20, #00D4FF10)',
            border: `1px solid ${isRunning ? '#1E2D3D' : '#00D4FF50'}`,
            color: isRunning ? '#3D5166' : '#00D4FF',
            boxShadow: isRunning ? 'none' : '0 0 20px rgba(0,212,255,0.1)',
            cursor: isRunning || !prompt.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {isRunning ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: '#00D4FF' }} />
              running agents…
            </span>
          ) : (
            '▶ run analysis'
          )}
        </button>
        <div className="text-center text-xs font-mono mt-2" style={{ color: '#3D5166' }}>
          ⌘+Enter to submit
        </div>
      </div>
    </aside>
  )
}
