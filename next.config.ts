import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // 禁用开发指示器
  devIndicators: {
    position: 'bottom-right',
  },
  // Turbopack 配置 (Next.js 15 中已稳定)
  turbopack: {
    // 禁用开发工具相关功能
  },
};

export default nextConfig;
