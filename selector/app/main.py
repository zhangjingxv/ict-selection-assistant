from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional

app = FastAPI(title="ICT Selection API", version="0.1.0")

class Constraints(BaseModel):
    budget: Optional[float] = None
    rack_u: Optional[int] = None
    power_w: Optional[int] = None
    brand_prefer: Optional[List[str]] = None

class SelectRequest(BaseModel):
    scenario: str = Field(..., description="e.g., virtualization, olap, ai_infer, campus_access, sec_boundary")
    constraints: Constraints = Constraints()
    metrics_weight: Dict[str, float] = {}

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/api/select")
def select(req: SelectRequest):
    # TODO: wire filters + scoring + retrieval; returns stub for now
    candidates = [
        {"product_id": 1, "score": 0.82, "price_range": [95000, 110000], "why": ["spec_cpu","compat_ok"]},
        {"product_id": 2, "score": 0.79, "tradeoff": "higher memory ceiling"},
        {"product_id": 3, "score": 0.71, "tradeoff": "best price"}
    ]
    return {"candidates": candidates, "evidence": {"spec_cpu":"2x sockets; 3rd gen Xeon"}, "pdf_url": None}
