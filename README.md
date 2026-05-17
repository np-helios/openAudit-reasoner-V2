# OpenAudit-Reasoner v2 🔍🤖

**Multi-agent LLM reasoning orchestrator — built with LangChain ReAct agents, FastAPI, and Next.js.**

> *Not just what agents answer — but how, why, and where they disagree.*

---

## What's Different in v2

| | v1 | v2 |
|---|---|---|
| Agent architecture | System prompts only | **LangChain ReAct loops** (Thought→Action→Observation→Answer) |
| Chain-of-thought | Hardcoded stub | **Live step capture** from real reasoning |
| Tools | None | **Web search, Wikipedia, Python REPL** |
| Verifier | Always "Valid" | **5th LLM agent** with structured critique |
| Streaming | No | **SSE streaming** — agents appear as they finish |
| Evaluation | None | **Agreement matrix, radar chart, quality scores** |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Next.js Frontend                  │
│  Sidebar │ Agent Cards (live ReAct trace) │ Eval tab│
└──────────────────────┬──────────────────────────────┘
                       │ SSE / POST
┌──────────────────────▼──────────────────────────────┐
│                  FastAPI Backend                    │
│  /api/reason/stream → asyncio.gather(4 agents)      │
│  /api/agents        → persona definitions           │
│  /api/health        → Ollama connectivity           │
└──────────────────────┬──────────────────────────────┘
                       │ LangChain ReAct
┌──────────────────────▼──────────────────────────────┐
│              4 LangChain ReAct Agents               │
│   Fast   Careful   Creative   Critical              │
│  Tools: web_search · wikipedia · python_repl        │
└──────────────────────┬──────────────────────────────┘
                       │ ChatOllama
┌──────────────────────▼──────────────────────────────┐
│           Ollama (local, llama3 or any model)       │
└─────────────────────────────────────────────────────┘
```

---

## Evaluation Dashboard

After all agents finish, a **5th Verifier Agent** runs and the frontend shows:

1. **Performance Metrics** — response time, reasoning depth, tool calls, self-confidence (bar charts)
2. **Agreement Matrix** — NxN heatmap of semantic similarity between agent outputs
3. **Quality Radar** — per-agent radar chart across: Depth · Tool Use · Verbosity · Coherence · Confidence
4. **Verifier Panel** — per-agent verdict (Valid / Needs Review / Contradicted), consensus view, divergence points, recommended answer

---

## Quick Start

### 1. Prerequisites

- Python 3.10+
- Node.js 18+
- [Ollama](https://ollama.com) installed and running

```bash
ollama pull llama3
ollama serve
```

### 2. Clone

```bash
git clone https://github.com/np-helios/openAudit-reasoner-V2.git
cd openAudit-reasoner-V2
```

### 3. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**

---

## Configuration

Edit `backend/.env`:

```env
OLLAMA_BASE_URL=http://localhost:11434
MODEL_NAME=llama3
```

Any Ollama-compatible model works: `mistral`, `mixtral`, `phi3`, `qwen2`, etc.

---

## Agent Personas

Each agent is a **LangChain ReAct executor** with distinct system prompt + temperature:

| Agent | Temperature | Behaviour |
|---|---|---|
|  Fast | 0.3 | Minimal steps, direct answers |
|  Careful | 0.1 | Methodical, verifies everything |
|  Creative | 0.9 | Reframes problems, lateral thinking |
|  Critical | 0.5 | Finds flaws, surfaces edge cases |

All agents share the same tool set:
- `web_search` — DuckDuckGo real-time search
- `wikipedia` — encyclopedic lookup
- `python_repl` — calculations and code execution

---

## Project Structure

```
openaudit-v2/
├── backend/
│   ├── main.py          # FastAPI routes + SSE streaming
│   ├── agents.py        # LangChain ReAct agent definitions
│   ├── evaluator.py     # Agreement matrix, quality scores, verifier
│   ├── requirements.txt
│   └── .env
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx         # Main orchestration page
    │   │   ├── layout.tsx
    │   │   └── globals.css
    │   ├── components/
    │   │   ├── Sidebar.tsx          # Agent selector + prompt input
    │   │   ├── AgentCard.tsx        # Live ReAct trace display
    │   │   ├── AgentSkeleton.tsx    # Loading state
    │   │   ├── AgreementHeatmap.tsx # NxN similarity matrix
    │   │   ├── QualityRadar.tsx     # Recharts radar
    │   │   ├── VerifierPanel.tsx    # Verifier results
    │   │   └── MetricsTimeline.tsx  # Bar charts
    │   └── lib/
    │       └── api.ts           # TypeScript API client + SSE
    ├── next.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## Extending

**Add a new agent persona** — edit `backend/agents.py`, add to `AGENT_PERSONAS` dict.

**Add a new tool** — add a `Tool(...)` in `build_tools()` in `agents.py`.

**Persistent audit logs** — add SQLite/Postgres logging in `main.py` after `evaluate_all()`.

**Switch to cloud LLM** — replace `ChatOllama` with `ChatAnthropic` or `ChatOpenAI` in `agents.py`.

---

## Tech Stack

- **LangChain** — ReAct agent framework, tool abstraction
- **FastAPI** — async backend, SSE streaming
- **Ollama** — local LLM serving
- **Next.js 14** — App Router, TypeScript
- **Recharts** — radar and bar charts
- **Tailwind CSS** — utility styling
- **Framer Motion** — animations
