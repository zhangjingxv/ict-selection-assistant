from fastapi import FastAPI, Header, HTTPException, Depends
import csv
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import os
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from .core.catalog import load_products
from .core.filters import hard_constraints_ok
from .core.scoring import score_product, DEFAULT_WEIGHTS
from .core.param_planner import plan_parameters, default_rag_rubric
from .core.llm_proxy import llm_infer
from .rag.embed import embed_texts
from .rag.indexer import Qdrant
from .core.recommend import generate_recommendation
from .rag.evaluate import evaluate_retrieval
from .rag.preprocess import filter_and_normalize
from .rag.chunker import chunk_document
from .rag.crawl import fetch_and_extract
from .rag.hybrid import InMemoryBM25, fuse_scores, bm25_registry

app = FastAPI(title="ICT Selection API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Optional API-key auth (set SELECTOR_API_KEY to enable)
def require_api_key(x_api_key: Optional[str] = Header(None)):
    expected = os.getenv("SELECTOR_API_KEY")
    if not expected:
        return
    if x_api_key != expected:
        raise HTTPException(status_code=401, detail="invalid or missing x-api-key")

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
def select(req: SelectRequest, _=Depends(require_api_key)):
    # Load catalog
    env_path = os.getenv("CATALOG_CSV")
    default_in_container = "/app/catalog/samples/products.csv"
    # compute repo-root based default (works when running `uvicorn app.main:app --reload` from `selector/`)
    file_dir = os.path.dirname(__file__)
    # /selector/app -> repo root is two levels up
    repo_root = os.path.abspath(os.path.join(file_dir, "..", ".."))
    default_local = os.path.join(repo_root, "catalog", "samples", "products.csv")

    chosen_path = env_path or (default_in_container if os.path.exists(default_in_container) else default_local)
    products = load_products(chosen_path)

    # Apply basic filtering
    filtered: List[Dict[str, Any]] = []
    for p in products:
        if req.constraints.brand_prefer and p.get("brand") not in req.constraints.brand_prefer:
            continue
        if not hard_constraints_ok(req.model_dump(), p):
            continue
        filtered.append(p)

    # Scenario based light heuristic (could map scenarios to categories)
    scenario = req.scenario.lower()
    if scenario in {"virtualization", "olap", "ai_infer"}:
        filtered = [p for p in filtered if p.get("category") == "server"]
    elif scenario in {"campus_access", "datacenter_fabric"}:
        filtered = [p for p in filtered if p.get("category") == "switch"]
    elif scenario in {"sec_boundary", "ngfw", "waf"}:
        filtered = [p for p in filtered if p.get("category") == "security"]

    if not filtered:
        return {"candidates": [], "message": "No candidates after filtering"}

    # Scoring
    weights = DEFAULT_WEIGHTS.copy()
    weights.update(req.metrics_weight or {})

    ranked = []
    for p in filtered:
        s = score_product(p, weights)
        ranked.append({
            "brand": p.get("brand"),
            "model": p.get("model"),
            "category": p.get("category"),
            "score": round(s, 4),
            "lifecycle_status": p.get("lifecycle_status"),
            "updated_at": p.get("updated_at"),
            "key_specs": p.get("spec"),
        })

    ranked.sort(key=lambda x: x["score"], reverse=True)
    topk = ranked[: min(5, len(ranked))]
    return {"candidates": topk}


class PlanRequest(BaseModel):
    scenario: str
    current: Dict[str, Any] = {}
    data: Dict[str, Any] = {}
    constraints: Dict[str, Any] = {}
    risk: Dict[str, float] = {}


@app.post("/api/plan")
def plan(req: PlanRequest, _=Depends(require_api_key)):
    result = plan_parameters(req.model_dump())
    return {"plan": result}


@app.get("/api/rag/rubric")
def rag_rubric(_=Depends(require_api_key)):
    return {"rubric": default_rag_rubric()}


class LLMInferRequest(BaseModel):
    provider: str = Field(..., description="openai | qwen")
    model: str = Field(...)
    messages: List[Dict[str, Any]]
    temperature: float = 0.2


@app.post("/api/llm/infer")
async def llm_proxy(req: LLMInferRequest, _=Depends(require_api_key)):
    res = await llm_infer(req.provider, req.model, req.messages, req.temperature)
    return res


class RAGIndexRequest(BaseModel):
    collection: str = Field(default="ict_docs")
    provider: Optional[str] = Field(default="auto")
    model: Optional[str] = None
    docs: List[Dict[str, Any]] = Field(default_factory=list, description="[{id, text, meta}]")
    chunk_strategy: Optional[str] = Field(default="sentence")
    chunk_max_chars: Optional[int] = Field(default=400)
    chunk_overlap: Optional[int] = Field(default=50)
    urls: Optional[List[str]] = None
    url_source: Optional[str] = "web"


@app.post("/api/rag/index")
async def rag_index(req: RAGIndexRequest, _=Depends(require_api_key)):
    # Filter & normalize docs before indexing
    kept, stats = filter_and_normalize(req.docs)
    # optionally crawl URLs into docs
    if req.urls:
        crawled = await fetch_and_extract(req.urls, source=req.url_source or "web")
        kept += crawled

    # build meta map for payload enrichment
    id_to_meta: Dict[str, Any] = {}
    for d in kept:
        id_to_meta[str(d.get("id"))] = (d.get("meta") or {})

    # chunking
    chunks: List[Dict[str, Any]] = []
    for d in kept:
        chunks += chunk_document(
            str(d.get("id")),
            d.get("text", ""),
            strategy=req.chunk_strategy or "sentence",
            max_chars=int(req.chunk_max_chars or 400),
            overlap=int(req.chunk_overlap or 50),
        )
    texts = [c.get("text", "") for c in chunks]
    if not texts:
        return {"ok": False, "reason": "no_texts_after_chunking", "filter_stats": stats, "crawled": len(req.urls or [])}
    emb = await embed_texts(texts, provider=req.provider or "auto", model=req.model)
    dim = emb.get("dim", 0)
    if not dim:
        # fallback to default dimension for fake provider
        dim = 384
    vecs = emb.get("vectors", [])
    qdr = Qdrant()
    await qdr.create_collection(req.collection, dim)
    payloads = []
    for c in chunks:
        doc_id = str(c.get("doc_id"))
        base = {
            "id": f"{doc_id}::{c.get('chunk_id')}",
            "doc_id": doc_id,
            "chunk_id": c.get("chunk_id"),
            "text": c.get("text"),
        }
        base.update(id_to_meta.get(doc_id, {}))
        payloads.append(base)
    # stable numeric ids for idempotent upserts
    from .rag.indexer import stable_id
    ids = [stable_id(str(p.get("id"))) for p in payloads]
    r = await qdr.upsert(req.collection, vecs, payloads, ids=ids)
    # update BM25 registry for this collection
    bm25_registry.add_docs(req.collection, [{"id": p.get("id"), "text": p.get("text", "")} for p in payloads])
    return {"ok": True, "provider": emb.get("provider"), "qdrant": r, "filter_stats": stats}


class RAGSearchRequest(BaseModel):
    collection: str = Field(default="ict_docs")
    provider: Optional[str] = Field(default="auto")
    model: Optional[str] = None
    query: str
    topk: int = 5
    where: Optional[Dict[str, Any]] = None
    where_any: Optional[Dict[str, List[Any]]] = None
    rerank: bool = True
    alpha: float = 0.7


@app.post("/api/rag/search")
async def rag_search(req: RAGSearchRequest, _=Depends(require_api_key)):
    emb = await embed_texts([req.query], provider=req.provider or "auto", model=req.model)
    vec = emb.get("vectors", [[0.0]])[0]
    qdr = Qdrant()
    out = await qdr.search(req.collection, vec, max(20, req.topk))
    # If client requested filtering by payload metadata, apply here as a second-stage filter
    hits = out.get("result") or out.get("hits") or []
    if req.where or req.where_any:
        def ok(p: Dict[str, Any]) -> bool:
            meta = p or {}
            if req.where:
                for k, v in req.where.items():
                    if meta.get(k) != v:
                        return False
            if req.where_any:
                for k, vals in req.where_any.items():
                    if meta.get(k) not in set(vals):
                        return False
            return True
        hits = [h for h in hits if ok(h.get("payload", {}))]
    # Hybrid: fuse vector similarity with BM25 lexical score, then fallback to keyword rerank
    if req.rerank and hits:
        import re
        query_terms = [t for t in re.split(r"\W+", req.query) if t]
        def kw_score(text: str) -> float:
            t = (text or "").lower()
            return sum(t.count(term.lower()) for term in query_terms)
        # Prepare docs for BM25
        docs = []
        for h in hits:
            payload = h.get("payload") or {}
            docs.append({"id": payload.get("id") or h.get("id"), "text": payload.get("text", "")})
        bm25_hits = bm25_registry.search(req.collection, req.query, topk=max(20, req.topk))
        if not bm25_hits:
            # fallback to ad-hoc if registry empty
            bm25 = InMemoryBM25(docs)
            bm25_hits = bm25.search(req.query, topk=max(20, req.topk))
        fused = fuse_scores(hits, bm25_hits, alpha=req.alpha, topk=req.topk)
        # Add keyword score as auxiliary
        for f in fused:
            payload = f.get("payload") or {}
            f["kw_score"] = kw_score(payload.get("text", ""))
        hits = fused
    else:
        hits = hits[: req.topk]
    return {"ok": True, "hits": hits}


class RecommendRequest(BaseModel):
    scenario: str
    current: Dict[str, Any] = {}
    data: Dict[str, Any] = {}
    constraints: Dict[str, Any] = {}
    risk: Dict[str, float] = {}
    budget_tier: str | None = None
    security_level: str | None = None
    evidence_query: str | None = None
    collection: str = "ict_docs"
    provider: Optional[str] = "auto"
    model: Optional[str] = None


@app.post("/api/recommend")
async def recommend(req: RecommendRequest, _=Depends(require_api_key)):
    req_dict = req.model_dump()
    evidence = None
    # Build a default evidence query from template if not provided
    default_query = None
    if not req.evidence_query:
        cur = req.current or {}
        default_query = (
            f"场景:{req.scenario} QPS:{cur.get('qps_peak')} P95:{cur.get('latency_p95_ms')}ms "
            f"请求:{cur.get('payload_kb')}KB 合规:{(req.constraints or {}).get('compliance','')} "
            f"预算:{req.budget_tier} 安全:{req.security_level}"
        )
    query_text = req.evidence_query or default_query
    if query_text:
        emb = await embed_texts([query_text], provider=req.provider or "auto", model=req.model)
        vec = emb.get("vectors", [[0.0]])[0]
        qdr = Qdrant()
        out = await qdr.search(req.collection, vec, 5)
        hits = out.get("result")
        # Normalize evidence items
        evidence = []
        for h in hits or []:
            item = {
                "id": h.get("id"),
                "score": h.get("score"),
                "payload": h.get("payload"),
                "text": (h.get("payload") or {}).get("text"),
            }
            evidence.append(item)
    result = generate_recommendation(req_dict, evidence)
    return {"recommendation": result}


def _recommend_to_markdown(rec: Dict[str, Any]) -> str:
    lines = ["# 推荐方案", ""]
    lines.append("## 重点模块")
    lines.append(", ".join(rec.get("focus", [])))
    for sec in ["compute", "storage", "network", "security", "observability"]:
        if sec in rec:
            lines.append("")
            lines.append(f"## {sec}")
            body = rec.get(sec)
            lines.append("```")
            import json as _json
            lines.append(_json.dumps(body, ensure_ascii=False, indent=2))
            lines.append("```")
    if rec.get("evidence"):
        lines.append("")
        lines.append("## 证据（TopN）")
        for i, e in enumerate(rec["evidence"], 1):
            lines.append(f"- ({i}) score={e.get('score'):.3f} source={e.get('source') or ''}")
            if e.get("text"):
                t = e["text"]
                if len(t) > 400:
                    t = t[:400] + "..."
                lines.append(f"  > {t}")
    return "\n".join(lines)


@app.post("/api/recommend/export", response_class=PlainTextResponse)
async def recommend_export(req: RecommendRequest, _=Depends(require_api_key)):
    res = await recommend(req)
    md = _recommend_to_markdown(res["recommendation"])  # type: ignore[index]
    return md


class RAGEvalRequest(BaseModel):
    collection: str = "ict_docs"
    provider: Optional[str] = "auto"
    model: Optional[str] = None
    topk: int = 5
    samples: List[Dict[str, Any]] = []


@app.post("/api/rag/evaluate")
async def rag_evaluate(req: RAGEvalRequest, _=Depends(require_api_key)):
    out = await evaluate_retrieval(req.samples, req.collection, req.provider or "auto", req.model, req.topk)
    # persist csv for dashboarding
    out_dir = os.getenv("EVAL_OUT_DIR") or os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "eval_out"))
    try:
        os.makedirs(out_dir, exist_ok=True)
        csv_path = os.path.join(out_dir, f"{req.collection}_eval.csv")
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["query", "relevant_ids", "hit_ids", "recall@k", "precision@k", "latency_ms"])
            for r in out.get("results", []):
                writer.writerow([
                    r.get("query"),
                    ",".join(map(str, r.get("relevant_ids", []))),
                    ",".join(map(str, r.get("hit_ids", []))),
                    r.get("recall@k"), r.get("precision@k"), r.get("latency_ms")
                ])
            # summary as last row
            s = out.get("summary", {})
            writer.writerow(["SUMMARY", "", "", s.get("Recall@k"), s.get("Precision@k"), s.get("Latency P95 (ms)")])
        out["csv_path"] = csv_path
    except Exception as _:
        pass
    return out


# Collections management
@app.get("/api/rag/collections")
async def list_collections(_=Depends(require_api_key)):
    qdr = Qdrant()
    qdrant = await qdr.list_collections()
    names = []
    try:
        for c in (qdrant.get("result", {}) or {}).get("collections", []) or []:
            n = c.get("name") if isinstance(c, dict) else None
            if n:
                names.append(n)
    except Exception:
        pass
    bm25_tracked = list(getattr(bm25_registry, "_collection_to_docs", {}).keys())
    return {"collections": names, "bm25_tracked": bm25_tracked, "raw": qdrant}


@app.delete("/api/rag/collections/{name}")
async def delete_collection(name: str, _=Depends(require_api_key)):
    qdr = Qdrant()
    bm25_registry.reset(name)
    res = await qdr.delete_collection(name)
    return {"ok": True, "qdrant": res}


@app.post("/api/rag/collections/{name}/reset-bm25")
def reset_bm25(name: str, _=Depends(require_api_key)):
    bm25_registry.reset(name)
    return {"ok": True}


# Evaluation files and summaries
@app.get("/api/rag/evals")
def list_evals(collection: Optional[str] = None, _=Depends(require_api_key)):
    out_dir = os.getenv("EVAL_OUT_DIR") or os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "eval_out"))
    os.makedirs(out_dir, exist_ok=True)
    import glob, json
    def parse_summary(csv_path: str) -> Dict[str, Any]:
        try:
            with open(csv_path, encoding="utf-8") as f:
                lines = [l.strip() for l in f.readlines() if l.strip()]
            # last row expected SUMMARY
            if not lines:
                return {}
            header = [h.strip() for h in lines[0].split(",")]
            last = [c.strip() for c in lines[-1].split(",")]
            if last and last[0] == "SUMMARY":
                # map by known columns
                return {
                    "Recall@k": float(last[3]) if len(last) > 3 else None,
                    "Precision@k": float(last[4]) if len(last) > 4 else None,
                    "Latency P95 (ms)": float(last[5]) if len(last) > 5 else None,
                }
            return {}
        except Exception:
            return {}

    results: List[Dict[str, Any]] = []
    pattern = os.path.join(out_dir, f"{collection}_eval.csv" if collection else "*_eval.csv")
    for path in glob.glob(pattern):
        base = os.path.basename(path)
        cname = base.replace("_eval.csv", "")
        results.append({
            "collection": cname,
            "csv_path": path,
            "summary": parse_summary(path),
        })
    return {"evals": results}


@app.get("/api/rag/evals/{collection}.csv", response_class=PlainTextResponse)
def get_eval_csv(collection: str, _=Depends(require_api_key)):
    out_dir = os.getenv("EVAL_OUT_DIR") or os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "eval_out"))
    path = os.path.join(out_dir, f"{collection}_eval.csv")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="not found")
    with open(path, encoding="utf-8") as f:
        return f.read()
