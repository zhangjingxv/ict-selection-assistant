from typing import List, Dict, Any, Tuple, DefaultDict
import re
from rank_bm25 import BM25Okapi
from collections import defaultdict


def tokenize(text: str) -> List[str]:
    return [t for t in re.split(r"\W+", (text or "").lower()) if t]


class InMemoryBM25:
    def __init__(self, docs: List[Dict[str, Any]]):
        corpus = [tokenize(d.get("text", "")) for d in docs]
        self.docs = docs
        self.bm25 = BM25Okapi(corpus)

    def search(self, query: str, topk: int = 10) -> List[Tuple[float, Dict[str, Any]]]:
        tokens = tokenize(query)
        scores = self.bm25.get_scores(tokens)
        idx = list(range(len(self.docs)))
        ranked = sorted(zip(scores, idx), key=lambda x: x[0], reverse=True)[:topk]
        return [(float(s), self.docs[i]) for s, i in ranked]


def fuse_scores(vec_hits: List[Dict[str, Any]], bm25_hits: List[Tuple[float, Dict[str, Any]]], alpha: float = 0.7, topk: int = 5) -> List[Dict[str, Any]]:
    # Map payload.id → bm25 score
    bm25_map: Dict[str, float] = {}
    for s, d in bm25_hits:
        pid = d.get("id") or d.get("payload", {}).get("id")
        if pid is not None:
            bm25_map[str(pid)] = s

    out: List[Dict[str, Any]] = []
    for h in vec_hits:
        pid = None
        payload = h.get("payload") or {}
        if isinstance(payload, dict):
            pid = payload.get("id")
        pid = str(pid) if pid is not None else str(h.get("id"))
        vscore = float(h.get("score", 0.0))
        bscore = bm25_map.get(pid, 0.0)
        combo = alpha * vscore + (1.0 - alpha) * bscore
        h2 = dict(h)
        h2["bm25_score"] = bscore
        h2["combo_score"] = combo
        out.append(h2)

    out.sort(key=lambda x: x.get("combo_score", 0.0), reverse=True)
    return out[:topk]


class BM25Registry:
    """Process-wide simple registry of BM25 indices per collection."""

    def __init__(self) -> None:
        self._collection_to_docs: DefaultDict[str, List[Dict[str, Any]]] = defaultdict(list)
        self._collection_to_index: Dict[str, InMemoryBM25] = {}

    def add_docs(self, collection: str, docs: List[Dict[str, Any]]) -> None:
        if not docs:
            return
        self._collection_to_docs[collection].extend(docs)
        self._collection_to_index[collection] = InMemoryBM25(self._collection_to_docs[collection])

    def reset(self, collection: str) -> None:
        self._collection_to_docs.pop(collection, None)
        self._collection_to_index.pop(collection, None)

    def search(self, collection: str, query: str, topk: int = 10) -> List[Tuple[float, Dict[str, Any]]]:
        idx = self._collection_to_index.get(collection)
        if not idx:
            return []
        return idx.search(query, topk)


# Global registry instance
bm25_registry = BM25Registry()


