"use client";
import React, { useMemo, useState } from 'react';
import { postPlan, getRubric, postInfer } from '@/lib/api';

import '@/styles/common.css';
import Navbar from '@/lib/components/Navbar';
import AdvantageCards from '@/lib/components/AdvantageCards';
import PricingCards from '@/lib/components/PricingCards';
import FAQList from '@/lib/components/FAQList';
const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000';

const partners = [
  '阿里云', '腾讯云', '华为云', 'AWS', 'Google Cloud', 'Microsoft Azure', '字节跳动', '京东云', '百度智能云', '美团', '小米', '网易'
];

const advantages = [
  { title: '高效转化', desc: '专注业务场景，提升用户转化率' },
  { title: '智能推荐', desc: 'AI驱动，精准匹配需求' },
  { title: '易用性强', desc: '极简操作，快速上手' },
  { title: '安全可靠', desc: '企业级安全保障' },
  { title: '灵活扩展', desc: '支持多种业务场景' },
  { title: '数据可视化', desc: '实时数据分析与展示' }
];

const steps = [
  '注册账号',
  '配置业务场景',
  '快速上线产品'
];

const pricing = [
  {
    name: '基础版',
    price: '100元/月',
    features: ['核心功能', '标准支持', '最多3个业务场景'],
    cta: '立即购买'
  },
  {
    name: '专业版',
    price: '200元/月',
    features: ['全部基础功能', '优先支持', '最多10个业务场景', 'API接入'],
    cta: '免费试用'
  },
  {
    name: '企业版',
    price: '300元/月',
    features: ['全部专业功能', '专属顾问', '无限业务场景', '定制开发'],
    cta: '联系我们'
  }
];

const testimonials = [
  { user: '张三', avatar: 'https://randomuser.me/api/portraits/men/32.jpg', text: '产品极大提升了我们的业务效率，推荐！' },
  { user: '李四', avatar: 'https://randomuser.me/api/portraits/women/44.jpg', text: '界面友好，功能强大，客服响应快。' },
  { user: '王五', avatar: 'https://randomuser.me/api/portraits/men/65.jpg', text: '定价合理，扩展性强，非常适合中小企业。' }
];

const faqs = [
  { q: '如何开始使用产品？', a: '注册账号后，按照指引配置业务场景即可快速上线。' },
  { q: '是否支持定制开发？', a: '企业版支持定制开发，欢迎联系我们获取方案。' },
  { q: '数据是否安全？', a: '我们采用企业级安全策略，保障您的数据安全。' },
  { q: '是否有免费试用？', a: '专业版支持免费试用，欢迎体验。' }
];

export default function Page() {
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  return (
    <main className="landing-container">
      {/* 顶部导航栏 */}
      <nav className="navbar">
        <div className="logo">SaaS选型助手</div>
        <ul className="nav-links">
          <li><a href="#advantages">优势</a></li>
          <li><a href="#pricing">定价</a></li>
          <li><a href="#faq">常见问题</a></li>
        </ul>
        <a href="#cta" className="nav-cta">免费试用</a>
      </nav>

      {/* 标题区 */}
      <section className="hero">
        <div className="hero-content">
          <h1>高转化率SaaS选型落地页</h1>
          <p>专注业务场景，提升用户转化率，助力企业智能升级</p>
          <div className="hero-stats">
            <span>1200+ 企业用户</span>
            <span>99.9% SLA保障</span>
            <span>7x24小时服务</span>
          </div>
          <a href="#cta" className="button button-primary">立即体验</a>
        </div>
        <div className="hero-image">
          {/* 可放产品示意图 */}
        </div>
      </section>

      {/* 合作伙伴/客户Logo区 */}
      <section className="partners">
        <h2>合作伙伴</h2>
        <div className="partner-logos">
          {partners.map((p, i) => (
            <span key={i} className="partner-logo">{p}</span>
          ))}
        </div>
      </section>

      {/* 产品优势区 */}
      <section id="advantages" className="advantages">
        <h2>产品优势</h2>
        <div className="advantage-cards">
          {advantages.map((adv, i) => (
            <div key={i} className="advantage-card">
              <h3>{adv.title}</h3>
              <p>{adv.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 工作原理区 */}
      <section className="how-it-works">
        <h2>工作原理</h2>
        <div className="steps">
          {steps.map((step, i) => (
            <div key={i} className="step-card">
              <span className="step-number">{i + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 定价模块 */}
      <section id="pricing" className="pricing">
        <h2>定价方案</h2>
        <div className="pricing-cards">
          {pricing.map((plan, i) => (
            <div key={i} className="pricing-card">
              <h3>{plan.name}</h3>
              <div className="price">{plan.price}</div>
              <ul>
                {plan.features.map((f, j) => <li key={j}>{f}</li>)}
              </ul>
              <a href="#cta" className="button button-secondary">{plan.cta}</a>
            </div>
          ))}
        </div>
      </section>

      {/* 用户评价区 */}
      <section className="testimonials">
        <h2>深受全球用户的喜爱</h2>
        <div className="testimonial-cards">
          {testimonials.map((t, i) => (
            <div key={i} className="testimonial-card">
              <img src={t.avatar} alt={t.user} className="testimonial-avatar" />
              <div className="testimonial-user">{t.user}</div>
              <div className="testimonial-text">{t.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 常见问题区 */}
      <section id="faq" className="faq">
        <h2>常见问题</h2>
        <div className="faq-list">
          {faqs.map((f, i) => (
            <div key={i} className="faq-item">
              <button className="faq-question" onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
                {f.q}
              </button>
              {faqOpen === i && <div className="faq-answer">{f.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* 行动号召区 */}
      <section id="cta" className="cta">
        <h2>立即体验高转化率SaaS选型助手</h2>
        <a href="/management" className="button button-primary">开始选型</a>
      </section>

      {/* 页脚 */}
      <footer className="footer">
        <div>© 2025 SaaS选型助手 | 新品速递 | 条款条件</div>
        <div className="footer-social">
          <a href="#">微博</a> | <a href="#">知乎</a> | <a href="#">Newsletter</a>
        </div>
      </footer>
    </main>
  );
}
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


