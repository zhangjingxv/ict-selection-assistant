from typing import Dict, Any

DEFAULT_WEIGHTS = {
    "cpu": 0.35,
    "memory": 0.25,
    "nic": 0.15,
    "reliability": 0.15,
    # Negative means cheaper is better
    "price": -0.10,
}

def normalize(metric: str, value: float) -> float:
    try:
        v = float(value)
        return max(0.0, min(1.0, v / (v + 100)))
    except Exception:
        return 0.0

def score_product(product: Dict[str, Any], weights: Dict[str, float] = None) -> float:
    weights = weights or DEFAULT_WEIGHTS
    s = 0.0
    for m, w in weights.items():
        s += w * normalize(m, product.get(m, 0))
    return s
