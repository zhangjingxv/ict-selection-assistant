from typing import Dict, Any

def hard_constraints_ok(req: Dict[str, Any], product: Dict[str, Any]) -> bool:
    budget = req.get("constraints", {}).get("budget")
    if budget is not None and product.get("price", budget) > budget * 1.2:
        return False
    return True
