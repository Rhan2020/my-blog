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
  // 减少构建输出大小
  compress: true,
  // 优化图片处理
  images: {
    disableStaticImages: false,
    minimumCacheTTL: 60,
  },
  // 构建输出优化
  output: 'standalone',
  // 减少构建时的输出
  productionBrowserSourceMaps: false,
  // 优化构建缓存
  experimental: {
    // 启用构建缓存
    optimizeCss: true,
  },
  // 优化页面加载
  poweredByHeader: false,
  // 优化静态资源处理
  assetPrefix: undefined,
  // 优化构建输出
  generateEtags: true,
};

module.exports = nextConfig; 