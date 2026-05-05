# FastAPI LLM Service

This service hosts the LLM logic for CV suggestions and job-fit analysis. It talks to a local llama.cpp/llama-server and optionally falls back to a remote OpenAI-compatible endpoint.

## Endpoints

- POST /v1/cv/suggest
- POST /v1/cv/suggest/async
- POST /v1/applications/fit
- POST /v1/applications/fit/async
- GET /v1/tasks/{task_id}

## Env vars

- LLAMA_SERVER_URL (default: http://localhost:8001)
- LLAMA_SERVER_MODEL (default: unsloth/gemma-4-E4B-it-GGUF)
- REMOTE_LLM_URL (optional, OpenAI-compatible)
- REMOTE_LLM_API_KEY (optional)
- REMOTE_LLM_MODEL (optional)
- MAX_INPUT_CHARS (default: 16000)
- MAX_OUTPUT_TOKENS (default: 512)
- MAX_OUTPUT_TOKENS_STUDENT (default: 384)
- MAX_IMPROVEMENTS (default: 6)
- MAX_KEYWORDS (default: 10)
- MAX_ACTION_PLAN (default: 6)
- RATE_LIMIT_WINDOW_SECONDS (default: 60)
- RATE_LIMIT_REQUESTS (default: 6)
- RATE_LIMIT_REQUESTS_STUDENT (default: 3)
- CACHE_TTL_SECONDS (default: 1800)
- CACHE_MAX_ITEMS (default: 500)
- QUEUE_CONCURRENCY (default: 2)
- API_KEY (optional shared secret with NestJS)

## Run

```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8099
```

## Notes

- For 16GB RAM laptops, use E4B Q4/Q5 and keep context small.
- If llama-server is public, set API_KEY or restrict network access.
