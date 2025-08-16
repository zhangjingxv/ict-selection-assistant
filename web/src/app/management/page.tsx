"use client";
import { ragIndex, ragSearch, ragEvaluate, getCollections, deleteCollection, resetBM25, getEvals, getEvalCSV } from '@/lib/api';
import InputField from '@/lib/components/InputField';
import TabNavigation from '@/lib/components/TabNavigation';
/**
 * FormField component props:
 * - label: string - The label for the field.
 * - value: string - The current value of the field.
 * - onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void - Change handler.
 * - placeholder?: string - Optional placeholder text.
 * - options?: Array<{ value: string; label: string }> - For select fields, an array of option objects with 'value' and 'label'.
 */
import FormField from '@/lib/components/FormField';
import '@/styles/common.css';
import { useCollections, useEvalResults } from '@/lib/hooks/useDataHooks';
// import { useCollections, useEvalResults } from '@/lib/hooks/useDataHooks'; // Removed: custom hooks not found

// Replace custom hooks with local state and loading logic
import { useState, useEffect } from 'react';
const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000';

// 添加详细的 TypeScript 类型定义
interface Collection {
  name: string;
  vectors_count: number;
}

interface EvalResult {
  collection: string;
  timestamp: string;
  recall_at_3: number;
  precision_at_3: number;
  latency_p95: number;
}

export default function ManagementPage() {
  // 集合和评测结果的本地状态
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [evalResults, setEvalResults] = useState<EvalResult[]>([]);
  const [evalResultsLoading, setEvalResultsLoading] = useState(false);

  // 替换原有的 loading 状态
  const loading = collectionsLoading || evalResultsLoading;
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

  // 评测结果加载函数补充
  async function loadEvalResults() {
    setEvalResultsLoading(true);
    try {
  const res: any = await getEvals(apiBase);
  setEvalResults(res.results || res.evals || []);
    } catch (error) {
      console.error('加载评测结果失败:', error);
      alert('加载评测结果失败，请检查网络连接或API状态。');
    } finally {
      setEvalResultsLoading(false);
    }
  }

  // 改进错误处理，提供更友好的用户提示
  async function loadCollections() {
  async function loadCollections() {
    setCollectionsLoading(true);
    try {
      const res: { collections: Collection[] } = await getCollections(apiBase);
      setCollections(res.collections || []);
    } catch (error) {
      console.error('加载集合失败:', error);
      alert('加载集合失败，请检查网络连接或API状态。');
    } finally {
      setCollectionsLoading(false);
    }
  }

  async function loadEvalResults() {
    setEvalResultsLoading(true);
    try {
      const res: { evals: EvalResult[] } = await getEvals(apiBase);
      setEvalResults(res.evals || []);
    } catch (error) {
      console.error('加载评测结果失败:', error);
      alert('加载评测结果失败，请检查网络连接或API状态。');
    } finally {
      setEvalResultsLoading(false);
    }
  }
  async function onIndexDocs() {
    if (!indexText.trim()) {
      alert('请输入要索引的文档内容');
      return;
    }

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
      alert('索引失败，请检查网络连接或API状态。');
    }
  }

  async function onIndexUrls() {
    if (!indexUrls.trim()) {
      alert('请输入要索引的URL列表');
      return;
    }

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
      alert('索引失败，请检查网络连接或API状态。');
    }
  }

  async function onDeleteCollection(name: string) {
    if (!confirm(`确定要删除集合 "${name}" 吗？此操作不可恢复！`)) {
      return;
    }

    try {
      await deleteCollection(apiBase, name);
      alert('集合删除成功！');
      loadCollections();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请检查API状态');
    }
  }

  async function onResetBM25(name: string) {
    if (!confirm(`确定要重置集合 "${name}" 的BM25索引吗？`)) {
      return;
    }

    try {
      await resetBM25(apiBase, name);
      alert('BM25索引重置成功！');
    } catch (error) {
      console.error('重置失败:', error);
      alert('重置失败，请检查API状态');
    }
  }

  async function onEvaluate() {
    if (!evalSamples.trim()) {
      alert('请输入评测样本（JSON格式）');
      return;
    }

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
    <main className="container">
      <h1>🔧 ICT选型助手 - 数据管理</h1>
      
      {/* 标签页导航 */}
      <TabNavigation
        tabs={[
          { id: 'collections', name: '📚 集合管理' },
          { id: 'index', name: '📝 文档索引' },
          { id: 'evaluate', name: '📊 质量评测' },
          { id: 'results', name: '📈 评测结果' }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* 集合管理 */}
      {activeTab === 'collections' && (
        <section>
          <div className="card">
            <h3 className="label">📚 向量集合管理</h3>
            <div className="card-actions">
              <button 
                className={`button button-secondary ${loading ? 'button-disabled' : ''}`}
                onClick={loadCollections}
                disabled={loading}
              >
                🔄 刷新列表
              </button>
            </div>
            
            {collections.length > 0 ? (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>集合名称</th>
                      <th>向量数量</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collections.map((collection, index) => (
                      <tr key={index}>
                        <td>{collection.name}</td>
                        <td>{collection.vectors_count || 'N/A'}</td>
                        <td>
                          <div className="button-group">
                            <button
                              onClick={() => onResetBM25(collection.name)}
                              disabled={loading}
                              className="button button-reset"
                            >
                              🔄 BM25
                            </button>
                            <button
                              onClick={() => onDeleteCollection(collection.name)}
                              disabled={loading}
                              className="button button-delete"
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
              <p className="empty-message">暂无集合，请先创建索引</p>
            )}
          </div>
        </section>
      )}

      {/* 文档索引 */}
      {activeTab === 'index' && (
        <section>
          <div className="grid-container">
            <div className="card">
              <h3 className="label">📝 手动索引文档</h3>
              <div className="grid-form">
                <div>
                  <FormField
                    label="集合名称"
                    value={indexCollection}
                    onChange={(e) => setIndexCollection(e.target.value)}
                    placeholder="输入集合名称"
                  />
                </div>
                <div className="grid-half">
                  <div>
                    <FormField
                      label="嵌入提供者"
                      value={indexProvider}
                      onChange={(e) => setIndexProvider(e.target.value)}
                      options={[
                        { value: 'qwen', label: '阿里千问' },
                        { value: 'openai', label: 'OpenAI' },
                        { value: 'ollama', label: 'Ollama' }
                      ]}
                    />
                  </div>
                  <div>
                    <FormField
                      label="模型名称"
                      value={indexModel}
                      onChange={(e) => setIndexModel(e.target.value)}
                      placeholder="如: text-embedding-v2"
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">文档内容 (用空行分隔)</label>
                  <textarea 
                    value={indexText} 
                    onChange={(e) => setIndexText(e.target.value)} 
                    className="form-textarea"
                    placeholder="输入文档内容，用空行分隔不同文档..."
                  />
                </div>
                <button 
                  onClick={onIndexDocs}
                  disabled={loading}
                  className={`button button-primary ${loading ? 'button-disabled' : ''}`}
                >
                  {loading ? '索引中...' : '📚 索引文档'}
                </button>
              </div>
            </div>

            <div className="card">
              <h3 className="label">🌐 批量索引URL</h3>
              <div className="grid-form">
                <div>
                  <FormField
                    label="集合名称"
                    value={indexCollection}
                    onChange={(e) => setIndexCollection(e.target.value)}
                    placeholder="输入集合名称"
                  />
                </div>
                <div className="grid-half">
                  <div>
                    <FormField
                      label="嵌入提供者"
                      value={indexProvider}
                      onChange={(e) => setIndexProvider(e.target.value)}
                      options={[
                        { value: 'qwen', label: '阿里千问' },
                        { value: 'openai', label: 'OpenAI' },
                        { value: 'ollama', label: 'Ollama' }
                      ]}
                    />
                  </div>
                  <div>
                    <FormField
                      label="模型名称"
                      value={indexModel}
                      onChange={(e) => setIndexModel(e.target.value)}
                      placeholder="如: text-embedding-v2"
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">URL列表 (每行一个)</label>
                  <textarea 
                    value={indexUrls} 
                    onChange={(e) => setIndexUrls(e.target.value)} 
                    className="form-textarea"
                    placeholder="https://example.com/doc1&#10;https://example.com/doc2&#10;..."
                  />
                </div>
                <button 
                  onClick={onIndexUrls}
                  disabled={loading}
                  className={`button button-secondary ${loading ? 'button-disabled' : ''}`}
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
          <div className="card">
            <h3 className="label">📊 RAG检索质量评测</h3>
            <div className="grid-evaluate">
              <div className="grid-third">
                <label className="form-label">集合名称</label>
                <input 
                  value={evalCollection} 
                  onChange={(e) => setEvalCollection(e.target.value)} 
                  className="form-input"
                  placeholder="输入集合名称"
                />
              </div>
              <div className="grid-third">
                <label className="form-label">嵌入提供者</label>
                <select 
                  value={evalProvider} 
                  onChange={(e) => setEvalProvider(e.target.value)}
                  className="form-select"
                >
                  <option value="qwen">阿里千问</option>
                  <option value="openai">OpenAI</option>
                  <option value="ollama">Ollama</option>
                </select>
              </div>
              <div className="grid-third">
                <label className="form-label">TopK</label>
                <input 
                  type="number" 
                  min="1" 
                  max="20" 
                  value={evalTopK} 
                  onChange={(e) => setEvalTopK(Number(e.target.value))} 
                  className="form-input"
                />
              </div>
              <div className="grid-full">
                <label className="form-label">评测样本 (JSON格式)</label>
                <textarea 
                  value={evalSamples} 
                  onChange={(e) => setEvalSamples(e.target.value)} 
                  className="form-textarea"
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
                className={`button button-danger ${loading ? 'button-disabled' : ''}`}
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
          <div className="card">
            <h3 className="label">📈 评测结果历史</h3>
            <div className="card-actions">
              <button 
                onClick={loadEvalResults}
                disabled={loading}
                className={`button button-secondary ${loading ? 'button-disabled' : ''}`}
              >
                🔄 刷新结果
              </button>
            </div>
            
            {evalResults.length > 0 ? (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>集合名称</th>
                      <th>评测时间</th>
                      <th>Recall@3</th>
                      <th>Precision@3</th>
                      <th>延迟P95</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evalResults.map((result, index) => (
                      <tr key={index}>
                        <td>{result.collection}</td>
                        <td>{new Date(result.timestamp).toLocaleString()}</td>
                        <td>{(result.recall_at_3 || 0).toFixed(3)}</td>
                        <td>{(result.precision_at_3 || 0).toFixed(3)}</td>
                        <td>{(result.latency_p95 || 0).toFixed(2)}ms</td>
                        <td>
                          <button
                            onClick={() => onDownloadEvalCSV(result.collection)}
                            className="button button-download"
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
              <p className="empty-message">暂无评测结果，请先进行评测</p>
            )}
          </div>
        </section>
      )}

    </main>
  );
}


