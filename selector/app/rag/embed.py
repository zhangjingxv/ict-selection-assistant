# Placeholder for embedding and retrieval integration
from typing import List, Sequence, Dict, Any
import os
import httpx
import hashlib
import math


def _fake_embed(texts: Sequence[str], dim: int = 384) -> List[List[float]]:
    vecs: List[List[float]] = []
    for t in texts:
        h = hashlib.sha256(t.encode("utf-8")).digest()
        # repeat bytes to reach dim
        arr = []
        while len(arr) < dim:
            for b in h:
                arr.append((b / 255.0) * 2 - 1)
                if len(arr) >= dim:
                    break
        # L2 normalize
        norm = math.sqrt(sum(x * x for x in arr)) or 1.0
        vecs.append([x / norm for x in arr])
    return vecs


async def embed_texts(texts: Sequence[str], provider: str = "auto", model: str | None = None) -> Dict[str, Any]:
    provider = (provider or "auto").lower()
    if provider in ("auto", "openai"):
        key = os.getenv("OPENAI_API_KEY")
        base = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        mdl = model or os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small")
        if key:
            try:
                async with httpx.AsyncClient(timeout=30) as client:
                    r = await client.post(
                        f"{base}/embeddings",
                        headers={"Authorization": f"Bearer {key}"},
                        json={"model": mdl, "input": list(texts)},
                    )
                    if r.status_code < 400:
                        data = r.json()
                        vecs = [d["embedding"] for d in data.get("data", [])]
                        return {"vectors": vecs, "dim": len(vecs[0]) if vecs else 0, "provider": "openai"}
            except Exception:
                pass
    if provider in ("auto", "qwen"):
        key = os.getenv("QWEN_API_KEY") or os.getenv("DASHSCOPE_API_KEY")
        base = os.getenv("QWEN_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
        mdl = model or os.getenv("QWEN_EMBED_MODEL", "text-embedding-v2")
        if key:
            try:
                async with httpx.AsyncClient(timeout=30) as client:
                    r = await client.post(
                        f"{base}/embeddings",
                        headers={"Authorization": f"Bearer {key}"},
                        json={"model": mdl, "input": list(texts)},
                    )
                    if r.status_code < 400:
                        data = r.json()
                        vecs = [d["embedding"] for d in data.get("data", [])]
                        return {"vectors": vecs, "dim": len(vecs[0]) if vecs else 0, "provider": "qwen"}
            except Exception:
                pass
    if provider in ("auto", "ollama"):
        base = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        mdl = model or os.getenv("OLLAMA_EMBED_MODEL", "bge-m3")
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                r = await client.post(
                    f"{base}/api/embeddings",
                    json={"model": mdl, "input": list(texts)},
                )
                if r.status_code < 400:
                    data = r.json()
                    # Ollama returns {'embeddings': [[...], [...]]}
                    vecs = data.get("embeddings") or data.get("data")
                    if vecs:
                        return {"vectors": vecs, "dim": len(vecs[0]) if vecs else 0, "provider": "ollama"}
        except Exception:
            pass
    # Fallback
    vecs = _fake_embed(texts)
    return {"vectors": vecs, "dim": len(vecs[0]) if vecs else 0, "provider": "fake"}

