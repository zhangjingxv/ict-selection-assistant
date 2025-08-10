import './globals.css';
import React from 'react';

export const metadata = {
  title: 'ICT 选型助手 · 参数化规划',
  description: '基于业务场景的参数化扩容建议与 RAM/RAG 评估',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}


