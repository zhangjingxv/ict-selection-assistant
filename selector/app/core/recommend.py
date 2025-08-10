from typing import Dict, Any, List

from .param_planner import plan_parameters


def _scenario_focus(scenario: str) -> List[str]:
    s = (scenario or "").lower()
    if s in {"rag", "ram", "ai_infer", "ai_train"}:
        return ["compute", "network", "storage", "security"]
    if s in {"virtualization", "olap"}:
        return ["compute", "storage", "network", "security"]
    if s in {"campus_access", "datacenter_fabric"}:
        return ["network", "security", "compute"]
    if s in {"sec_boundary", "ngfw", "waf"}:
        return ["security", "network", "compute"]
    return ["compute", "storage", "network", "security"]


def _budget_modifier(tier: str) -> Dict[str, float]:
    t = (tier or "medium").lower()
    if t in {"low", "l"}:
        return {"headroom": 0.15}
    if t in {"high", "h"}:
        return {"headroom": 0.35}
    return {"headroom": 0.25}


def _security_modifier(level: str) -> Dict[str, Any]:
    l = (level or "baseline").lower()
    if l in {"strict", "enhanced"}:
        return {"waf": "strict", "log_retention_days": 180, "zero_trust": True}
    return {"waf": "balanced", "log_retention_days": 90, "zero_trust": True}


def generate_recommendation(customer_req: Dict[str, Any], evidence_hits: List[Dict[str, Any]] | None = None) -> Dict[str, Any]:
    plan = plan_parameters(customer_req)
    scenario = customer_req.get("scenario", "generic")
    focus = _scenario_focus(scenario)
    budget_mod = _budget_modifier(customer_req.get("budget_tier", "medium"))
    sec_mod = _security_modifier(customer_req.get("security_level", "baseline"))

    headroom = budget_mod.get("headroom", 0.25)

    # Compute expansions
    c = plan["compute"]
    vcpu_min, vcpu_max = c["vcpu_range"]
    mem_min, mem_max = c["memory_gb_range"]
    rec_compute = {
        "expand": [
            {"item": "cpu", "suggestion": f"提升 {int((1+headroom)*100)}% vCPU 余量", "range": [vcpu_min, int(vcpu_max*(1+headroom))]},
            {"item": "memory", "suggestion": f"保留 {int(headroom*100)}% 内存余量", "range": [mem_min, round(mem_max*(1+headroom), 1)]},
        ]
    }
    if c.get("gpu_required"):
        rec_compute["expand"].append({"item": "gpu", "suggestion": "配置推理/嵌入专用 GPU", "min_vram_gb": c.get("gpu_mem_gb_min", 0)})

    # Storage expansions
    s = plan["storage"]
    rec_storage = {
        "expand": [
            {"item": "hot_capacity_tb", "suggestion": "提升热点区容量并启用冷热分层", "target": s["hot_capacity_tb"]},
            {"item": "iops", "suggestion": "满足 IOPS 与吞吐目标，必要时采用多盘并行/分片", "target": s["iops_required"]},
        ],
        "policy": {"rpo_minutes": s["rpo_minutes"], "rto_minutes": s["rto_minutes"]},
    }

    # Network expansions
    n = plan["network"]
    rec_network = {
        "expand": [
            {"item": "north_south_gbps", "suggestion": "南北向带宽预留增长空间", "target": n["north_south_gbps"]},
            {"item": "east_west_gbps", "suggestion": "提升东西向带宽与分区策略", "target": n["east_west_gbps"]},
        ],
        "topology": n["topology"],
        "latency_p95_ms_target": n["latency_p95_ms_target"],
        "tls_policy": n["tls_policy"],
    }

    # Security expansions
    sec = plan["security"].copy()
    sec["waf_level"] = sec_mod["waf"]
    sec["log_retention_days"] = max(sec.get("log_retention_days", 90), sec_mod["log_retention_days"])
    rec_security = {
        "baseline": sec,
        "actions": [
            "分区分域+最小权限+MFA",
            "边界处启用 WAF/IPS 并持续调优",
            "100% 终端/服务器 EDR 覆盖",
        ],
    }

    # Observability
    o = plan["observability"]
    rec_obs = {
        "retention": {"metrics_days": o["metrics_retention_days"], "logs_days": o["logs_retention_days"]},
        "slo_error_budget": o["slo_error_budget"],
        "alerts": o["alerting"],
    }

    result = {
        "focus": focus,
        "compute": rec_compute,
        "storage": rec_storage,
        "network": rec_network,
        "security": rec_security,
        "observability": rec_obs,
        "explain": {
            "compute": c.get("explain"),
            "storage": s.get("explain"),
            "network": n.get("explain"),
        },
    }

    if evidence_hits:
        # keep only top-N and essential fields
        ev = []
        for h in (evidence_hits or [])[:5]:
            ev.append({
                "id": h.get("id"),
                "score": h.get("score"),
                "text": h.get("text"),
                "source": ((h.get("payload") or {}).get("source")),
            })
        result["evidence"] = ev

    return result


