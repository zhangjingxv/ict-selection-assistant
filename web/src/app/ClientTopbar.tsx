'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ClientTopbar() {
  const [apiKey, setApiKey] = useState('');
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000';

  useEffect(() => {
    try {
      const k = localStorage.getItem('api_key') || '';
      setApiKey(k);
    } catch {}
  }, []);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setApiKey(v);
    try {
      if (v) localStorage.setItem('api_key', v);
      else localStorage.removeItem('api_key');
    } catch {}
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, padding: '10px 16px', borderBottom: '1px solid #e5e7eb',
      background: '#f8fafc', position: 'sticky', top: 0, zIndex: 10,
    }}>
      <nav style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Link href="/" style={{ textDecoration: 'none', color: '#111827', fontWeight: 600 }}>参数化规划</Link>
        <Link href="/recommend" style={{ textDecoration: 'none', color: '#111827' }}>智能推荐</Link>
        <Link href="/management" style={{ textDecoration: 'none', color: '#111827' }}>数据管理</Link>
      </nav>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ color: '#6b7280', fontSize: 12 }}>API: {apiBase}</span>
        <input
          placeholder="x-api-key (可选)"
          value={apiKey}
          onChange={onChange}
          style={{
            border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 8px',
            fontSize: 12, minWidth: 200, background: 'white'
          }}
        />
      </div>
    </div>
  );
}


