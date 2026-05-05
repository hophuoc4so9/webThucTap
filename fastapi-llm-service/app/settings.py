from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    service_name: str = "fastapi-llm-service"
    listen_host: str = "0.0.0.0"
    listen_port: int = 8099

    llama_server_url: str = "http://localhost:8001"
    llama_server_model: str = "unsloth/gemma-4-E4B-it-GGUF"
    llama_server_timeout_seconds: int = 120

    llama_cpp_model_path: str | None = None
    llama_cpp_n_ctx: int = 4096
    llama_cpp_n_threads: int = 6
    llama_cpp_n_gpu_layers: int = 0

    remote_llm_url: str | None = None
    remote_llm_api_key: str | None = None
    remote_llm_model: str | None = None

    max_input_chars: int = 16000
    max_output_tokens: int = 512
    max_output_tokens_student: int = 384
    max_improvements: int = 6
    max_keywords: int = 10
    max_action_plan: int = 6

    rate_limit_window_seconds: int = 60
    rate_limit_requests: int = 6
    rate_limit_requests_student: int = 3

    cache_ttl_seconds: int = 1800
    cache_max_items: int = 500

    queue_concurrency: int = 2

    api_key: str | None = None


settings = Settings()
