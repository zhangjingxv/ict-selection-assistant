// Simple API client for ICT Selection Assistant
// All functions accept a base URL, typically from NEXT_PUBLIC_API_BASE

type Json = any;

const defaultHeaders = (apiKey?: string) => {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) h['x-api-key'] = apiKey;
  return h;
};

async function http<T = Json>(
  url: string,
  options?: RequestInit & { responseType?: 'json' | 'text' }
): Promise<T extends string ? string : any> {
  const { responseType = 'json', ...rest } = options || {};
  const res = await fetch(url, rest);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  if (responseType === 'text') {
    return (await res.text()) as any;
  }
  return (await res.json()) as any;
}

// ---------- Core APIs ----------

export async function postPlan(base: string, body: Json, apiKey?: string) {
  return http(`${base}/api/plan`, {
    method: 'POST',
    headers: defaultHeaders(apiKey),
    body: JSON.stringify(body),
  });
}

export async function getRubric(base: string, apiKey?: string) {
  return http(`${base}/api/rag/rubric`, {
    headers: defaultHeaders(apiKey),
  });
}

export async function postInfer(base: string, body: Json, apiKey?: string) {
  return http(`${base}/api/llm/infer`, {
    method: 'POST',
    headers: defaultHeaders(apiKey),
    body: JSON.stringify(body),
  });
}

// ---------- RAG APIs ----------

export async function ragIndex(base: string, body: Json, apiKey?: string) {
  return http(`${base}/api/rag/index`, {
    method: 'POST',
    headers: defaultHeaders(apiKey),
    body: JSON.stringify(body),
  });
}

export async function ragSearch(base: string, body: Json, apiKey?: string) {
  return http(`${base}/api/rag/search`, {
    method: 'POST',
    headers: defaultHeaders(apiKey),
    body: JSON.stringify(body),
  });
}

export async function ragEvaluate(base: string, body: Json, apiKey?: string) {
  return http(`${base}/api/rag/evaluate`, {
    method: 'POST',
    headers: defaultHeaders(apiKey),
    body: JSON.stringify(body),
  });
}

export async function getCollections(base: string, apiKey?: string) {
  const res = await http(`${base}/api/rag/collections`, {
    headers: defaultHeaders(apiKey),
  });
  // Normalize to array of { name, vectors_count? }
  const rawList: any[] =
    res?.raw?.result?.collections && Array.isArray(res.raw.result.collections)
      ? res.raw.result.collections
      : [];
  // If backend already returns objects with name, prefer it
  const collections = Array.isArray(res.collections)
    ? res.collections.map((c: any) =>
        typeof c === 'string'
          ? { name: c, vectors_count: (rawList.find((r: any) => r?.name === c) || {}).vectors_count }
          : c
      )
    : rawList;
  return { collections };
}

export async function deleteCollection(base: string, name: string, apiKey?: string) {
  return http(`${base}/api/rag/collections/${encodeURIComponent(name)}`, {
    method: 'DELETE',
    headers: defaultHeaders(apiKey),
  });
}

export async function resetBM25(base: string, name: string, apiKey?: string) {
  return http(`${base}/api/rag/collections/${encodeURIComponent(name)}/reset-bm25`, {
    method: 'POST',
    headers: defaultHeaders(apiKey),
  });
}

export async function getEvals(base: string, apiKey?: string) {
  const res = await http(`${base}/api/rag/evals`, {
    headers: defaultHeaders(apiKey),
  });
  // Normalize to UI-friendly rows
  const now = Date.now();
  const evals = (res?.evals || []).map((e: any) => ({
    collection: e.collection,
    timestamp: now,
    recall_at_3: e.summary?.['Recall@k'] ?? null,
    precision_at_3: e.summary?.['Precision@k'] ?? null,
    latency_p95: e.summary?.['Latency P95 (ms)'] ?? null,
  }));
  return { evals };
}

export async function getEvalCSV(base: string, collection: string, apiKey?: string) {
  return http<string>(`${base}/api/rag/evals/${encodeURIComponent(collection)}.csv`, {
    headers: defaultHeaders(apiKey),
    responseType: 'text',
  });
}

// ---------- Recommend APIs ----------

export async function postRecommend(base: string, body: Json, apiKey?: string) {
  return http(`${base}/api/recommend`, {
    method: 'POST',
    headers: defaultHeaders(apiKey),
    body: JSON.stringify(body),
  });
}

export async function postRecommendExport(base: string, body: Json, apiKey?: string) {
  return http<string>(`${base}/api/recommend/export`, {
    method: 'POST',
    headers: defaultHeaders(apiKey),
    body: JSON.stringify(body),
    responseType: 'text',
  });
}
// Note: all higher-level convenience wrappers removed to avoid duplicate exports.


