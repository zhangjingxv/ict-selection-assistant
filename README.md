# ICT Selection Assistant

一个智能的ICT产品选择助手，基于RAG（检索增强生成）技术，帮助用户根据具体需求选择最适合的ICT产品。

## 🚀 项目状态

✅ **所有问题已解决，系统正常运行！**

- ✅ Python后端无语法错误
- ✅ Web前端构建成功
- ✅ Docker容器正常运行
- ✅ 所有API端点工作正常
- ✅ 推荐系统功能完整
- ✅ RAG系统运行稳定

## 🏗️ 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Frontend  │    │  FastAPI Backend│    │   PostgreSQL    │
│   (Next.js)     │◄──►│   (Python)      │◄──►│   Database      │
│   Port: 3000    │    │   Port: 8000    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Qdrant        │
                       │   Vector DB     │
                       │   Port: 6333    │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Ollama        │
                       │   LLM Service   │
                       │   Port: 11434   │
                       └─────────────────┘
```

## 🚀 快速开始

### 1. 启动系统

```bash
# 克隆项目
git clone https://github.com/zhangjingxv/ict-selection-assistant.git
cd ict-selection-assistant

# 启动所有服务
docker compose up -d
```

### 2. 访问应用

- **Web界面**: http://localhost:3000
- **API文档**: http://localhost:8000/docs
- **健康检查**: http://localhost:8000/health

### 3. 验证系统

```bash
# 检查服务状态
docker compose ps

# 测试API
curl http://localhost:8000/health
```

## 🔧 主要功能

### 1. 智能推荐系统
- 基于场景的ICT产品推荐
- 考虑性能、成本、合规性等多维度因素
- 支持自定义约束和风险偏好

### 2. RAG文档系统
- 文档索引和检索
- 支持多种文档格式
- 向量数据库存储
- 语义搜索能力

### 3. 评估系统
- 推荐结果质量评估
- 性能指标监控
- 用户反馈收集

## 📁 项目结构

```
ict-selection-assistant/
├── selector/                 # Python后端
│   ├── app/
│   │   ├── core/            # 核心业务逻辑
│   │   ├── rag/             # RAG相关功能
│   │   └── main.py          # FastAPI应用入口
│   ├── requirements.txt     # Python依赖
│   └── Dockerfile          # 后端容器配置
├── web/                     # Next.js前端
│   ├── src/
│   │   ├── app/            # 页面组件
│   │   └── lib/            # 工具库
│   ├── package.json        # Node.js依赖
│   └── Dockerfile          # 前端容器配置
├── catalog/                 # 产品目录和模式
├── compose.yaml            # Docker Compose配置
└── README.md               # 项目说明
```

## 🧪 测试

系统已通过完整测试：

- ✅ 健康检查
- ✅ 集合管理
- ✅ 推荐系统
- ✅ Web界面
- ✅ Docker服务

## 🔍 故障排除

### 常见问题

1. **端口冲突**: 确保3000、8000、5432、6333、11434端口未被占用
2. **内存不足**: Ollama需要至少4GB可用内存
3. **API密钥**: 设置环境变量`QWEN_API_KEY`和`OPENAI_API_KEY`（可选）

### 日志查看

```bash
# 查看所有服务日志
docker compose logs

# 查看特定服务日志
docker compose logs api
docker compose logs web
```

## 📝 开发说明

### 添加新功能

1. 在`selector/app/core/`中添加业务逻辑
2. 在`selector/app/main.py`中添加API端点
3. 在`web/src/lib/api.ts`中添加前端API调用
4. 在`web/src/app/`中添加页面组件

### 代码质量

- Python代码使用类型提示
- TypeScript代码严格模式
- 所有API都有错误处理
- 使用Docker确保环境一致性

## 📄 更新日志

### 新增功能

- **业务问题描述模版**：新增了一个业务问题描述模版页面，用户可以通过表单提交业务问题、扩展需求和其他详细信息。
- **自定义 Hook**：实现了 `useCollections` 和 `useEvalResults` 两个自定义 Hook，用于管理集合和评测结果的数据加载逻辑。
- **优化代码结构**：移除了冗余的导入，改进了错误处理逻辑，提升了代码的可读性和可维护性。

### 使用说明

#### 业务问题描述模版

1. 打开管理页面。
2. 在页面底部找到“业务问题描述模版”部分。
3. 填写表单并提交。

#### 自定义 Hook

- `useCollections(apiBase)`：用于加载和管理集合数据。
- `useEvalResults(apiBase)`：用于加载和管理评测结果数据。

### 优化内容

- **移除冗余导入**：清理了 `React` 的重复导入。
- **改进错误处理**：为加载集合和评测结果的失败情况提供了更友好的用户提示。
- **模块化组件**：将表单字段和导航标签页抽象为独立的组件，提升了代码的复用性。

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

---

**最后更新**: 2025年8月10日
**状态**: 🟢 正常运行
