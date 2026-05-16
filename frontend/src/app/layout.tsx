import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OpenAudit Reasoner v2 | Multi-Agent LLM Orchestrator',
  description: 'Transparent, auditable AI reasoning via LangChain ReAct agents',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
