const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface AgentPersona {
  key: string
  label: string
  icon: string
  color: string
  description: string
}

export interface ReasonStep {
  type: 'action' | 'finish' | 'error'
  thought?: string
  tool?: string
  tool_input?: string
  observation?: string
  output?: string
}

export interface AgentMetrics {
  response_time: number
  reasoning_depth: number
  tool_calls: string[]
  tool_count: number
  confidence: number
  error: string | null
}

export interface AgentResult {
  agent: AgentPersona
  steps: ReasonStep[]
  output: string
  metrics: AgentMetrics
}

export interface QualityScores {
  depth_score: number
  tool_diversity_score: number
  length_score: number
  coherence_score: number
  confidence: number
  overall: number
}

export interface VerifierVerdict {
  agent: string
  verdict: 'Valid' | 'Needs Review' | 'Contradicted'
  strength: number
  key_insight: string
  weakness: string
}

export interface VerifierData {
  verdicts: VerifierVerdict[]
  consensus_view: string
  divergence_points: string
  recommended_answer: string
  overall_confidence: number
}

export interface AgreementMatrix {
  labels: string[]
  matrix: number[][]
  avg_agreement: number[]
  consensus_score: number
}

export interface Evaluation {
  agreement_matrix: AgreementMatrix
  quality_scores: { agent: string; scores: QualityScores }[]
  verifier: VerifierData
  verifier_success: boolean
}

export interface ReasonResponse {
  prompt: string
  model: string
  agents: AgentResult[]
  evaluation: Evaluation
}

export interface StreamEvent {
  type: 'start' | 'agent_done' | 'evaluating' | 'evaluation_done' | 'done'
  agents?: string[]
  result?: AgentResult
  evaluation?: Evaluation
}

export async function fetchAgents(): Promise<AgentPersona[]> {
  const res = await fetch(`${API_BASE}/api/agents`)
  const data = await res.json()
  return data.agents
}

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/api/health`)
  return res.json()
}

export async function streamReason(
  prompt: string,
  agents: string[],
  model: string,
  onEvent: (event: StreamEvent) => void
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/reason/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, agents, model, run_verifier: true }),
  })

  if (!res.ok) throw new Error(`API error: ${res.status}`)
  if (!res.body) throw new Error('No response body')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const event: StreamEvent = JSON.parse(line.slice(6))
          onEvent(event)
        } catch (_) {}
      }
    }
  }
}
