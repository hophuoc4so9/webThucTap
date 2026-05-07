from __future__ import annotations

import asyncio
import hashlib
import json
import time
from typing import Callable

from cachetools import TTLCache
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse

from .llama_client import LlamaClient, LocalLlamaCppClient, RemoteClient
from .models import (
    ApplicationFitRequest,
    CvSuggestionRequest,
    ErrorResponse,
    TaskCreateResponse,
    TaskStatusResponse,
    TaskType,
)
from .prompt import build_cv_prompt, build_fit_prompt
from .settings import settings
from .tasks import TaskQueue, TaskStore


app = FastAPI(title=settings.service_name)

_task_store = TaskStore()
_task_queue = TaskQueue()
_cache = TTLCache(maxsize=settings.cache_max_items, ttl=settings.cache_ttl_seconds)
_llama_client = LlamaClient()
_llama_cpp_client = None
if settings.llama_cpp_model_path:
    _llama_cpp_client = LocalLlamaCppClient()
_remote_client = RemoteClient()

_rate_limits: dict[str, list[float]] = {}
_rate_lock = asyncio.Lock()


@app.on_event("startup")
async def startup() -> None:
    for _ in range(settings.queue_concurrency):
        asyncio.create_task(_task_queue.worker(_task_store))


def _enforce_auth(x_api_key: str | None) -> None:
    if not settings.api_key:
        return
    if not x_api_key or x_api_key != settings.api_key:
        raise HTTPException(status_code=401, detail="Unauthorized")


def _cache_key(prefix: str, payload: dict) -> str:
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return f"{prefix}:{digest}"


async def _rate_limit(user_id: int | None, role: str | None) -> None:
    if not user_id:
        return
    window = settings.rate_limit_window_seconds
    max_requests = settings.rate_limit_requests_student if role == "student" else settings.rate_limit_requests
    now = time.time()

    async with _rate_lock:
        history = _rate_limits.setdefault(str(user_id), [])
        history[:] = [ts for ts in history if now - ts < window]
        if len(history) >= max_requests:
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        history.append(now)


def _max_tokens_for(role: str | None) -> int:
    if role == "student":
        return settings.max_output_tokens_student
    return settings.max_output_tokens


async def _call_llm(system_prompt: str, user_prompt: str, max_tokens: int) -> dict:
    try:
        if _llama_cpp_client:
            return await _llama_cpp_client.generate_json(system_prompt, user_prompt, max_tokens)
        return await _llama_client.generate_json(system_prompt, user_prompt, max_tokens)
    except Exception:
        if settings.remote_llm_url:
            return await _remote_client.generate_json(system_prompt, user_prompt, max_tokens)
        raise


async def _handle_cv_suggest(payload: CvSuggestionRequest) -> dict:
    system_prompt, user_prompt = build_cv_prompt(payload.cv)
    max_tokens = _max_tokens_for(payload.role)
    return await _call_llm(system_prompt, user_prompt, max_tokens)


async def _handle_fit(payload: ApplicationFitRequest) -> dict:
    system_prompt, user_prompt = build_fit_prompt(payload.cv, payload.job)
    max_tokens = _max_tokens_for(payload.role)
    return await _call_llm(system_prompt, user_prompt, max_tokens)


def _get_cached(prefix: str, payload: dict) -> dict | None:
    key = _cache_key(prefix, payload)
    return _cache.get(key)


def _set_cache(prefix: str, payload: dict, value: dict) -> None:
    key = _cache_key(prefix, payload)
    _cache[key] = value


def _error_response(exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=500, content=ErrorResponse(message=str(exc)).model_dump())


@app.post("/v1/cv/suggest", response_model=dict)
async def suggest_cv(
    payload: CvSuggestionRequest,
    x_api_key: str | None = Header(default=None),
) -> dict:
    _enforce_auth(x_api_key)
    await _rate_limit(payload.userId, payload.role)

    cached = _get_cached("cv", payload.model_dump())
    if cached:
        return cached

    result = await _handle_cv_suggest(payload)
    _set_cache("cv", payload.model_dump(), result)
    return result


@app.post("/v1/cv/suggest/async", response_model=TaskCreateResponse)
async def suggest_cv_async(
    payload: CvSuggestionRequest,
    x_api_key: str | None = Header(default=None),
) -> TaskCreateResponse:
    _enforce_auth(x_api_key)
    await _rate_limit(payload.userId, payload.role)

    cached = _get_cached("cv", payload.model_dump())
    if cached:
        record = await _task_store.create(TaskType.cv_suggest)
        await _task_store.update(record.task_id, status="succeeded", result=cached)
        return TaskCreateResponse(taskId=record.task_id, status="succeeded")

    record = await _task_store.create(TaskType.cv_suggest)

    async def handler() -> dict:
        result = await _handle_cv_suggest(payload)
        _set_cache("cv", payload.model_dump(), result)
        return result

    await _task_queue.enqueue(record, handler)
    return TaskCreateResponse(taskId=record.task_id, status="pending")


@app.post("/v1/applications/fit", response_model=dict)
async def analyze_fit(
    payload: ApplicationFitRequest,
    x_api_key: str | None = Header(default=None),
) -> dict:
    _enforce_auth(x_api_key)
    await _rate_limit(payload.userId, payload.role)

    cached = _get_cached("fit", payload.model_dump())
    if cached:
        return cached

    result = await _handle_fit(payload)
    _set_cache("fit", payload.model_dump(), result)
    return result


@app.post("/v1/applications/fit/async", response_model=TaskCreateResponse)
async def analyze_fit_async(
    payload: ApplicationFitRequest,
    x_api_key: str | None = Header(default=None),
) -> TaskCreateResponse:
    _enforce_auth(x_api_key)
    await _rate_limit(payload.userId, payload.role)

    cached = _get_cached("fit", payload.model_dump())
    if cached:
        record = await _task_store.create(TaskType.cv_job_fit)
        await _task_store.update(record.task_id, status="succeeded", result=cached)
        return TaskCreateResponse(taskId=record.task_id, status="succeeded")

    record = await _task_store.create(TaskType.cv_job_fit)

    async def handler() -> dict:
        result = await _handle_fit(payload)
        _set_cache("fit", payload.model_dump(), result)
        return result

    await _task_queue.enqueue(record, handler)
    return TaskCreateResponse(taskId=record.task_id, status="pending")


@app.get("/v1/tasks/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(
    task_id: str,
    x_api_key: str | None = Header(default=None),
) -> TaskStatusResponse:
    _enforce_auth(x_api_key)

    record = await _task_store.get(task_id)
    if not record:
        raise HTTPException(status_code=404, detail="Task not found")

    return TaskStatusResponse(
        taskId=record.task_id,
        status=record.status,
        result=record.result,
        error=record.error,
        type=record.task_type,
    )


@app.exception_handler(Exception)
async def handle_unexpected_error(_request: Request, exc: Exception) -> JSONResponse:
    return _error_response(exc)
