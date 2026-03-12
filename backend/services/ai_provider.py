"""
Prashna-AI Multi-Provider AI Service
Fallback chain: OpenAI → Groq → Ollama
Automatically falls through to the next provider on failure.
"""

import json
import re
import logging
import httpx
from backend.config import settings

logger = logging.getLogger(__name__)

# ─── Provider Clients (lazy-loaded) ───

_openai_client = None
_groq_client = None


def _get_openai():
    global _openai_client
    if _openai_client is None and settings.OPENAI_API_KEY:
        from openai import OpenAI
        _openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _openai_client


def _get_groq():
    global _groq_client
    if _groq_client is None and settings.GROQ_API_KEY:
        from groq import Groq
        _groq_client = Groq(api_key=settings.GROQ_API_KEY)
    return _groq_client


# ─── Unified Chat Completion ───

def _clean_json(text: str) -> str:
    """Strip markdown code fences and whitespace from LLM output."""
    text = text.strip()
    text = re.sub(r"```json\s*", "", text)
    text = re.sub(r"```\s*", "", text)
    return text.strip()


def _call_openai(messages: list, temperature: float = 0.7, max_tokens: int = 4000) -> str:
    """Call OpenAI API."""
    client = _get_openai()
    if not client:
        raise RuntimeError("OpenAI not configured")
    
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content.strip()


def _call_groq(messages: list, temperature: float = 0.7, max_tokens: int = 4000) -> str:
    """Call Groq API (uses llama-3.3-70b-versatile)."""
    client = _get_groq()
    if not client:
        raise RuntimeError("Groq not configured")
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content.strip()


def _call_ollama(messages: list, temperature: float = 0.7, max_tokens: int = 4000) -> str:
    """Call local Ollama API (uses llama3.2 or any available model)."""
    base_url = settings.OLLAMA_BASE_URL
    
    # First check what models are available
    try:
        tags_resp = httpx.get(f"{base_url}/api/tags", timeout=5.0)
        if tags_resp.status_code != 200:
            raise RuntimeError("Ollama not running")
        
        models = tags_resp.json().get("models", [])
        if not models:
            raise RuntimeError("No Ollama models installed")
        
        # Prefer llama3.2, fall back to first available
        model_name = models[0]["name"]
        for m in models:
            if "llama" in m["name"].lower():
                model_name = m["name"]
                break
    except httpx.ConnectError:
        raise RuntimeError("Ollama not running — start it with 'ollama serve'")
    
    # Make the chat request
    response = httpx.post(
        f"{base_url}/api/chat",
        json={
            "model": model_name,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
        },
        timeout=120.0,  # Local models can be slow
    )
    
    if response.status_code != 200:
        raise RuntimeError(f"Ollama error: {response.status_code}")
    
    return response.json()["message"]["content"].strip()


# ─── Fallback Chain ───

PROVIDERS = [
    ("OpenAI", _call_openai),
    ("Groq", _call_groq),
    ("Ollama", _call_ollama),
]


def chat_completion(
    messages: list,
    temperature: float = 0.7,
    max_tokens: int = 4000,
) -> str:
    """
    Try each AI provider in order until one succeeds.
    Returns the raw text response from the first working provider.
    """
    errors = []
    
    for name, call_fn in PROVIDERS:
        try:
            logger.info(f"Trying {name}...")
            result = call_fn(messages, temperature, max_tokens)
            logger.info(f"✓ {name} succeeded")
            return result
        except Exception as e:
            error_msg = f"{name} failed: {str(e)}"
            logger.warning(error_msg)
            errors.append(error_msg)
            continue
    
    # All providers failed
    raise RuntimeError(
        "All AI providers failed:\n" + "\n".join(f"  - {e}" for e in errors)
    )


def chat_completion_json(
    messages: list,
    temperature: float = 0.7,
    max_tokens: int = 4000,
) -> dict:
    """
    Get a JSON response from the AI provider chain.
    Automatically cleans markdown fences and parses JSON.
    """
    raw = chat_completion(messages, temperature, max_tokens)
    cleaned = _clean_json(raw)
    return json.loads(cleaned)
