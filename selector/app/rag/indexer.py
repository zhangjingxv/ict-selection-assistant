from typing import List, Dict, Any, Optional
import os
import httpx
import hashlib


def stable_id(key: str) -> int:
    """Create a deterministic 63-bit integer id from an arbitrary key string."""
    h = hashlib.sha256(key.encode("utf-8")).digest()
    # take first 8 bytes as unsigned int and mask to 63-bit to be safe
    val = int.from_bytes(h[:8], byteorder="big", signed=False)
    return val & ((1 << 63) - 1)


class Qdrant:
    def __init__(self, url: str | None = None) -> None:
        self.url = url or os.getenv("QDRANT_URL", "http://localhost:6333")

    async def create_collection(self, name: str, dim: int) -> Dict[str, Any]:
        schema = {
            "vectors": {"size": dim, "distance": "Cosine"},
            "hnsw_config": {"m": 32, "ef_construct": 128},
            "optimizers_config": {"memmap_threshold": 20000},
            "on_disk_payload": True,
        }
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.put(f"{self.url}/collections/{name}?wait=true", json=schema)
            return r.json()

    async def upsert(self, name: str, vectors: List[List[float]], payloads: List[Dict[str, Any]], ids: Optional[List[int]] = None):
        points = []
        for i, (v, p) in enumerate(zip(vectors, payloads)):
            pid = ids[i] if ids is not None and i < len(ids) else i
            points.append({"id": pid, "vector": v, "payload": p})
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.put(f"{self.url}/collections/{name}/points?wait=true", json={"points": points})
            return r.json()

    async def search(self, name: str, vector: List[float], limit: int = 5) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=30) as client:
            payload = {"vector": vector, "limit": limit, "with_payload": True}
            r = await client.post(f"{self.url}/collections/{name}/points/search", json=payload)
            return r.json()

    async def list_collections(self) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(f"{self.url}/collections")
            return r.json()

    async def delete_collection(self, name: str) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.delete(f"{self.url}/collections/{name}")
            return r.json()


