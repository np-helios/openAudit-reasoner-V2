'use client'

import { useEffect, useState, useRef } from 'react'
import {
  AgentPersona,
  AgentResult,
  Evaluation,
  StreamEvent,
  fetchAgents,
  fetchHealth,
  streamReason,
} from '@/lib/api'

import Sidebar from '@/components/Sidebar'
import AgentCard from '@/components/AgentCard'
import AgentSkeleton from '@/components/AgentSkeleton'
import AgreementHeatmap from '@/components/AgreementHeatmap'
import QualityRadar from '@/components/QualityRadar'
import VerifierPanel from '@/components/VerifierPanel'
import MetricsTimeline from '@/components/MetricsTimeline'

type Phase = 'idle' | 'running' | 'evaluating' | 'done'

export default function Home() {
  const [agents, setAgents] = useState<AgentPersona[]>([])
  const [health, setHealth] = useState<{ status: string; ollama: boolean; models?: string[] } | null>(null)

  const [phase, setPhase] = useState<Phase>('idle')
  const [pendingAgents, setPendingAgents] = useState<string[]>([])
  const [completedResults, setCompletedResults] = useState<AgentResult[]>([])
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [currentPrompt, setCurrentPrompt] = useState('')
  const [activeTab, setActiveTab] = useState<'agents' | 'eval'>('agents')

  const evalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchAgents().then(setAgents).catch(() => {
      // Fallback if backend not running
      setAgents([
        { key: 'fast', label: 'Fast', icon: '⚡', color: '#FFB800', description: 'Quick, decisive answers' },
        { key: 'careful', label: 'Careful', icon: '✅', color: '#00FF9D', description: 'Methodical reasoning' },
        { key: 'creative', label: 'Creative', icon: '🎨', color: '#A855F7', description: 'Unconventional angles' },
        { key: 'critical', label: 'Critical', icon: '🕵️', color: '#FF4545', description: 'Finds flaws' },
      ])
    })
    fetchHealth().then(setHealth).catch(() => setHealth({ status: 'unreachable', ollama: false }))
  }, [])

  async function handleSubmit(prompt: string, selectedAgents: string[], model: string) {
    setPhase('running')
    setCurrentPrompt(prompt)
    setPendingAgents(selectedAgents)
    setCompletedResults([])
    setEvaluation(null)
    setActiveTab('agents')

    try {
      await streamReason(prompt, selectedAgents, model, (event: StreamEvent) => {
        if (event.type === 'agent_done' && event.result) {
          setCompletedResults(prev => [...prev, event.result!])
          setPendingAgents(prev => prev.filter(k => k !== event.result!.agent.key))
        }
        if (event.type === 'evaluating') {
          setPhase('evaluating')
        }
        if (event.type === 'evaluation_done' && event.evaluation) {
          setEvaluation(event.evaluation)
          setPhase('done')
          setActiveTab('eval')
          setTimeout(() => evalRef.current?.scrollIntoView({ behavior: 'smooth' }), 200)
        }
      })
    } catch (err) {
      console.error('Stream error:', err)
      setPhase('done')
    }
  }

  const isRunning = phase === 'running' || phase === 'evaluating'

  // Build verdict lookup for agent cards
  const verdictMap: Record<string, any> = {}
  if (evaluation?.verifier?.verdicts) {
    evaluation.verifier.verdicts.forEach(v => {
      verdictMap[v.agent] = v
    })
  }
  const qualityMap: Record<string, any> = {}
  if (evaluation?.quality_scores) {
    evaluation.quality_scores.forEach(q => {
      qualityMap[q.agent] = q.scores
    })
  }

  return (
    <div className="flex min-h-screen grid-bg relative">
      {/* Vignette overlay */}
      <div className="vignette fixed inset-0 pointer-events-none z-0" />

      {/* Sidebar */}
      <div
        className="fixed left-0 top-0 h-screen z-20 overflow-y-auto border-r"
        style={{ background: '#080C10', borderColor: '#1E2D3D', width: 300 }}
      >
        {agents.length > 0 && (
          <Sidebar agents={agents} onSubmit={handleSubmit} isRunning={isRunning} />
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-h-screen" style={{ marginLeft: 300 }}>

        {/* Top bar */}
        <header
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b"
          style={{ background: 'rgba(8,12,16,0.95)', backdropFilter: 'blur(8px)', borderColor: '#1E2D3D' }}
        >
          <div className="flex items-center gap-4">
            {/* Status */}
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{
                  background: health?.ollama ? '#00FF9D' : '#FF4545',
                  boxShadow: health?.ollama ? '0 0 6px #00FF9D' : '0 0 6px #FF4545',
                }}
              />
              <span className="text-xs font-mono" style={{ color: '#8B949E' }}>
                Ollama {health?.ollama ? 'connected' : 'offline'}
              </span>
            </div>

            {health?.models && (
              <span className="text-xs font-mono" style={{ color: '#3D5166' }}>
                models: {health.models.join(', ')}
              </span>
            )}
          </div>

          {/* Phase indicator */}
          <div className="flex items-center gap-2">
            {phase === 'running' && (
              <span className="text-xs font-mono" style={{ color: '#00D4FF' }}>
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse" style={{ background: '#00D4FF' }} />
                {completedResults.length}/{completedResults.length + pendingAgents.length} agents done
              </span>
            )}
            {phase === 'evaluating' && (
              <span className="text-xs font-mono" style={{ color: '#A855F7' }}>
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse" style={{ background: '#A855F7' }} />
                verifier running…
              </span>
            )}
            {phase === 'done' && (
              <span className="text-xs font-mono" style={{ color: '#00FF9D' }}>
                ✓ analysis complete
              </span>
            )}
          </div>

          {/* Tab switcher */}
          {(completedResults.length > 0 || evaluation) && (
            <div className="flex gap-1">
              {(['agents', 'eval'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="text-xs font-mono px-3 py-1.5 rounded transition-all"
                  style={{
                    background: activeTab === tab ? '#1E2D3D' : 'transparent',
                    color: activeTab === tab ? '#C9D1D9' : '#3D5166',
                    border: `1px solid ${activeTab === tab ? '#3D5166' : 'transparent'}`,
                  }}
                >
                  {tab === 'agents' ? '◈ agents' : '◈ evaluation'}
                </button>
              ))}
            </div>
          )}
        </header>

        {/* Content area */}
        <main className="flex-1 p-6">

          {/* Idle state */}
          {phase === 'idle' && (
            <div className="flex flex-col items-center justify-center h-full min-h-96 gap-6 text-center">
              <div className="font-display text-4xl font-bold" style={{ color: '#1E2D3D' }}>
                ◈
              </div>
              <div>
                <div className="font-display text-lg mb-2" style={{ color: '#3D5166' }}>
                  Ready to reason
                </div>
                <div className="text-sm font-mono" style={{ color: '#1E2D3D' }}>
                  Enter a prompt and run analysis to see agents in action
                </div>
              </div>
            </div>
          )}

          {/* Current prompt display */}
          {currentPrompt && (
            <div
              className="mb-6 px-4 py-3 rounded-lg font-mono text-sm"
              style={{ background: '#0D1117', border: '1px solid #1E2D3D', color: '#8B949E' }}
            >
              <span style={{ color: '#3D5166' }}>prompt › </span>
              <span style={{ color: '#C9D1D9' }}>{currentPrompt}</span>
            </div>
          )}

          {/* AGENTS TAB */}
          {activeTab === 'agents' && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* Completed agents */}
              {completedResults.map(result => (
                <AgentCard
                  key={result.agent.key}
                  result={result}
                  verdict={verdictMap[result.agent.label] || null}
                  qualityScore={qualityMap[result.agent.label] || null}
                />
              ))}

              {/* Pending (loading) agents */}
              {pendingAgents.map(key => (
                <AgentSkeleton key={key} agentKey={key} />
              ))}
            </div>
          )}

          {/* EVALUATION TAB */}
          {activeTab === 'eval' && (
            <div ref={evalRef} className="flex flex-col gap-8 animate-fade-in">

              {/* No evaluation yet */}
              {!evaluation && phase === 'evaluating' && (
                <div className="flex items-center gap-3 font-mono text-sm" style={{ color: '#A855F7' }}>
                  <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: '#A855F7' }} />
                  Verifier agent is analyzing all outputs…
                </div>
              )}

              {evaluation && (
                <>
                  {/* Metrics timeline */}
                  {completedResults.length > 0 && (
                    <Section>
                      <MetricsTimeline results={completedResults} />
                    </Section>
                  )}

                  {/* Agreement matrix */}
                  <Section>
                    <AgreementHeatmap matrix={evaluation.agreement_matrix} />
                  </Section>

                  {/* Quality radar */}
                  {evaluation.quality_scores.length > 0 && (
                    <Section>
                      <QualityRadar qualityScores={evaluation.quality_scores} />
                    </Section>
                  )}

                  {/* Verifier */}
                  {evaluation.verifier && (
                    <Section>
                      <VerifierPanel verifier={evaluation.verifier} success={evaluation.verifier_success} />
                    </Section>
                  )}
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg p-5"
      style={{ background: '#0D1117', border: '1px solid #1E2D3D' }}
    >
      {children}
    </div>
  )
}
