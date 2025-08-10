# ICT Selection Assistant · 基于 RAG 的参数化推荐（计算/网络/安全）

面向企业客户的 ICT 选型助手：基于业务场景、性能目标、预算等级与安全等级，输出“参数化”的计算/存储/网络/安全/观测建议；通过 RAG（检索增强）给出可追溯证据与评测指标。不输出品牌/型号/价格。

## 目录结构
- `catalog/`：字段与样例数据（含 `samples/industry_seed.json`）
- `selector/`：FastAPI 服务（推荐/索引/检索/评测/导出）
- `web/`：Next.js 前端（模板表单/证据/导出）
- `compose.yaml`：API + Web + Qdrant（可选 Ollama）

## 能力总览
- 参数化推荐：输入场景/规模/预算/安全/合规 → 输出 compute/storage/network/security/observability 的区间/等级与 explain
- RAG 证据：索引行业资料（URL 或 JSON），检索返回“文本片段+来源”，随推荐一起展示
- 评测闭环：Recall@k / Precision@k / Latency P95 等指标，用于衡量“信息精准度”
- 导出交付：一键导出 Markdown 报告

## RAG 管道（已优化）
1) 清洗过滤：去空/去短(<20字)/去重(指纹)
2) 分块：按句窗口（默认 400 字，overlap 50），写入 `payload.text`
3) 索引：Qdrant HNSW 参数；稳定 63 位整型 ID；wait=true 确保可见
4) 检索：向量召回 + 元数据过滤(`where`/`where_any`) + BM25 融合（`alpha` 可调，默认 0.7）+ 关键词得分
5) 推荐：自动生成检索 query（未提供时），返回结构化方案与证据 TopN

嵌入提供方：`openai` / `qwen(千问)` / `ollama(本地, 如 bge-m3)`；无 Key 时回退轻量伪嵌入（仅开发用）。

## 启动与体验
### 方式A：本机直跑（推荐快速体验）
后端
```bash
cd selector
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export QWEN_API_KEY=你的Key   # 或 OPENAI_API_KEY
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
前端
```bash
cd web
nvm use 20
echo 'NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000' > .env.local
npm i && npm run dev
```
打开 `http://localhost:3000/recommend`，按模板生成推荐、检索证据、导出 Markdown。

### 方式B：Docker（轻量，不拉本地大模型）
```bash
export QWEN_API_KEY=你的Key
docker compose up -d --build db vec api web
```

如需本地嵌入模型（Ollama+bge-m3），可单独启动后将 `OLLAMA_BASE_URL` 指向它，再重启 API。

## API 速查（均为 POST）
健康
```bash
curl -s http://localhost:8000/health
```
索引（docs 或 urls）
```bash
# docs 例子
jq -n --argfile docs catalog/samples/industry_seed.json \
  '{collection:"ict_industry",provider:"qwen",model:"text-embedding-v2",chunk_strategy:"sentence",chunk_max_chars:320,chunk_overlap:40,docs:$docs}' > /tmp/seed_index.json
curl -s -X POST http://localhost:8000/api/rag/index -H 'Content-Type: application/json' -d @/tmp/seed_index.json

# urls 例子（自动抓取正文→清洗/分块/索引）
curl -s -X POST http://localhost:8000/api/rag/index -H 'Content-Type: application/json' -d '{
  "collection":"ict_industry",
  "urls":["https://en.wikipedia.org/wiki/Zero_trust_security"],
  "url_source":"industry_web",
  "chunk_strategy":"sentence","chunk_max_chars":320,"chunk_overlap":40
}'
```
检索（含过滤/融合/重排）
```bash
curl -s -X POST http://localhost:8000/api/rag/search -H 'Content-Type: application/json' -d '{
  "collection":"ict_industry","query":"零信任如何分区分域与审计","topk":3,
  "where_any": {"source":["industry_seed","industry_web"]},
  "rerank": true, "alpha": 0.7
}'
```
推荐与导出
```bash
curl -s -X POST http://localhost:8000/api/recommend -H 'Content-Type: application/json' -d '{
  "scenario":"rag","current":{"qps_peak":800,"latency_p95_ms":300,"payload_kb":6,"growth_12m":2.5,"reads_per_request":1.0,"writes_per_request":0.1,"cache_hit_ratio":0.7},
  "data":{"embedding_dim":1024,"batch":32},
  "constraints":{"compliance":"strict"},
  "budget_tier":"medium","security_level":"strict",
  "collection":"ict_industry"
}'

curl -s -X POST http://localhost:8000/api/recommend/export -H 'Content-Type: application/json' -d '{...同上...}' > recommendation.md
```
评测（信息精准度）
```bash
curl -s -X POST http://localhost:8000/api/rag/evaluate -H 'Content-Type: application/json' -d '{
  "collection":"ict_industry","topk":2,
  "samples":[
    {"query":"RAG的P95与错误预算","relevant_ids":["seed_zt::0"]},
    {"query":"启用WAF严格模式的建议","relevant_ids":["seed_waf::0"]}
  ]
}'
```

## 字段与数据口径
- 单文档：`{ id, text, meta? }`，meta 支持 `source/topic/url/updated_at` 等
- 预处理统计：`filter_stats={ input, kept, too_short, dedup }`
- 向量库 payload：`{ id, doc_id, chunk_id, text, ...meta }`

## 未来计划
- 前端：引入 Tailwind/Shadcn，重做推荐页 UI；新增“数据管理/评测看板”
- 后端：引入 reranker 插件位（bge-reranker 等），持久化评测结果并在前端展示趋势
