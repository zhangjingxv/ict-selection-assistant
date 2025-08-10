from typing import List, Dict, Any, Tuple
import time

from .embed import embed_texts
from .indexer import Qdrant


async def evaluate_retrieval(
    samples: List[Dict[str, Any]],
    collection: str,
    provider: str = "auto",
    model: str | None = None,
    topk: int = 5,
) -> Dict[str, Any]:
    qdr = Qdrant()
    total_recall = 0.0
    total_precision = 0.0
    latencies_ms: List[float] = []
    results: List[Dict[str, Any]] = []

    for s in samples:
        query = s.get("query", "")
        relevant_ids = set(s.get("relevant_ids", []))
        t0 = time.time()
        emb = await embed_texts([query], provider=provider, model=model)
        vec = emb.get("vectors", [[0.0]])[0]
        out = await qdr.search(collection, vec, topk)
        latency_ms = (time.time() - t0) * 1000.0
        latencies_ms.append(latency_ms)

        hits = out.get("result", []) or out.get("hits", []) or []
        hit_ids = []
        for h in hits:
            # Prefer payload.id if available
            pid = None
            payload = h.get("payload") if isinstance(h, dict) else None
            if isinstance(payload, dict):
                pid = payload.get("id") or payload.get("doc_id")
            hit_ids.append(str(pid) if pid is not None else str(h.get("id")))

        retrieved_k = set(hit_ids[:topk])
        tp = len(retrieved_k & set(map(str, relevant_ids)))
        recall = tp / max(1, len(relevant_ids))
        precision = tp / max(1, min(topk, len(hit_ids)))
        total_recall += recall
        total_precision += precision

        results.append({
            "query": query,
            "relevant_ids": list(relevant_ids),
            "hit_ids": hit_ids,
            "recall@k": round(recall, 4),
            "precision@k": round(precision, 4),
            "latency_ms": round(latency_ms, 2),
        })

    n = max(1, len(samples))
    summary = {
        "Recall@k": round(total_recall / n, 4),
        "Precision@k": round(total_precision / n, 4),
        "Latency P95 (ms)": round(sorted(latencies_ms)[int(0.95 * (n - 1))], 2) if latencies_ms else 0.0,
        "Latency Avg (ms)": round(sum(latencies_ms) / n, 2) if latencies_ms else 0.0,
    }
    return {"summary": summary, "results": results}


