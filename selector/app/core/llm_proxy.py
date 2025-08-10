from typing import Dict, Any, Optional
import os
import httpx
import asyncio


class LLMConfig:
    openai_api_key: Optional[str]
    openai_base_url: str
    qwen_api_key: Optional[str]
    qwen_base_url: str

    def __init__(self) -> None:
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.openai_base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        self.qwen_api_key = os.getenv("QWEN_API_KEY") or os.getenv("DASHSCOPE_API_KEY")
        # DashScope OpenAI-compatible endpoint
        self.qwen_base_url = os.getenv(
            "QWEN_BASE_URL",
            "https://dashscope.aliyuncs.com/compatible-mode/v1",
        )


async def _request_with_retry(url: str, headers: Dict[str, str], payload: Dict[str, Any]) -> Dict[str, Any]:
    backoffs = [0.5, 1.0, 2.0]
    last_error: Optional[str] = None
    async with httpx.AsyncClient(timeout=30) as client:
        for i, delay in enumerate([0.0] + backoffs):
            if delay > 0:
                await asyncio.sleep(delay)
            try:
                r = await client.post(url, headers=headers, json=payload)
                if r.status_code < 400:
                    return r.json()
                # Retry on 429/5xx
                if r.status_code in (429, 500, 502, 503, 504):
                    last_error = f"status={r.status_code} body={r.text[:500]}"
                    continue
                return {"error": {"code": "UPSTREAM_ERROR", "status": r.status_code, "body": r.text}}
            except Exception as e:
                last_error = str(e)
                continue
    return {"error": {"code": "RETRY_EXHAUSTED", "message": last_error}}


async def call_openai(payload: Dict[str, Any], config: LLMConfig) -> Dict[str, Any]:
    if not config.openai_api_key:
        return {"error": {"code": "NO_OPENAI_KEY", "message": "OPENAI_API_KEY not configured"}}
    url = f"{config.openai_base_url}/chat/completions"
    headers = {"Authorization": f"Bearer {config.openai_api_key}", "Content-Type": "application/json"}
    return await _request_with_retry(url, headers, payload)


async def call_qwen(payload: Dict[str, Any], config: LLMConfig) -> Dict[str, Any]:
    if not config.qwen_api_key:
        return {"error": {"code": "NO_QWEN_KEY", "message": "QWEN_API_KEY/DASHSCOPE_API_KEY not configured"}}
    url = f"{config.qwen_base_url}/chat/completions"
    headers = {"Authorization": f"Bearer {config.qwen_api_key}", "Content-Type": "application/json"}
    return await _request_with_retry(url, headers, payload)


async def llm_infer(provider: str, model: str, messages: Any, temperature: float = 0.2) -> Dict[str, Any]:
    cfg = LLMConfig()
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }
    if provider == "openai":
        return await call_openai(payload, cfg)
    elif provider == "qwen":
        return await call_qwen(payload, cfg)
    else:
        return {"error": {"code": "UNSUPPORTED_PROVIDER", "message": provider}}


