"""
evaluator.py — Advanced evaluation engine for OpenAudit-Reasoner v2

Computes:
- Agreement matrix (semantic similarity between agent outputs)
- Per-agent confidence scores
- Verifier critique (5th LangChain agent)
- Reasoning quality scores
- Tool usage diversity
"""

import re
import asyncio
import numpy as np
from typing import List, Dict, Any

from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage


# ── Simple Similarity (no heavy embeddings needed for local demo) ─────────────

def jaccard_similarity(text1: str, text2: str) -> float:
    """Token-level Jaccard similarity between two texts."""
    set1 = set(text1.lower().split())
    set2 = set(text2.lower().split())
    if not set1 or not set2:
        return 0.0
    intersection = set1 & set2
    union = set1 | set2
    return round(len(intersection) / len(union), 3)


def build_agreement_matrix(agent_results: List[Dict]) -> Dict:
    """
    Build NxN similarity matrix between all agent outputs.
    Returns matrix + per-agent average agreement score.
    """
    outputs = [r["output"] for r in agent_results]
    labels = [r["agent"]["label"] for r in agent_results]
    n = len(outputs)

    matrix = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i == j:
                matrix[i][j] = 1.0
            else:
                matrix[i][j] = jaccard_similarity(outputs[i], outputs[j])

    # Average agreement per agent (excluding self)
    avg_agreement = []
    for i in range(n):
        others = [matrix[i][j] for j in range(n) if j != i]
        avg_agreement.append(round(sum(others) / len(others), 3) if others else 0.0)

    # Overall consensus score
    off_diag = [matrix[i][j] for i in range(n) for j in range(n) if i != j]
    consensus = round(sum(off_diag) / len(off_diag), 3) if off_diag else 0.0

    return {
        "labels": labels,
        "matrix": matrix,
        "avg_agreement": avg_agreement,
        "consensus_score": consensus,
    }


def score_reasoning_quality(agent_result: Dict) -> Dict:
    """
    Heuristic reasoning quality metrics per agent.
    """
    steps = agent_result["steps"]
    output = agent_result["output"]
    metrics = agent_result["metrics"]

    # Depth score: more ReAct steps = more thorough (up to a ceiling)
    depth_score = min(100, metrics["reasoning_depth"] * 20)

    # Tool diversity: reward using different tools
    unique_tools = len(set(metrics["tool_calls"]))
    tool_diversity_score = min(100, unique_tools * 33)

    # Output length as proxy for thoroughness
    words = len(output.split())
    length_score = min(100, int(words / 2))

    # Coherence: check if final answer references tool observations
    observations = [s.get("observation", "") for s in steps if s.get("type") == "action"]
    obs_text = " ".join(observations).lower()
    output_lower = output.lower()
    # Simple overlap check
    obs_words = set(obs_text.split())
    out_words = set(output_lower.split())
    coherence = round(len(obs_words & out_words) / max(len(obs_words), 1) * 100, 1) if obs_words else 50.0

    overall = round((
        depth_score * 0.3 +
        tool_diversity_score * 0.2 +
        length_score * 0.2 +
        metrics["confidence"] * 0.3
    ), 1)

    return {
        "depth_score": depth_score,
        "tool_diversity_score": tool_diversity_score,
        "length_score": length_score,
        "coherence_score": min(100.0, coherence),
        "confidence": metrics["confidence"],
        "overall": overall,
    }


async def run_verifier(prompt: str, agent_results: List[Dict], model_name: str = "llama3") -> Dict:
    """
    5th Verifier Agent: reads all outputs and produces structured critique.
    Returns per-agent verdict + overall recommendation.
    """
    summaries = "\n\n".join([
        f"[{r['agent']['label']} Agent]:\n{r['output'][:800]}"
        for r in agent_results
    ])

    verifier_prompt = f"""You are an impartial AI verifier reviewing responses from multiple agents.

Original Question: {prompt}

Agent Responses:
{summaries}

Analyze each agent response and provide a JSON evaluation. Respond ONLY with valid JSON in this exact format:
{{
  "verdicts": [
    {{
      "agent": "Fast",
      "verdict": "Valid|Needs Review|Contradicted",
      "strength": <0-100>,
      "key_insight": "<one sentence>",
      "weakness": "<one sentence>"
    }}
  ],
  "consensus_view": "<2-3 sentences summarizing where agents agree>",
  "divergence_points": "<2-3 sentences on where they disagree and why it matters>",
  "recommended_answer": "<which agent gave the most complete answer and why>",
  "overall_confidence": <0-100>
}}"""

    try:
        llm = ChatOllama(model=model_name, temperature=0.1, num_predict=1024)
        loop = asyncio.get_event_loop()

        response = await loop.run_in_executor(
            None,
            lambda: llm.invoke([
                SystemMessage(content="You are a precise evaluator. Always respond with valid JSON only."),
                HumanMessage(content=verifier_prompt)
            ])
        )

        raw = response.content.strip()
        # Strip markdown fences if present
        if raw.startswith("```"):
            raw = re.sub(r"^```[a-z]*\n?", "", raw)
            raw = re.sub(r"\n?```$", "", raw)

        import json
        parsed = json.loads(raw)
        return {"success": True, "data": parsed}

    except Exception as e:
        # Fallback verifier response
        return {
            "success": False,
            "error": str(e),
            "data": {
                "verdicts": [
                    {
                        "agent": r["agent"]["label"],
                        "verdict": "Valid" if not r["metrics"]["error"] else "Needs Review",
                        "strength": r["metrics"]["confidence"],
                        "key_insight": "Automated assessment only",
                        "weakness": "Verifier LLM call failed"
                    }
                    for r in agent_results
                ],
                "consensus_view": "Verifier analysis unavailable.",
                "divergence_points": "Manual review recommended.",
                "recommended_answer": "See agent outputs above.",
                "overall_confidence": 50,
            }
        }


async def evaluate_all(prompt: str, agent_results: List[Dict], model_name: str = "llama3") -> Dict:
    """
    Master evaluation function — runs all evaluation modules.
    """
    # These are all fast/local computations
    agreement = build_agreement_matrix(agent_results)

    quality_scores = [
        {
            "agent": r["agent"]["label"],
            "scores": score_reasoning_quality(r)
        }
        for r in agent_results
    ]

    # Verifier runs as LLM call
    verifier = await run_verifier(prompt, agent_results, model_name)

    return {
        "agreement_matrix": agreement,
        "quality_scores": quality_scores,
        "verifier": verifier["data"],
        "verifier_success": verifier["success"],
    }
