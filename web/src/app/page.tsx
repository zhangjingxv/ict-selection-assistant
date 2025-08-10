"use client";
import React, { useMemo, useState } from 'react';
import { postPlan, getRubric, postInfer } from '@/lib/api';

const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000';

export default function Page() {
  const [scenario, setScenario] = useState('rag');
  const [qps, setQps] = useState(800);
  const [p95, setP95] = useState(300);
  const [payload, setPayload] = useState(6);
  const [growth, setGrowth] = useState(2.5);
  const [hit, setHit] = useState(0.7);
  const [emb, setEmb] = useState(1024);
  const [batch, setBatch] = useState(32);
  const [compliance, setCompliance] = useState('strict');
  const [avail, setAvail] = useState(0.7);
  const [latRisk, setLatRisk] = useState(0.6);

  const [provider, setProvider] = useState<'openai' | 'qwen'>('openai');
  const [model, setModel] = useState('gpt-4o-mini');

  const [plan, setPlan] = useState<any>(null);
  const [rubric, setRubric] = useState<any>(null);
  const [inferText, setInferText] = useState('用一句话总结参数化规划要点');
  const [inferResult, setInferResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const canInfer = useMemo(() => !!provider && !!model && !!inferText, [provider, model, inferText]);

  async function onPlan() {
    setLoading(true);
    try {
      const res = await postPlan(apiBase, {
        scenario,
        current: {
          qps_peak: Number(qps),
          latency_p95_ms: Number(p95),
          payload_kb: Number(payload),
          growth_12m: Number(growth),
          reads_per_request: 1.0,
          writes_per_request: 0.1,
          cache_hit_ratio: Number(hit),
        },
        data: { embedding_dim: Number(emb), batch: Number(batch) },
        constraints: { compliance },
        risk: { availability: Number(avail), latency: Number(latRisk) },
      });
      setPlan(res.plan);
    } finally {
      setLoading(false);
    }
  }

  async function onRubric() {
    const res = await getRubric(apiBase);
    setRubric(res.rubric);
  }

  async function onInfer() {
    setInferResult('');
    if (!canInfer) return;
    const res = await postInfer(apiBase, {
      provider,
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: '你是资深架构师，只输出简洁的要点。' },
        { role: 'user', content: inferText },
        plan ? { role: 'user', content: `参考规划: ${JSON.stringify(plan).slice(0, 4000)}` } : null,
      ].filter(Boolean),
    });
    const txt = res?.choices?.[0]?.message?.content || res?.error?.message || JSON.stringify(res).slice(0, 2000);
    setInferResult(txt);
  }

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <h1>ICT 选型助手（参数化规划 + RAM/RAG 评估）</h1>
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
          <h3>业务参数</h3>
          <div>场景
            <select value={scenario} onChange={(e) => setScenario(e.target.value)}>
              <option value="rag">RAG/RAM</option>
              <option value="virtualization">Virtualization</option>
              <option value="campus_access">Campus Access</option>
              <option value="sec_boundary">Security Boundary</option>
            </select>
          </div>
          <div>QPS 峰值 <input type="number" value={qps} onChange={(e)=>setQps(Number(e.target.value))} /></div>
          <div>P95 延迟(ms) <input type="number" value={p95} onChange={(e)=>setP95(Number(e.target.value))} /></div>
          <div>请求大小(KB) <input type="number" value={payload} onChange={(e)=>setPayload(Number(e.target.value))} /></div>
          <div>12月增长倍数 <input type="number" step="0.1" value={growth} onChange={(e)=>setGrowth(Number(e.target.value))} /></div>
          <div>缓存命中率(0-1) <input type="number" step="0.01" value={hit} onChange={(e)=>setHit(Number(e.target.value))} /></div>
          <div>嵌入维度 <input type="number" value={emb} onChange={(e)=>setEmb(Number(e.target.value))} /></div>
          <div>批大小 <input type="number" value={batch} onChange={(e)=>setBatch(Number(e.target.value))} /></div>
          <div>合规类型
            <select value={compliance} onChange={(e)=>setCompliance(e.target.value)}>
              <option value="strict">strict</option>
              <option value="regulated">regulated</option>
              <option value="legacy">legacy</option>
            </select>
          </div>
          <div>可用性偏好(0-1) <input type="number" step="0.01" value={avail} onChange={(e)=>setAvail(Number(e.target.value))} /></div>
          <div>延迟偏好(0-1) <input type="number" step="0.01" value={latRisk} onChange={(e)=>setLatRisk(Number(e.target.value))} /></div>
          <button onClick={onPlan} disabled={loading}>{loading ? '计算中…' : '生成参数化规划'}</button>
          <button onClick={onRubric} style={{ marginLeft: 8 }}>获取评估Rubric</button>
        </div>

        <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
          <h3>推理提供商(代理)</h3>
          <div>Provider
            <select value={provider} onChange={(e)=>setProvider(e.target.value as any)}>
              <option value="openai">OpenAI</option>
              <option value="qwen">千问(Qwen)</option>
            </select>
          </div>
          <div>Model <input value={model} onChange={(e)=>setModel(e.target.value)} placeholder="gpt-4o-mini 或 qwen-turbo" /></div>
          <div>
            <textarea value={inferText} onChange={(e)=>setInferText(e.target.value)} rows={5} style={{ width: '100%' }} />
          </div>
          <button onClick={onInfer} disabled={!canInfer}>调用 /api/llm/infer</button>
          {inferResult && (
            <pre style={{ whiteSpace: 'pre-wrap', background: '#fafafa', padding: 8 }}>{inferResult}</pre>
          )}
        </div>
      </section>

      <section style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <h3>参数化规划结果</h3>
          <pre style={{ background: '#fafafa', padding: 12, whiteSpace: 'pre-wrap' }}>{plan ? JSON.stringify(plan, null, 2) : '尚未生成'}</pre>
        </div>
        <div>
          <h3>RAM/RAG 评估 Rubric</h3>
          <pre style={{ background: '#fafafa', padding: 12, whiteSpace: 'pre-wrap' }}>{rubric ? JSON.stringify(rubric, null, 2) : '点击上方按钮获取'}</pre>
        </div>
      </section>
      <footer style={{ marginTop: 24, color: '#666' }}>API: {apiBase}</footer>
    </main>
  );
}


