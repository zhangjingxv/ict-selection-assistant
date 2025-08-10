from typing import Dict, Any, List, Tuple
import hashlib


def clean_text(text: str) -> str:
    return (text or "").strip()


def doc_fingerprint(text: str) -> str:
    return hashlib.sha256((text or "").encode("utf-8")).hexdigest()


def is_valid_doc(text: str, min_chars: int = 20) -> bool:
    if not text:
        return False
    if len(text) < min_chars:
        return False
    return True


def filter_and_normalize(docs: List[Dict[str, Any]], min_chars: int = 20) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
    seen = set()
    kept: List[Dict[str, Any]] = []
    stats = {"input": 0, "kept": 0, "too_short": 0, "dedup": 0}
    for d in docs:
        stats["input"] += 1
        t = clean_text(d.get("text", ""))
        if not is_valid_doc(t, min_chars=min_chars):
            stats["too_short"] += 1
            continue
        fp = doc_fingerprint(t)
        if fp in seen:
            stats["dedup"] += 1
            continue
        seen.add(fp)
        kept.append({
            "id": d.get("id"),
            "text": t,
            "meta": (d.get("meta") or {}) | {"fp": fp},
        })
        stats["kept"] += 1
    return kept, stats


