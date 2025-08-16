"use client";
import React, { useMemo, useState } from 'react';
import { postPlan, getRubric, postInfer } from '@/lib/api';

import '../../styles/common.css';
import Navbar from '@/lib/components/Navbar';
import AdvantageCards from '@/lib/components/AdvantageCards';
import PricingCards from '@/lib/components/PricingCards';
import FAQList from '@/lib/components/FAQList';
const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000';

const partners = [
  '阿里云', '腾讯云', '华为云', 'AWS', 'Google Cloud', 'Microsoft Azure', '字节跳动', '京东云', '百度智能云', '美团', '小米', '网易'
];

const advantages = [
  { icon: '🚀', title: '高效转化', desc: '专注业务场景，提升用户转化率' },
  { icon: '🤖', title: '智能推荐', desc: 'AI驱动，精准匹配需求' },
  { icon: '🎯', title: '易用性强', desc: '极简操作，快速上手' },
  { icon: '🔒', title: '安全可靠', desc: '企业级安全保障' },
  { icon: '🧩', title: '灵活扩展', desc: '支持多种业务场景' },
  { icon: '📊', title: '数据可视化', desc: '实时数据分析与展示' }
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
          <h1>ICT选型助手</h1>
          <p>智能推荐，场景化选型，助力企业高效部署ICT解决方案</p>
          <div className="hero-stats">
            <span>2000+ 企业信赖</span>
            <span>覆盖30+行业场景</span>
            <span>7x24小时专家服务</span>
          </div>
          <a href="#cta" className="button button-primary" style={{ fontSize: '1.2rem', padding: '16px 40px', marginTop: 16 }}>免费体验ICT选型</a>
        </div>
        <div className="hero-image" style={{ minWidth: 320, minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* 产品示意SVG */}
          <svg width="180" height="180" viewBox="0 0 180 180" fill="none">
            <rect x="20" y="40" width="140" height="100" rx="18" fill="#eaf3ff" />
            <rect x="40" y="60" width="100" height="60" rx="10" fill="#2a5bd7" />
            <text x="90" y="95" textAnchor="middle" fill="#fff" fontSize="22" fontWeight="bold">ICT</text>
          </svg>
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
        <h2>为什么选择ICT选型助手？</h2>
        <div className="advantage-cards">
          {advantages.map((adv, i) => (
            <div key={i} className="advantage-card">
              <div style={{ fontSize: '2.2rem', marginBottom: 8 }}>{adv.icon}</div>
              <h3>{adv.title.replace('高效转化', '智能选型').replace('智能推荐', '场景匹配').replace('易用性强', '极简操作').replace('安全可靠', '数据安全').replace('灵活扩展', '行业覆盖').replace('数据可视化', '实时分析')}</h3>
              <p>{adv.desc.replace('专注业务场景，提升用户转化率', 'AI驱动，精准推荐ICT方案').replace('AI驱动，精准匹配需求', '覆盖多行业场景，灵活选型').replace('极简操作，快速上手', '一键选型，快速部署').replace('企业级安全保障', '数据加密，安全合规').replace('支持多种业务场景', '支持30+行业场景').replace('实时数据分析与展示', '选型过程全程可视化')}</p>
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
        <h2>服务套餐</h2>
        <div className="pricing-cards">
          {pricing.map((plan, i) => (
            <div key={i} className="pricing-card" style={i === 1 ? { border: '2px solid #2a5bd7', boxShadow: '0 4px 16px #2a5bd733' } : {}}>
              <h3>{plan.name.replace('基础版', '标准版').replace('专业版', '企业版').replace('旗舰版', '定制版')}</h3>
              <div className="price">{plan.price}</div>
              <ul>
                {plan.features.map((f, j) => <li key={j}>{f.replace('基础功能', 'ICT基础选型').replace('高级功能', '行业场景推荐').replace('专属服务', '专家一对一服务')}</li>)}
              </ul>
              <a href="#cta" className={i === 1 ? 'button button-primary' : 'button button-secondary'} style={i === 1 ? { fontSize: '1.1rem', padding: '12px 32px' } : {}}>{plan.cta.replace('立即购买', '立即体验')}</a>
              {i === 1 && <div style={{ color: '#2a5bd7', fontWeight: 500, marginTop: 8 }}>推荐企业选型</div>}
            </div>
          ))}
        </div>
      </section>

      {/* 用户评价区 */}
      <section className="testimonials">
        <h2>企业用户真实评价</h2>
        <div className="testimonial-cards" style={{ overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: 8 }}>
          {testimonials.map((t, i) => (
            <div key={i} className="testimonial-card" style={{ display: 'inline-block', minWidth: 220, marginRight: 16 }}>
              <img src={t.avatar} alt={t.user} className="testimonial-avatar" />
              <div className="testimonial-user">{t.user}</div>
              <div style={{ color: '#FFD700', fontSize: '1.2rem', marginBottom: 4 }}>★★★★★</div>
              <div className="testimonial-text">{t.text.replace('产品很棒', '选型效率提升了3倍').replace('服务很专业', '专家建议非常有价值').replace('体验很好', 'ICT方案推荐很精准')}</div>
            </div>
          ))}
          <div style={{ display: 'inline-block', minWidth: 40, color: '#aaa', verticalAlign: 'middle' }}>⇢</div>
        </div>
      </section>

      {/* 常见问题区 */}
      <section id="faq" className="faq">
        <h2>关于ICT选型助手</h2>
        <div className="faq-list">
          {faqs.map((f, i) => (
            <div key={i} className="faq-item">
              <button className="faq-question" onClick={() => setFaqOpen(faqOpen === i ? null : i)} style={{ transition: 'background 0.2s' }}>
                {f.q.replace('产品支持哪些行业？', 'ICT选型助手支持哪些行业？').replace('如何保障数据安全？', '如何保障选型数据安全？').replace('是否有免费试用？', '是否有免费选型体验？').replace('售后服务如何？', '选型专家服务如何？')}
                <span style={{ float: 'right', fontWeight: 'bold', color: '#2a5bd7' }}>{faqOpen === i ? '−' : '+'}</span>
              </button>
              <div style={{ maxHeight: faqOpen === i ? 200 : 0, overflow: 'hidden', transition: 'max-height 0.3s' }}>
                {faqOpen === i && <div className="faq-answer">{f.a.replace('覆盖金融、制造、零售等多个行业', '覆盖ICT、金融、制造、零售等30+行业场景').replace('采用企业级加密技术', '采用企业级加密技术，保障选型数据安全').replace('提供7天免费试用', '提供30天免费选型体验，无需信用卡').replace('7x24小时在线支持', '7x24小时专家在线服务')}</div>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 行动号召区 */}
      <section id="cta" className="cta" style={{ background: 'linear-gradient(90deg,#eaf3ff 60%,#fff 100%)', padding: '64px 16px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 24 }}>立即体验ICT选型助手</h2>
        <a href="/management" className="button button-primary" style={{ fontSize: '1.3rem', padding: '20px 56px', borderRadius: 32 }}>免费开启智能选型</a>
        <div style={{ marginTop: 24, color: '#2a5bd7', fontWeight: 500 }}>无需信用卡，30天免费体验</div>
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




