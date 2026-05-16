"""
main.py — FastAPI server for OpenAudit-Reasoner v2
Supports:
  - POST /api/reason         → full parallel multi-agent run + evaluation
  - GET  /api/reason/stream  → Server-Sent Events for live step updates
  - GET  /api/agents         → list of available agent personas
  - GET  /api/health         → Ollama connectivity check
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional
import asyncio
import json
import httpx
import os
from dotenv import load_dotenv

from agents import AGENTS, AGENT_PERSONAS, run_agent
from evaluator import evaluate_all

load_dotenv()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
MODEL_NAME = os.getenv("MODEL_NAME", "llama3")

app = FastAPI(
    title="OpenAudit-Reasoner v2",
    description="Multi-agent LLM reasoning orchestrator with LangChain ReAct agents",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response Models ─────────────────────────────────────────────────

class ReasonRequest(BaseModel):
    prompt: str = Field(..., min_length=3, max_length=2000)
    agents: Optional[List[str]] = None   # subset of agent keys; None = all
    model: str = MODEL_NAME
    run_verifier: bool = True


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    """Check Ollama connectivity and list available models."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            models = [m["name"] for m in resp.json().get("models", [])]
        return {"status": "ok", "ollama": True, "models": models}
    except Exception as e:
        return {"status": "degraded", "ollama": False, "error": str(e)}


@app.get("/api/agents")
async def list_agents():
    """Return all agent persona definitions."""
    return {"agents": list(AGENT_PERSONAS.values())}


@app.post("/api/reason")
async def reason(req: ReasonRequest):
    """
    Full multi-agent reasoning run.
    Runs selected agents in parallel, then runs evaluation suite.
    """
    agents_to_run = req.agents or AGENTS

    # Validate agent keys
    invalid = [a for a in agents_to_run if a not in AGENT_PERSONAS]
    if invalid:
        raise HTTPException(400, f"Unknown agents: {invalid}")

    # Run all agents in parallel
    tasks = [run_agent(agent_key, req.prompt, req.model) for agent_key in agents_to_run]
    agent_results = await asyncio.gather(*tasks)

    # Run evaluation suite
    evaluation = await evaluate_all(req.prompt, list(agent_results), req.model)

    return {
        "prompt": req.prompt,
        "model": req.model,
        "agents": list(agent_results),
        "evaluation": evaluation,
    }


@app.post("/api/reason/stream")
async def reason_stream(req: ReasonRequest):
    """
    SSE endpoint: streams agent results as they complete.
    Each agent runs in parallel; results are emitted as they finish.
    Frontend receives incremental updates.
    """
    agents_to_run = req.agents or AGENTS

    async def event_generator():
        # Emit start event
        yield f"data: {json.dumps({'type': 'start', 'agents': agents_to_run})}\n\n"

        # Run agents concurrently, yield each as it finishes
        async def run_and_emit(agent_key):
            result = await run_agent(agent_key, req.prompt, req.model)
            return result

        tasks = {asyncio.create_task(run_and_emit(k)): k for k in agents_to_run}
        completed_results = []

        for coro in asyncio.as_completed(list(tasks.keys())):
            result = await coro
            completed_results.append(result)
            yield f"data: {json.dumps({'type': 'agent_done', 'result': result})}\n\n"

        # All agents done — run evaluation
        yield f"data: {json.dumps({'type': 'evaluating'})}\n\n"

        evaluation = await evaluate_all(req.prompt, completed_results, req.model)

        yield f"data: {json.dumps({'type': 'evaluation_done', 'evaluation': evaluation})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
