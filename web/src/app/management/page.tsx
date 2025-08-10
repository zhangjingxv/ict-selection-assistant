"use client";
import React, { useState, useEffect } from 'react';
import { ragIndex, ragSearch, ragEvaluate, getCollections, deleteCollection, resetBM25, getEvals, getEvalCSV } from '@/lib/api';

const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000';

export default function ManagementPage() {
  const [collections, setCollections] = useState<any[]>([]);
  const [evalResults, setEvalResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('collections');

  // 索引参数
  const [indexCollection, setIndexCollection] = useState('ict_docs');
  const [indexProvider, setIndexProvider] = useState('qwen');
  const [indexModel, setIndexModel] = useState('text-embedding-v2');
  const [indexText, setIndexText] = useState('');
  const [indexUrls, setIndexUrls] = useState('');

  // 评测参数
  const [evalCollection, setEvalCollection] = useState('ict_docs');
  const [evalProvider, setEvalProvider] = useState('qwen');
  const [evalModel, setEvalModel] = useState('text-embedding-v2');
  const [evalTopK, setEvalTopK] = useState(3);
  const [evalSamples, setEvalSamples] = useState('');

  useEffect(() => {
    loadCollections();
    loadEvalResults();
  }, []);

  async function loadCollections() {
    try {
      const res = await getCollections(apiBase);
      setCollections(res.collections || []);
    } catch (error) {
      console.error('加载集合失败:', error);
    }
  }

  async function loadEvalResults() {
    try {
      const res = await getEvals(apiBase);
      setEvalResults(res.evals || []);
    } catch (error) {
      console.error('加载评测结果失败:', error);
    }
  }

  async function onIndexDocs() {
    if (!indexText.trim()) {
      alert('请输入要索引的文档内容');
      return;
    }

    setLoading(true);
    try {
      const docs = indexText.split('\n\n').filter(t => t.trim()).map((text, i) => ({
        id: `doc_${Date.now()}_${i}`,
        text: text.trim(),
        meta: { source: 'manual', timestamp: new Date().toISOString() }
      }));

      const body = {
        collection: indexCollection,
        provider: indexProvider,
        model: indexModel,
        docs
      };

      await ragIndex(apiBase, body);
      alert('文档索引完成！');
      setIndexText('');
      loadCollections();
    } catch (error) {
      console.error('索引失败:', error);
      alert('索引失败，请检查API状态');
    } finally {
      setLoading(false);
    }
  }

  async function onIndexUrls() {
    if (!indexUrls.trim()) {
      alert('请输入要索引的URL列表');
      return;
    }

    setLoading(true);
    try {
      const urlList = indexUrls.split('\n').filter(u => u.trim());
      
      const body = {
        collection: indexCollection,
        provider: indexProvider,
        model: indexModel,
        urls: urlList
      };

      await ragIndex(apiBase, body);
      alert('URL索引完成！');
      setIndexUrls('');
      loadCollections();
    } catch (error) {
      console.error('索引失败:', error);
      alert('索引失败，请检查API状态');
    } finally {
      setLoading(false);
    }
  }

  async function onDeleteCollection(name: string) {
    if (!confirm(`确定要删除集合 "${name}" 吗？此操作不可恢复！`)) {
      return;
    }

    setLoading(true);
    try {
      await deleteCollection(apiBase, name);
      alert('集合删除成功！');
      loadCollections();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请检查API状态');
    } finally {
      setLoading(false);
    }
  }

  async function onResetBM25(name: string) {
    if (!confirm(`确定要重置集合 "${name}" 的BM25索引吗？`)) {
      return;
    }

    setLoading(true);
    try {
      await resetBM25(apiBase, name);
      alert('BM25索引重置成功！');
    } catch (error) {
      console.error('重置失败:', error);
      alert('重置失败，请检查API状态');
    } finally {
      setLoading(false);
    }
  }

  async function onEvaluate() {
    if (!evalSamples.trim()) {
      alert('请输入评测样本（JSON格式）');
      return;
    }

    setLoading(true);
    try {
      let samples;
      try {
        samples = JSON.parse(evalSamples);
      } catch (e) {
        alert('评测样本格式错误，请检查JSON格式');
        return;
      }

      const body = {
        collection: evalCollection,
        provider: evalProvider,
        model: evalModel,
        topk: Number(evalTopK),
        samples
      };

      const res = await ragEvaluate(apiBase, body);
      alert('评测完成！');
      loadEvalResults();
    } catch (error) {
      console.error('评测失败:', error);
      alert('评测失败，请检查API状态');
    } finally {
      setLoading(false);
    }
  }

  async function onDownloadEvalCSV(collection: string) {
    try {
      const csv = await getEvalCSV(apiBase, collection);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${collection}_eval_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载失败:', error);
      alert('下载失败，请检查API状态');
    }
  }

  return (
    <main style={{ maxWidth: 1400, margin: '0 auto', padding: 24 }}>
      <h1>🔧 ICT选型助手 - 数据管理</h1>
      
      {/* 标签页导航 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid #d0d7de' }}>
          {[
            { id: 'collections', name: '📚 集合管理', icon: '📚' },
            { id: 'index', name: '📝 文档索引', icon: '📝' },
            { id: 'evaluate', name: '📊 质量评测', icon: '📊' },
            { id: 'results', name: '📈 评测结果', icon: '📈' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 24px',
                border: 'none',
                backgroundColor: activeTab === tab.id ? '#0969da' : 'transparent',
                color: activeTab === tab.id ? 'white' : '#656d76',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontWeight: activeTab === tab.id ? 600 : 400
              }}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* 集合管理 */}
      {activeTab === 'collections' && (
        <section>
          <div style={{ border: '1px solid #e1e5e9', padding: 20, borderRadius: 12, backgroundColor: '#fafbfc' }}>
            <h3 style={{ color: '#24292f', marginBottom: 16 }}>📚 向量集合管理</h3>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <button 
                onClick={loadCollections}
                disabled={loading}
                style={{ 
                  padding: '8px 16px', 
                  backgroundColor: '#0969da', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 6,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                🔄 刷新列表
              </button>
            </div>
            
            {collections.length > 0 ? (
              <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #d0d7de', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ backgroundColor: '#f6f8fa' }}>
                    <tr>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #d0d7de' }}>集合名称</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #d0d7de' }}>向量数量</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #d0d7de' }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collections.map((collection, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #f1f3f4' }}>
                        <td style={{ padding: '12px' }}>{collection.name}</td>
                        <td style={{ padding: '12px' }}>{collection.vectors_count || 'N/A'}</td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => onResetBM25(collection.name)}
                              disabled={loading}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#9a6700',
                                color: 'white',
                                border: 'none',
                                borderRadius: 4,
                                fontSize: '0.9em',
                                cursor: loading ? 'not-allowed' : 'pointer'
                              }}
                            >
                              🔄 BM25
                            </button>
                            <button
                              onClick={() => onDeleteCollection(collection.name)}
                              disabled={loading}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#cf222e',
                                color: 'white',
                                border: 'none',
                                borderRadius: 4,
                                fontSize: '0.9em',
                                cursor: loading ? 'not-allowed' : 'pointer'
                              }}
                            >
                              🗑️ 删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#656d76', textAlign: 'center', margin: 0 }}>暂无集合，请先创建索引</p>
            )}
          </div>
        </section>
      )}

      {/* 文档索引 */}
      {activeTab === 'index' && (
        <section>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ border: '1px solid #e1e5e9', padding: 20, borderRadius: 12, backgroundColor: '#fafbfc' }}>
              <h3 style={{ color: '#24292f', marginBottom: 16 }}>📝 手动索引文档</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>集合名称</label>
                  <input 
                    value={indexCollection} 
                    onChange={(e) => setIndexCollection(e.target.value)} 
                    style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d0d7de' }}
                    placeholder="输入集合名称"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>嵌入提供者</label>
                    <select 
                      value={indexProvider} 
                      onChange={(e) => setIndexProvider(e.target.value)}
                      style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d0d7de' }}
                    >
                      <option value="qwen">阿里千问</option>
                      <option value="openai">OpenAI</option>
                      <option value="ollama">Ollama</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>模型名称</label>
                    <input 
                      value={indexModel} 
                      onChange={(e) => setIndexModel(e.target.value)} 
                      style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d0d7de' }}
                      placeholder="如: text-embedding-v2"
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>文档内容 (用空行分隔)</label>
                  <textarea 
                    value={indexText} 
                    onChange={(e) => setIndexText(e.target.value)} 
                    style={{ width: '100%', height: 200, padding: 8, borderRadius: 6, border: '1px solid #d0d7de', resize: 'vertical' }}
                    placeholder="输入文档内容，用空行分隔不同文档..."
                  />
                </div>
                <button 
                  onClick={onIndexDocs}
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
                  {loading ? '索引中...' : '📚 索引文档'}
                </button>
              </div>
            </div>

            <div style={{ border: '1px solid #e1e5e9', padding: 20, borderRadius: 12, backgroundColor: '#fafbfc' }}>
              <h3 style={{ color: '#24292f', marginBottom: 16 }}>🌐 批量索引URL</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>集合名称</label>
                  <input 
                    value={indexCollection} 
                    onChange={(e) => setIndexCollection(e.target.value)} 
                    style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d0d7de' }}
                    placeholder="输入集合名称"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>嵌入提供者</label>
                    <select 
                      value={indexProvider} 
                      onChange={(e) => setIndexProvider(e.target.value)}
                      style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d0d7de' }}
                    >
                      <option value="qwen">阿里千问</option>
                      <option value="openai">OpenAI</option>
                      <option value="ollama">Ollama</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>模型名称</label>
                    <input 
                      value={indexModel} 
                      onChange={(e) => setIndexModel(e.target.value)} 
                      style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d0d7de' }}
                      placeholder="如: text-embedding-v2"
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>URL列表 (每行一个)</label>
                  <textarea 
                    value={indexUrls} 
                    onChange={(e) => setIndexUrls(e.target.value)} 
                    style={{ width: '100%', height: 200, padding: 8, borderRadius: 6, border: '1px solid #d0d7de', resize: 'vertical' }}
                    placeholder="https://example.com/doc1&#10;https://example.com/doc2&#10;..."
                  />
                </div>
                <button 
                  onClick={onIndexUrls}
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
                  {loading ? '索引中...' : '🌐 索引URL'}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 质量评测 */}
      {activeTab === 'evaluate' && (
        <section>
          <div style={{ border: '1px solid #e1e5e9', padding: 20, borderRadius: 12, backgroundColor: '#fafbfc' }}>
            <h3 style={{ color: '#24292f', marginBottom: 16 }}>📊 RAG检索质量评测</h3>
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>集合名称</label>
                  <input 
                    value={evalCollection} 
                    onChange={(e) => setEvalCollection(e.target.value)} 
                    style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d0d7de' }}
                    placeholder="输入集合名称"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>嵌入提供者</label>
                  <select 
                    value={evalProvider} 
                    onChange={(e) => setEvalProvider(e.target.value)}
                    style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d0d7de' }}
                  >
                    <option value="qwen">阿里千问</option>
                    <option value="openai">OpenAI</option>
                    <option value="ollama">Ollama</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>TopK</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="20" 
                    value={evalTopK} 
                    onChange={(e) => setEvalTopK(Number(e.target.value))} 
                    style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d0d7de' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>评测样本 (JSON格式)</label>
                <textarea 
                  value={evalSamples} 
                  onChange={(e) => setEvalSamples(e.target.value)} 
                  style={{ width: '100%', height: 200, padding: 8, borderRadius: 6, border: '1px solid #d0d7de', resize: 'vertical' }}
                  placeholder={`[
  {
    "query": "查询语句1",
    "relevant_ids": ["doc_id_1", "doc_id_2"]
  },
  {
    "query": "查询语句2", 
    "relevant_ids": ["doc_id_3"]
  }
]`}
                />
              </div>
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
                {loading ? '评测中...' : '📊 开始评测'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 评测结果 */}
      {activeTab === 'results' && (
        <section>
          <div style={{ border: '1px solid #e1e5e9', padding: 20, borderRadius: 12, backgroundColor: '#fafbfc' }}>
            <h3 style={{ color: '#24292f', marginBottom: 16 }}>📈 评测结果历史</h3>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <button 
                onClick={loadEvalResults}
                disabled={loading}
                style={{ 
                  padding: '8px 16px', 
                  backgroundColor: '#0969da', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 6,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                🔄 刷新结果
              </button>
            </div>
            
            {evalResults.length > 0 ? (
              <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #d0d7de', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ backgroundColor: '#f6f8fa' }}>
                    <tr>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #d0d7de' }}>集合名称</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #d0d7de' }}>评测时间</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #d0d7de' }}>Recall@3</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #d0d7de' }}>Precision@3</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #d0d7de' }}>延迟P95</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #d0d7de' }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evalResults.map((result, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #f1f3f4' }}>
                        <td style={{ padding: '12px' }}>{result.collection}</td>
                        <td style={{ padding: '12px' }}>{new Date(result.timestamp).toLocaleString()}</td>
                        <td style={{ padding: '12px' }}>{(result.recall_at_3 || 0).toFixed(3)}</td>
                        <td style={{ padding: '12px' }}>{(result.precision_at_3 || 0).toFixed(3)}</td>
                        <td style={{ padding: '12px' }}>{(result.latency_p95 || 0).toFixed(2)}ms</td>
                        <td style={{ padding: '12px' }}>
                          <button
                            onClick={() => onDownloadEvalCSV(result.collection)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#8250df',
                              color: 'white',
                              border: 'none',
                              borderRadius: 4,
                              fontSize: '0.9em',
                              cursor: 'pointer'
                            }}
                          >
                            📥 CSV
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#656d76', textAlign: 'center', margin: 0 }}>暂无评测结果，请先进行评测</p>
            )}
          </div>
        </section>
      )}
    </main>
  );
}


