"use client";
import React, { useState } from 'react';
import { postRecommend, ragIndex, ragSearch, ragEvaluate, postRecommendExport } from '@/lib/api';

const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000';

export default function RecommendPage() {
  const [scenario, setScenario] = useState('rag');
  const [qps, setQps] = useState(800);
  const [p95, setP95] = useState(300);
  const [payload, setPayload] = useState(6);
  const [growth, setGrowth] = useState(2.5);
  const [hit, setHit] = useState(0.7);
  const [emb, setEmb] = useState(1024);
  const [batch, setBatch] = useState(32);
  const [compliance, setCompliance] = useState('strict');
  const [budget, setBudget] = useState('medium');
  const [sec, setSec] = useState('strict');
  const [query, setQuery] = useState('RAG的P95与错误预算');

  // RAG搜索参数
  const [useRerank, setUseRerank] = useState(true);
  const [alpha, setAlpha] = useState(0.7);
  const [topk, setTopk] = useState(10);
  const [sortBy, setSortBy] = useState('score'); // score, bm25, kw_score, combo

  const [recommendation, setRecommendation] = useState<any>(null);
  const [hits, setHits] = useState<any>(null);
  const [evalSummary, setEvalSummary] = useState<any>(null);
  const [md, setMd] = useState<string>('');
  const [loading, setLoading] = useState(false);

  async function onRecommend() {
    setLoading(true);
    try {
      const body = {
        scenario,
        current: { qps_peak: Number(qps), latency_p95_ms: Number(p95), payload_kb: Number(payload), growth_12m: Number(growth), reads_per_request: 1.0, writes_per_request: 0.1, cache_hit_ratio: Number(hit) },
        data: { embedding_dim: Number(emb), batch: Number(batch) },
        constraints: { compliance },
        risk: { availability: 0.7, latency: 0.6 },
        budget_tier: budget,
        security_level: sec,
        evidence_query: query
      };
      const res = await postRecommend(apiBase, body);
      setRecommendation(res.recommendation);
    } catch (error) {
      console.error('推荐生成失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function onIndexDemo() {
    setLoading(true);
    try {
      const body = {
        collection: 'ict_docs',
        provider: 'qwen',
        model: 'text-embedding-v2',
        docs: [
          { id: 'a1', text: 'RAG系统的带宽与延迟受检索吞吐与模型推理影响，应设置P95目标与错误预算。', meta: { source: 'guide', category: 'performance' } },
          { id: 'a2', text: '安全边界建议启用WAF严格模式并结合IPS，日志保留180天以满足合规审计。', meta: { source: 'security', category: 'security' } },
          { id: 'a3', text: '参数化扩容计算并发≈QPS×(P95/1000)，并按增长倍数外推12个月容量。', meta: { source: 'capacity', category: 'planning' } },
          { id: 'a4', text: '混合搜索结合向量相似度与BM25词汇匹配，alpha参数控制权重平衡。', meta: { source: 'search', category: 'algorithm' } },
          { id: 'a5', text: 'RAG评估指标包括Recall@k、Precision@k、延迟P95，需定期监控检索质量。', meta: { source: 'evaluation', category: 'monitoring' } },
        ],
      };
      await ragIndex(apiBase, body);
      alert('示例文档索引完成！');
    } catch (error) {
      console.error('索引失败:', error);
      alert('索引失败，请检查API状态');
    } finally {
      setLoading(false);
    }
  }

  async function onSearch() {
    setLoading(true);
    try {
      const res = await ragSearch(apiBase, { 
        collection: 'ict_docs', 
        provider: 'qwen', 
        model: 'text-embedding-v2', 
        query, 
        topk: Number(topk),
        rerank: useRerank,
        alpha: Number(alpha)
      });
      setHits(res.hits || res.result || res);
    } catch (error) {
      console.error('检索失败:', error);
      alert('检索失败，请检查API状态');
    } finally {
      setLoading(false);
    }
  }

  async function onEvaluate() {
    setLoading(true);
    try {
      const res = await ragEvaluate(apiBase, {
        collection: 'ict_docs', 
        provider: 'qwen', 
        model: 'text-embedding-v2', 
        topk: 3,
        samples: [
          { query: 'RAG的P95与错误预算', relevant_ids: ['a1', 'a5'] },
          { query: '启用WAF严格模式的建议', relevant_ids: ['a2'] },
          { query: '参数化扩容计算方法', relevant_ids: ['a3'] },
        ],
      });
      setEvalSummary(res.summary);
    } catch (error) {
      console.error('评测失败:', error);
      alert('评测失败，请检查API状态');
    } finally {
      setLoading(false);
    }
  }

  async function onExportMD() {
    setLoading(true);
    try {
      const body = {
        scenario,
        current: { qps_peak: Number(qps), latency_p95_ms: Number(p95), payload_kb: Number(payload), growth_12m: Number(growth), reads_per_request: 1.0, writes_per_request: 0.1, cache_hit_ratio: Number(hit) },
        data: { embedding_dim: Number(emb), batch: Number(batch) },
        constraints: { compliance },
        risk: { availability: 0.7, latency: 0.6 },
        budget_tier: budget,
        security_level: sec,
        evidence_query: query
      };
      const text = await postRecommendExport(apiBase, body);
      setMd(text);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请检查API状态');
    } finally {
      setLoading(false);
    }
  }

  // 排序证据结果
  const sortedHits = hits ? [...hits].sort((a, b) => {
    switch (sortBy) {
      case 'score':
        return (b.score || 0) - (a.score || 0);
      case 'bm25':
        return (b.bm25_score || 0) - (a.bm25_score || 0);
      case 'kw_score':
        return (b.kw_score || 0) - (a.kw_score || 0);
      case 'combo':
        return (b.combo_score || 0) - (a.combo_score || 0);
      default:
        return 0;
    }
  }) : [];

  return (
    <main style={{ maxWidth: 1400, margin: '0 auto', padding: 24 }}>
      <h1>🎯 ICT选型助手 - 基于RAG的智能推荐</h1>
      
      {/* 参数配置区域 */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div style={{ border: '1px solid #e1e5e9', padding: 20, borderRadius: 12, backgroundColor: '#fafbfc' }}>
          <h3 style={{ color: '#24292f', marginBottom: 16 }}>📊 业务场景参数</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>场景类型</label>
              <select value={scenario} onChange={(e) => setScenario(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d0d7de' }}>
                <option value="rag">RAG/RAM 系统</option>
                <option value="virtualization">虚拟化平台</option>
                <option value="campus_access">园区接入</option>
                <option value="sec_boundary">安全边界</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>QPS 峰值</label>
                <input type="number" value={qps} onChange={(e)=>setQps(Number(e.target.value))} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d0d7de' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>P95 延迟(ms)</label>
                <input type="number" value={p95} onChange={(e)=>setP95(Number(e.target.value))} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d0d7de' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>请求大小(KB)</label>
                <input type="number" value={payload} onChange={(e)=>setPayload(Number(e.target.value))} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d0d7de' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>12月增长倍数</label>
                <input type="number" step="0.1" value={growth} onChange={(e)=>setGrowth(Number(e.target.value))} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d0d7de' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>缓存命中率</label>
                <input type="number" step="0.01" min="0" max="1" value={hit} onChange={(e)=>setHit(Number(e.target.value))} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d0d7de' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>嵌入维度</label>
                <input type="number" value={emb} onChange={(e)=>setEmb(Number(e.target.value))} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d0d7de' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>批大小</label>
                <input type="number" value={batch} onChange={(e)=>setBatch(Number(e.target.value))} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d0d7de' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>合规类型</label>
                <select value={compliance} onChange={(e)=>setCompliance(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d0d7de' }}>
                  <option value="strict">严格合规</option>
                  <option value="regulated">受监管</option>
                  <option value="legacy">传统模式</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>预算等级</label>
                <select value={budget} onChange={(e)=>setBudget(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d0d7de' }}>
                  <option value="low">经济型</option>
                  <option value="medium">标准型</option>
                  <option value="high">高性能</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>安全等级</label>
                <select value={sec} onChange={(e)=>setSec(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d0d7de' }}>
                  <option value="baseline">基础安全</option>
                  <option value="strict">严格安全</option>
                  <option value="enhanced">增强安全</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>证据查询</label>
              <input value={query} onChange={(e)=>setQuery(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d0d7de' }} placeholder="输入查询关键词..." />
            </div>
          </div>
        </div>

        <div style={{ border: '1px solid #e1e5e9', padding: 20, borderRadius: 12, backgroundColor: '#fafbfc' }}>
          <h3 style={{ color: '#24292f', marginBottom: 16 }}>🔍 RAG搜索配置</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                <input type="checkbox" checked={useRerank} onChange={(e) => setUseRerank(e.target.checked)} style={{ marginRight: 8 }} />
                启用混合搜索 (BM25 + 向量)
              </label>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>权重平衡 (α)</label>
              <input type="range" min="0" max="1" step="0.1" value={alpha} onChange={(e)=>setAlpha(Number(e.target.value))} style={{ width: '100%' }} />
              <span style={{ fontSize: '0.9em', color: '#656d76' }}>向量: {alpha} | BM25: {1-alpha}</span>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>检索数量 (TopK)</label>
              <input type="number" min="1" max="50" value={topk} onChange={(e)=>setTopk(Number(e.target.value))} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d0d7de' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>证据排序方式</label>
              <select value={sortBy} onChange={(e)=>setSortBy(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d0d7de' }}>
                <option value="score">向量相似度</option>
                <option value="bm25">BM25词汇匹配</option>
                <option value="kw_score">关键词密度</option>
                <option value="combo">混合分数</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* 操作按钮区域 */}
      <section style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button 
            onClick={onRecommend} 
            disabled={loading}
            style={{ 
              padding: '12px 24px', 
              backgroundColor: '#0969da', 
              color: 'white', 
              border: 'none', 
              borderRadius: 8, 
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? '生成中...' : '🚀 生成推荐方案'}
          </button>
          <button 
            onClick={onIndexDemo} 
            disabled={loading}
            style={{ 
              padding: '12px 24px', 
              backgroundColor: '#1a7f37', 
              color: 'white', 
              border: 'none', 
              borderRadius: 8, 
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            📚 索引示例文档
          </button>
          <button 
            onClick={onSearch} 
            disabled={loading}
            style={{ 
              padding: '12px 24px', 
              backgroundColor: '#9a6700', 
              color: 'white', 
              border: 'none', 
              borderRadius: 8, 
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            🔍 检索证据
          </button>
          <button 
            onClick={onEvaluate} 
            disabled={loading}
            style={{ 
              padding: '12px 24px', 
              backgroundColor: '#cf222e', 
              color: 'white', 
              border: 'none', 
              borderRadius: 8, 
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            📊 评测检索质量
          </button>
          <button 
            onClick={onExportMD} 
            disabled={loading}
            style={{ 
              padding: '12px 24px', 
              backgroundColor: '#8250df', 
              color: 'white', 
              border: 'none', 
              borderRadius: 8, 
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            📄 导出Markdown
          </button>
        </div>
      </section>

      {/* 结果展示区域 */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div style={{ border: '1px solid #e1e5e9', padding: 20, borderRadius: 12, backgroundColor: '#fafbfc' }}>
          <h3 style={{ color: '#24292f', marginBottom: 16 }}>🎯 推荐方案</h3>
          <div style={{ background: '#ffffff', padding: 16, borderRadius: 8, border: '1px solid #d0d7de', maxHeight: 400, overflow: 'auto' }}>
            {recommendation ? (
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.9em' }}>
                {JSON.stringify(recommendation, null, 2)}
              </pre>
            ) : (
              <p style={{ color: '#656d76', textAlign: 'center', margin: 0 }}>点击"生成推荐方案"开始</p>
            )}
          </div>
        </div>

        <div style={{ border: '1px solid #e1e5e9', padding: 20, borderRadius: 12, backgroundColor: '#fafbfc' }}>
          <h3 style={{ color: '#24292f', marginBottom: 16 }}>📊 评测概览</h3>
          <div style={{ background: '#ffffff', padding: 16, borderRadius: 8, border: '1px solid #d0d7de', maxHeight: 400, overflow: 'auto' }}>
            {evalSummary ? (
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.9em' }}>
                {JSON.stringify(evalSummary, null, 2)}
              </pre>
            ) : (
              <p style={{ color: '#656d76', textAlign: 'center', margin: 0 }}>点击"评测检索质量"开始</p>
            )}
          </div>
        </div>
      </section>

      {/* 证据检索结果 */}
      <section style={{ marginBottom: 24 }}>
        <div style={{ border: '1px solid #e1e5e9', padding: 20, borderRadius: 12, backgroundColor: '#fafbfc' }}>
          <h3 style={{ color: '#24292f', marginBottom: 16 }}>🔍 检索证据 (已排序)</h3>
          {hits ? (
            <div style={{ background: '#ffffff', padding: 16, borderRadius: 8, border: '1px solid #d0d7de', maxHeight: 500, overflow: 'auto' }}>
              {sortedHits.map((hit: any, index: number) => (
                <div key={index} style={{ 
                  border: '1px solid #e1e5e9', 
                  padding: 16, 
                  marginBottom: 12, 
                  borderRadius: 8, 
                  backgroundColor: '#f6f8fa' 
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, color: '#24292f' }}>证据 #{index + 1}</span>
                    <div style={{ display: 'flex', gap: 16, fontSize: '0.9em' }}>
                      <span>向量: {(hit.score || 0).toFixed(3)}</span>
                      {hit.bm25_score && <span>BM25: {(hit.bm25_score || 0).toFixed(3)}</span>}
                      {hit.kw_score && <span>关键词: {(hit.kw_score || 0).toFixed(3)}</span>}
                      {hit.combo_score && <span>混合: {(hit.combo_score || 0).toFixed(3)}</span>}
                    </div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>内容:</strong> {hit.payload?.text || hit.text || '无文本内容'}
                  </div>
                  {hit.payload?.meta && (
                    <div style={{ fontSize: '0.9em', color: '#656d76' }}>
                      <strong>元数据:</strong> {JSON.stringify(hit.payload.meta)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#656d76', textAlign: 'center', margin: 0 }}>点击"检索证据"开始</p>
          )}
        </div>
      </section>

      {/* Markdown导出 */}
      <section>
        <div style={{ border: '1px solid #e1e5e9', padding: 20, borderRadius: 12, backgroundColor: '#fafbfc' }}>
          <h3 style={{ color: '#24292f', marginBottom: 16 }}>📄 Markdown 报告</h3>
          <div style={{ background: '#ffffff', padding: 16, borderRadius: 8, border: '1px solid #d0d7de', maxHeight: 400, overflow: 'auto' }}>
            {md ? (
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.9em' }}>
                {md}
              </pre>
            ) : (
              <p style={{ color: '#656d76', textAlign: 'center', margin: 0 }}>点击"导出Markdown"生成结构化报告</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}


