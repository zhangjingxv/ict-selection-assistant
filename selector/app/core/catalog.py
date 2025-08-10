import csv
import json
import os
from typing import Dict, Any, List


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except Exception:
        return default


def _derive_metrics(category: str, base: Dict[str, Any]) -> Dict[str, float]:
    metrics: Dict[str, float] = {}
    spec = base.get("spec", {})

    if category == "server":
        sockets = _safe_float(spec.get("cpu_sockets", 0))
        mem_gb = _safe_float(spec.get("memory_max_gb", 0))
        nic_desc = str(spec.get("nic", "")).lower()
        nic_score = 0.0
        if "25g" in nic_desc:
            nic_score += 25.0
        if "10g" in nic_desc:
            nic_score += 10.0
        if "ocp" in nic_desc:
            nic_score += 5.0

        metrics.update({
            "cpu": sockets * 50.0,  # rough proxy
            "memory": mem_gb,
            "nic": nic_score,
            "reliability": 50.0 if spec.get("psu") else 20.0,
            "price": _safe_float(base.get("price", 0.0)),
        })

    elif category == "switch":
        ge = _safe_float(spec.get("ports_ge", 0))
        ten_ge = _safe_float(spec.get("ports_10ge", 0))
        up_25 = _safe_float(spec.get("uplinks_25g", 0))
        poe_w = _safe_float(spec.get("poe_total_w", 0))
        metrics.update({
            "cpu": ten_ge * 10.0 + up_25 * 25.0,
            "memory": poe_w,
            "nic": ge + ten_ge * 10.0 + up_25 * 25.0,
            "reliability": 40.0,
            "price": _safe_float(base.get("price", 0.0)),
        })

    elif category == "security":
        tput = _safe_float(spec.get("l7_tput_gbps", 0))
        ssl = _safe_float(spec.get("ssl_decrypt_gbps", 0))
        sessions_m = _safe_float(spec.get("concurrent_sessions_m", 0))
        new_conn = _safe_float(spec.get("new_connections_kps", 0))
        metrics.update({
            "cpu": tput * 100.0,
            "memory": sessions_m * 1000.0,
            "nic": ssl * 100.0,
            "reliability": 45.0,
            "price": _safe_float(base.get("price", 0.0)),
            "security": new_conn,
        })

    else:
        pass

    return metrics


def load_products(csv_path: str) -> List[Dict[str, Any]]:
    products: List[Dict[str, Any]] = []
    if not os.path.exists(csv_path):
        return products

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            category = row.get("category", "").strip().lower()
            brand = row.get("brand")
            model = row.get("model")
            spec_json = row.get("spec_json") or "{}"
            try:
                spec = json.loads(spec_json)
            except Exception:
                spec = {}

            base: Dict[str, Any] = {
                "category": category,
                "brand": brand,
                "model": model,
                "lifecycle_status": row.get("lifecycle_status"),
                "updated_at": row.get("updated_at"),
                "spec": spec,
            }

            base.update(_derive_metrics(category, base))
            products.append(base)

    return products


def load_capabilities(csv_path: str) -> List[Dict[str, Any]]:
    """Load parameterized capability templates instead of concrete SKUs.

    CSV columns:
      - category: server | switch | security
      - template: short name, e.g., virtualization_baseline
      - params_json: JSON object with parameter ranges and tags, e.g.,
        {"scenarios":["virtualization"], "compute":{...}, "network":{...}, "security":{...}}
      - notes: free text
      - updated_at: ISO date
    """
    caps: List[Dict[str, Any]] = []
    if not os.path.exists(csv_path):
        return caps
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                params = json.loads(row.get("params_json") or "{}")
            except Exception:
                params = {}
            caps.append({
                "category": (row.get("category") or "").strip().lower(),
                "template": row.get("template"),
                "params": params,
                "notes": row.get("notes"),
                "updated_at": row.get("updated_at"),
            })
    return caps


