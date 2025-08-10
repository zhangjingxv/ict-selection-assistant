const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000';

// 通用API调用函数
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE}${endpoint}`;
  const apiKey = localStorage.getItem('api_key');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API调用失败: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// 推荐相关API
export async function postRecommend(apiBase: string, body: any) {
  return apiCall('/api/recommend', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function postRecommendExport(apiBase: string, body: any) {
  const response = await fetch(`${apiBase}/api/recommend/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': localStorage.getItem('api_key') || '',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`导出失败: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

// RAG相关API
export async function ragIndex(apiBase: string, body: any) {
  return apiCall('/api/rag/index', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function ragSearch(apiBase: string, body: any) {
  return apiCall('/api/rag/search', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function ragEvaluate(apiBase: string, body: any) {
  return apiCall('/api/rag/evaluate', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// 集合管理API
export async function getCollections(apiBase: string) {
  return apiCall('/api/rag/collections');
}

export async function deleteCollection(apiBase: string, name: string) {
  return apiCall(`/api/rag/collections/${name}`, {
    method: 'DELETE',
  });
}

export async function resetBM25(apiBase: string, name: string) {
  return apiCall(`/api/rag/collections/${name}/reset-bm25`, {
    method: 'POST',
  });
}

// 评测结果API
export async function getEvals(apiBase: string) {
  return apiCall('/api/rag/evals');
}

export async function getEvalCSV(apiBase: string, collection: string) {
  const response = await fetch(`${apiBase}/api/rag/evals/${collection}.csv`, {
    headers: {
      'x-api-key': localStorage.getItem('api_key') || '',
    },
  });

  if (!response.ok) {
    throw new Error(`获取CSV失败: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

// LLM代理API
export async function llmInfer(apiBase: string, body: any) {
  return apiCall('/api/llm/infer', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// 健康检查
export async function healthCheck(apiBase: string) {
  return apiCall('/health');
}

// 参数化规划API
export async function postPlan(apiBase: string, body: any) {
  return apiCall('/api/plan', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// 获取评估Rubric API
export async function getRubric(apiBase: string) {
  return apiCall('/api/rubric');
}

// 推理API
export async function postInfer(apiBase: string, body: any) {
  return apiCall('/api/llm/infer', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}


