from __future__ import annotations

import json
from typing import Any

import httpx

from .settings import settings


class LlamaClient:
    def __init__(self) -> None:
        self._timeout = httpx.Timeout(settings.llama_server_timeout_seconds)

    async def generate_json(self, system_prompt: str, user_prompt: str, max_tokens: int) -> dict:
        payload = {
            "model": settings.llama_server_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.2,
            "top_p": 0.9,
            "top_k": 40,
            "max_tokens": max_tokens,
        }

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(
                f"{settings.llama_server_url.rstrip('/')}/v1/chat/completions",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        content = _extract_content(data)
        parsed = _parse_json_from_text(content)
        if parsed is None:
            raise ValueError("Model response is not valid JSON")
        return parsed


class LocalLlamaCppClient:
    def __init__(self) -> None:
        if not settings.llama_cpp_model_path:
            raise ValueError("llama_cpp_model_path is not configured")

        try:
            from llama_cpp import Llama  # type: ignore
        except ImportError as exc:
            raise RuntimeError("llama-cpp-python is not installed") from exc

        self._llm = Llama(
            model_path=settings.llama_cpp_model_path,
            n_ctx=settings.llama_cpp_n_ctx,
            n_threads=settings.llama_cpp_n_threads,
            n_gpu_layers=settings.llama_cpp_n_gpu_layers,
        )

    async def generate_json(self, system_prompt: str, user_prompt: str, max_tokens: int) -> dict:
        result = self._llm.create_chat_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=max_tokens,
            temperature=0.2,
            top_p=0.9,
            top_k=40,
        )
        content = _extract_content(result)
        parsed = _parse_json_from_text(content)
        if parsed is None:
            raise ValueError("Local model response is not valid JSON")
        return parsed


class RemoteClient:
    def __init__(self) -> None:
        self._timeout = httpx.Timeout(settings.llama_server_timeout_seconds)

    async def generate_json(self, system_prompt: str, user_prompt: str, max_tokens: int) -> dict:
        if not settings.remote_llm_url:
            raise ValueError("Remote LLM URL not configured")

        payload = {
            "model": settings.remote_llm_model or settings.llama_server_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.2,
            "top_p": 0.9,
            "top_k": 40,
            "max_tokens": max_tokens,
        }

        headers = {}
        if settings.remote_llm_api_key:
            headers["Authorization"] = f"Bearer {settings.remote_llm_api_key}"

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(
                f"{settings.remote_llm_url.rstrip('/')}/v1/chat/completions",
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()

        content = _extract_content(data)
        parsed = _parse_json_from_text(content)
        if parsed is None:
            raise ValueError("Remote model response is not valid JSON")
        return parsed


def _extract_content(payload: dict) -> str:
    choices = payload.get("choices") or []
    if choices:
        message = choices[0].get("message") or {}
        content = message.get("content")
        if isinstance(content, str):
            return content
    return payload.get("output_text", "") or ""


def _parse_json_from_text(text: str) -> dict | None:
    if not text:
        return None
    stripped = text.strip()
    candidates = [stripped]

    if "```" in stripped:
        parts = stripped.split("```")
        if len(parts) >= 2:
            candidates.append(parts[1].strip())

    for candidate in candidates:
        parsed = _try_parse(candidate)
        if parsed is not None:
            return parsed
    return None


def _try_parse(text: str) -> dict | None:
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
        if isinstance(parsed, list) and parsed and isinstance(parsed[0], dict):
            return parsed[0]
    except json.JSONDecodeError:
        return None
    return None
