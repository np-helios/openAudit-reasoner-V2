"""
agents.py — LangChain ReAct agents for OpenAudit-Reasoner v2
3-tier fallback: structured tool calling → text ReAct → plain LLM
"""

import time
import asyncio
import subprocess
import re

from langchain_core.tools import tool
from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage, AIMessage
from langchain_ollama import ChatOllama
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_community.utilities import WikipediaAPIWrapper
from langchain_community.tools import WikipediaQueryRun

AGENT_PERSONAS = {
    "fast": {
        "key": "fast", "label": "Fast", "color": "#F59E0B",
        "description": "Quick, decisive answers with minimal deliberation",
        "system": (
            "You are a fast, efficient AI agent. Answer quickly and decisively. "
            "Use tools only when strictly necessary. Prefer direct reasoning. "
            "Complete in as few steps as possible. At the end write CONFIDENCE: X% where X is 0-100."
        ),
        "temperature": 0.3,
    },
    "careful": {
        "key": "careful", "label": "Careful", "color": "#10B981",
        "description": "Methodical step-by-step reasoning, double-checks everything",
        "system": (
            "You are a careful, methodical AI agent. Think step by step. "
            "Verify your reasoning. Use tools to confirm facts before concluding. "
            "Never skip steps. At the end write CONFIDENCE: X% where X is 0-100."
        ),
        "temperature": 0.1,
    },
    "creative": {
        "key": "creative", "label": "Creative", "color": "#8B5CF6",
        "description": "Explores unconventional angles and novel framings",
        "system": (
            "You are a creative AI agent. Explore unconventional angles and unexpected framings. "
            "Reframe the question if there's a more interesting lens. "
            "Use analogies and lateral thinking. At the end write CONFIDENCE: X% where X is 0-100."
        ),
        "temperature": 0.9,
    },
    "critical": {
        "key": "critical", "label": "Critical", "color": "#EF4444",
        "description": "Finds flaws, edge cases, and challenges assumptions",
        "system": (
            "You are a critical AI agent. Find flaws, edge cases, and unstated assumptions. "
            "Challenge the question itself. Point out risks and uncertainties. "
            "Be skeptical of easy answers. At the end write CONFIDENCE: X% where X is 0-100."
        ),
        "temperature": 0.5,
    },
}

AGENTS = list(AGENT_PERSONAS.keys())

_search_run = DuckDuckGoSearchRun()
_wiki_api = WikipediaAPIWrapper(top_k_results=2, doc_content_chars_max=1000)
_wiki_run = WikipediaQueryRun(api_wrapper=_wiki_api)


def _clean_code(code: str) -> str:
    """Strip markdown fences from code before execution."""
    code = code.strip()
    
    code = re.sub(r'^```[a-zA-Z]*\n?', '', code)
    code = re.sub(r'\n?```$', '', code)
    code = code.strip()
    return code


@tool
def web_search(query: str) -> str:
    """Search the web for current information, recent news, or facts. Input must be a plain text search query."""
    try:
        return _search_run.run(query)
    except Exception as e:
        return f"Search error: {e}"


@tool
def wikipedia(query: str) -> str:
    """Look up encyclopedic, factual information from Wikipedia. Input must be a plain text topic name."""
    try:
        return _wiki_run.run(query)
    except Exception as e:
        return f"Wikipedia error: {e}"


@tool
def python_repl(code: str) -> str:
    """Run Python code for math and calculations. Input must be valid raw Python only — no markdown, no backticks. Example: print(2/3)"""
    try:
        clean = _clean_code(code)
        result = subprocess.run(
            ["python3", "-c", clean],
            capture_output=True, text=True, timeout=10
        )
        out = result.stdout.strip()
        err = result.stderr.strip()
        if err and not out:
            return f"Error: {err}"
        return out or "(no output)"
    except subprocess.TimeoutExpired:
        return "Error: code execution timed out"
    except Exception as e:
        return f"Error: {e}"


ALL_TOOLS = [web_search, wikipedia, python_repl]
TOOL_MAP = {t.name: t for t in ALL_TOOLS}


def _parse_tool_call_from_text(text: str):
    lines = text.strip().split("\n")
    tool_name = None
    tool_input = None
    for i, line in enumerate(lines):
        s = line.strip()
        if s.lower().startswith("action:"):
            tool_name = s.split(":", 1)[1].strip().lower().replace(" ", "_")
        if s.lower().startswith("action input:"):
            tool_input = s.split(":", 1)[1].strip()
            for j in range(i + 1, min(i + 4, len(lines))):
                nxt = lines[j].strip()
                if nxt and not nxt.lower().startswith(("thought:", "action:", "observation:", "final answer:")):
                    tool_input += " " + nxt
                else:
                    break
    if tool_name and tool_input and tool_name in TOOL_MAP:
        return tool_name, tool_input.strip()
    return None


def _extract_final_answer(text: str) -> str:
    lower = text.lower()
    if "final answer:" in lower:
        idx = lower.index("final answer:")
        return text[idx + len("final answer:"):].strip()
    lines = [l for l in text.split("\n")
             if not l.strip().lower().startswith(("thought:", "action:", "action input:", "observation:"))]
    return "\n".join(lines).strip() or text.strip()


def run_react_agent_sync(persona_key: str, user_prompt: str, model_name: str = "llama3") -> dict:
    persona = AGENT_PERSONAS[persona_key]
    start = time.time()

    REACT_SYSTEM = persona["system"] + """

You have access to these tools:
- web_search: Search the web for current facts or news. Input: plain text query.
- wikipedia: Look up encyclopedic information. Input: plain text topic.
- python_repl: Execute Python code for calculations. Input: raw Python code only, NO backticks.

Use this EXACT format when using a tool:
Thought: <your reasoning>
Action: <web_search | wikipedia | python_repl>
Action Input: <your input — for python_repl use raw Python like: print(2/3)>

When done, write:
Final Answer: <your complete answer>

End your answer with CONFIDENCE: X%"""

    def run_structured(llm_base):
        llm = llm_base.bind_tools(ALL_TOOLS)
        messages = [SystemMessage(content=persona["system"]), HumanMessage(content=user_prompt)]
        local_steps, local_tools = [], []
        for iteration in range(5):
            response = llm.invoke(messages)
            messages.append(response)
            tc_list = getattr(response, "tool_calls", []) or []
            if not tc_list:
                final = (response.content or "").strip()
                if not final:
                    return None
                local_steps.append({"type": "finish", "output": final})
                return {"steps": local_steps, "tool_calls": local_tools, "output": final}
            for tc in tc_list:
                tool_name = tc.get("name", "")
                tool_args = tc.get("args", {})
                tool_id = tc.get("id", f"call_{iteration}")
                if isinstance(tool_args, dict):
                    query = tool_args.get("query") or tool_args.get("code") or str(tool_args)
                else:
                    query = str(tool_args)
                tool_fn = TOOL_MAP.get(tool_name)
                observation = tool_fn.invoke(query) if tool_fn else f"Unknown tool: {tool_name}"
                if tool_fn:
                    local_tools.append(tool_name)
                thought = (response.content or "").strip() or f"Using {tool_name}…"
                local_steps.append({"type": "action", "thought": thought, "tool": tool_name,
                                     "tool_input": query, "observation": str(observation)[:600]})
                messages.append(ToolMessage(content=str(observation), tool_call_id=tool_id))
        final_resp = llm_base.invoke(messages + [HumanMessage(content="Please provide your final answer now.")])
        final = (final_resp.content or "").strip()
        local_steps.append({"type": "finish", "output": final})
        return {"steps": local_steps, "tool_calls": local_tools, "output": final}

    def run_text_react(llm_base):
        messages = [SystemMessage(content=REACT_SYSTEM), HumanMessage(content=f"Question: {user_prompt}")]
        local_steps, local_tools, accumulated = [], [], ""
        for iteration in range(5):
            response = llm_base.invoke(messages)
            text = (response.content or "").strip()
            accumulated += "\n" + text
            parsed = _parse_tool_call_from_text(accumulated)
            if parsed:
                tool_name, tool_input = parsed
                tool_fn = TOOL_MAP.get(tool_name)
                observation = tool_fn.invoke(tool_input) if tool_fn else f"Unknown tool: {tool_name}"
                if tool_fn:
                    local_tools.append(tool_name)
                thought = next(
                    (l.split(":", 1)[1].strip() for l in accumulated.split("\n")
                     if l.strip().lower().startswith("thought:")),
                    f"Using {tool_name}"
                )
                local_steps.append({"type": "action", "thought": thought, "tool": tool_name,
                                     "tool_input": tool_input, "observation": str(observation)[:600]})
                messages.append(AIMessage(content=text))
                messages.append(HumanMessage(content=f"Observation: {str(observation)[:600]}\nContinue."))
                accumulated = ""
                continue
            final = _extract_final_answer(text)
            if final:
                local_steps.append({"type": "finish", "output": final})
                return {"steps": local_steps, "tool_calls": local_tools, "output": final}
            messages.append(AIMessage(content=text))
            messages.append(HumanMessage(content="Continue. Write 'Final Answer:' when ready."))
        final = _extract_final_answer(accumulated or text)
        local_steps.append({"type": "finish", "output": final})
        return {"steps": local_steps, "tool_calls": local_tools, "output": final}

    def run_plain(llm_base):
        response = llm_base.invoke([SystemMessage(content=persona["system"]), HumanMessage(content=user_prompt)])
        output = (response.content or "").strip()
        return {"steps": [{"type": "finish", "output": output}], "tool_calls": [], "output": output}

    try:
        llm_base = ChatOllama(model=model_name, temperature=persona["temperature"], num_predict=1024)

        result = None
        try:
            result = run_structured(llm_base)
        except Exception as e:
            if any(k in str(e).lower() for k in ["tools", "400", "support", "status code", "function"]):
                result = None
            else:
                raise

        if not result or not result.get("output"):
            result = run_text_react(llm_base)

        if not result or not result.get("output"):
            result = run_plain(llm_base)

        steps = result["steps"]
        tool_calls_made = result["tool_calls"]
        final_output = result["output"]

        confidence = 60
        if "CONFIDENCE:" in final_output.upper():
            try:
                conf_str = final_output.upper().split("CONFIDENCE:")[-1].strip()
                digits = ''.join(filter(str.isdigit, conf_str.split("%")[0][:3]))
                if digits:
                    confidence = min(100, max(0, int(digits)))
            except Exception:
                pass

        elapsed = round(time.time() - start, 2)
        return {
            "agent": persona,
            "steps": steps,
            "output": final_output,
            "metrics": {
                "response_time": elapsed,
                "reasoning_depth": len([s for s in steps if s["type"] == "action"]),
                "tool_calls": tool_calls_made,
                "tool_count": len(tool_calls_made),
                "confidence": confidence,
                "error": None,
            }
        }

    except Exception as e:
        elapsed = round(time.time() - start, 2)
        return {
            "agent": AGENT_PERSONAS[persona_key],
            "steps": [{"type": "error", "output": str(e)}],
            "output": f"Agent error: {e}",
            "metrics": {"response_time": elapsed, "reasoning_depth": 0,
                        "tool_calls": [], "tool_count": 0, "confidence": 0, "error": str(e)}
        }


async def run_agent(persona_key: str, prompt: str, model_name: str = "llama3") -> dict:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, lambda: run_react_agent_sync(persona_key, prompt, model_name))
