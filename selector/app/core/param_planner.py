from typing import Dict, Any


def _ceil_div(a: float, b: float) -> int:
    if b <= 0:
        return int(a)
    return int((a + b - 1) // b) if isinstance(a, int) and isinstance(b, int) else int(-(-a // b))


def plan_parameters(req: Dict[str, Any]) -> Dict[str, Any]:
    # Extract inputs with defaults
    scenario = str(req.get("scenario", "generic")).lower()
    current = req.get("current", {})
    data = req.get("data", {})
    constraints = req.get("constraints", {})
    risk = req.get("risk", {})

    qps_peak = float(current.get("qps_peak", 500))
    p95_ms = float(current.get("latency_p95_ms", 200))
    payload_kb = float(current.get("payload_kb", 8))
    growth_12m = float(current.get("growth_12m", 2.0))  # x-fold

    reads_per_req = float(current.get("reads_per_request", 1.2))
    writes_per_req = float(current.get("writes_per_request", 0.2))
    cache_hit_ratio = float(current.get("cache_hit_ratio", 0.6))

    # Derived workload
    concurrency = max(1.0, qps_peak * (p95_ms / 1000.0))
    concurrency_12m = concurrency * growth_12m

    # Compute sizing (very rough heuristics)
    vcpu_per_req = 0.02 if cache_hit_ratio >= 0.7 else 0.03
    vcpu_needed = max(2.0, concurrency_12m * vcpu_per_req)
    mem_per_req_mb = 10.0 + payload_kb / 2.0
    mem_needed_gb = max(2.0, (concurrency_12m * mem_per_req_mb) / 1024.0)

    enable_gpu = scenario in {"ai_infer", "ai_train", "rag", "ram"}
    gpu_mem_gb = 0.0
    if enable_gpu:
        # Assume embedding dim and batch
        emb_dim = int(data.get("embedding_dim", 1024))
        batch = int(data.get("batch", 16))
        gpu_mem_gb = max(8.0, emb_dim * batch / 1000.0)

    # Queueing & autoscale
    queue_len = int(concurrency_12m * 0.5)
    autoscale_up_cpu = 0.6 if risk.get("latency", 0.3) >= 0.5 else 0.75
    autoscale_down_cpu = max(0.2, autoscale_up_cpu - 0.25)

    # Storage sizing
    hot_tps = qps_peak * (reads_per_req + writes_per_req)
    # IOPS assuming 70% random reads, 30% writes; SSD baseline
    iops = hot_tps * (0.7 / max(0.001, cache_hit_ratio) + 0.3)
    throughput_mb_s = qps_peak * payload_kb / 1024.0
    hot_capacity_tb = float(current.get("hot_capacity_tb", 2.0)) * growth_12m
    cold_capacity_tb = float(current.get("cold_capacity_tb", 10.0)) * growth_12m
    rpo_min = 5 if risk.get("availability", 0.5) >= 0.6 else 15
    rto_min = 15 if risk.get("availability", 0.5) >= 0.6 else 60

    # Network sizing
    north_south_gbps = throughput_mb_s * 8 / 1024.0
    east_west_gbps = north_south_gbps * 2.0
    tls = "TLS1.3" if constraints.get("compliance", "strict") != "legacy" else "TLS1.2+"
    target_p95_ms = min(p95_ms, 200.0)

    # Security posture
    waf_level = "strict" if scenario in {"sec_boundary", "waf", "public_api"} else "balanced"
    edr_coverage = "100% servers & endpoints"
    log_retention_days = 180 if constraints.get("compliance", "strict") in {"strict", "regulated"} else 90

    # Observability
    metrics_retention_days = 30
    logs_retention_days = log_retention_days
    traces_sampling = 0.1 if qps_peak > 2000 else 0.3
    slo_error_budget = 0.01 if risk.get("availability", 0.5) >= 0.6 else 0.02

    plan = {
        "compute": {
            "concurrency_now": round(concurrency, 1),
            "concurrency_12m": round(concurrency_12m, 1),
            "vcpu_range": [int(vcpu_needed * 0.8), int(vcpu_needed * 1.2 + 1)],
            "memory_gb_range": [round(mem_needed_gb * 0.8, 1), round(mem_needed_gb * 1.2, 1)],
            "gpu_required": enable_gpu,
            "gpu_mem_gb_min": round(gpu_mem_gb, 1) if enable_gpu else 0,
            "batch_size": int(data.get("batch", 16)),
            "queue_length": queue_len,
            "autoscale_cpu_up": autoscale_up_cpu,
            "autoscale_cpu_down": autoscale_down_cpu,
            "explain": "并发≈QPS×(P95/1000)。vCPU≈并发×每请求CPU(随缓存命中率调整)。显存≈embedding_dim×batch/1000。",
        },
        "storage": {
            "hot_capacity_tb": round(hot_capacity_tb, 1),
            "cold_capacity_tb": round(cold_capacity_tb, 1),
            "iops_required": int(iops),
            "throughput_mb_s": round(throughput_mb_s, 2),
            "tiering": "hot:warm:cold with lifecycle policies",
            "backup_snapshot_hours": 6 if constraints.get("compliance", "strict") == "strict" else 12,
            "rpo_minutes": rpo_min,
            "rto_minutes": rto_min,
            "explain": "IOPS≈QPS×(读写系数/命中率)+写入系数；吞吐≈QPS×请求大小。容量按12月增长倍数外推。",
        },
        "network": {
            "north_south_gbps": round(north_south_gbps, 2),
            "east_west_gbps": round(east_west_gbps, 2),
            "max_connections": int(concurrency_12m * 5),
            "latency_p95_ms_target": target_p95_ms,
            "tls_policy": tls,
            "topology": "segmented: internet | dmz | app | data; zero-trust between segments",
            "explain": "南北向≈吞吐(MB/s)×8/1024；东西向≈南北×2；连接数≈并发(12m)×5。",
        },
        "security": {
            "iam": "least-privilege + JIT access + MFA",
            "waf_level": waf_level,
            "ips_ids": "enabled at boundary; tuned for false positives",
            "edr_coverage": edr_coverage,
            "log_retention_days": log_retention_days,
            "compliance": constraints.get("compliance", "strict"),
            "explain": "公网边界WAF建议strict；合规越高，日志留存越长；最小权限与MFA为默认基线。",
        },
        "observability": {
            "metrics_retention_days": metrics_retention_days,
            "logs_retention_days": logs_retention_days,
            "traces_sampling": traces_sampling,
            "slo_error_budget": slo_error_budget,
            "alerting": {
                "cpu_high": 0.8,
                "mem_high": 0.8,
                "latency_p95_ms": target_p95_ms * 1.2,
                "error_rate": 0.01,
            },
            "explain": "采样率依据QPS调整；错误预算1–2%；P95告警阈值=目标×1.2。",
        },
    }
    return plan


def default_rag_rubric() -> Dict[str, Any]:
    return {
        "metrics": [
            {"name": "Recall@k", "desc": "Relevant evidence retrieved", "target": 0.8},
            {"name": "Precision@k", "desc": "Irrelevant ratio low", "target": 0.85},
            {"name": "Faithfulness", "desc": "Grounded to sources", "target": 0.9},
            {"name": "Correctness", "desc": "Task answer correct", "target": 0.85},
            {"name": "Coverage", "desc": "Covers all aspects", "target": 0.8},
            {"name": "Consistency", "desc": "Stable across runs", "target": 0.8},
            {"name": "Latency P95 (ms)", "desc": "End-to-end", "target": 2000},
        ],
        "sampling": {
            "size": 300,
            "hard_cases_ratio": 0.3,
            "dedup": True,
            "leakage_check": True,
        },
        "labeling": {
            "scale": [0, 1, 2, 3],
            "instructions_url": "",
            "iaa_threshold": 0.75,
            "adjudication": "double-blind + tie-breaker",
        },
        "acceptance": {
            "Recall@k": ">=0.8",
            "Precision@k": ">=0.85",
            "Faithfulness": ">=0.9",
            "Correctness": ">=0.85",
            "Latency P95 (ms)": "<=2000",
            "window": "rolling 2 weeks",
        },
        "dashboard_fields": [
            "version", "data_sources", "metrics", "conf_int", "trend_7d", "notes"
        ],
    }


