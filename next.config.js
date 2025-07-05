/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  // 禁用开发指示器
  devIndicators: {
    position: 'bottom-right',
  },
  // 关闭严格模式以避免一些问题
  reactStrictMode: false,
  // 配置 ESLint
  eslint: {
    // 在生产构建时忽略 ESLint 错误
    ignoreDuringBuilds: true,
  },
  // 配置 TypeScript
  typescript: {
    // 在生产构建时忽略 TypeScript 错误
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig; 