"use client";
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  return (
    <header 
      className="sticky top-0 z-50 border-b backdrop-blur-md transition-all duration-300"
      style={{ 
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {/* 玻璃态背景 */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'var(--color-background)',
          opacity: 0.9
        }}
      />
      
      <div className="relative max-w-4xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo 区域 */}
          <Link 
            href="/" 
            className="group flex items-center space-x-3 transition-all duration-300 hover:scale-105"
          >
            {/* Logo 图标 */}
            <div 
              className="flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 group-hover:rotate-12"
              style={{
                background: 'var(--gradient-hero)',
                boxShadow: 'var(--shadow-md)'
              }}
            >
              <span className="text-xl font-bold text-white">R</span>
            </div>
            
            {/* 站点标题 */}
            <div className="flex flex-col">
              <span 
                className="text-xl font-bold transition-colors duration-300 group-hover:text-primary"
                style={{ 
                  color: 'var(--color-foreground)',
                  letterSpacing: '-0.025em'
                }}
              >
                rshan&apos;s blog
              </span>
              <span 
                className="text-xs opacity-70 transition-opacity duration-300 group-hover:opacity-100"
                style={{ color: 'var(--color-foreground-muted)' }}
              >
                技术分享 · 思考笔记
              </span>
            </div>
          </Link>
          
          {/* 右侧操作区 */}
          <div className="flex items-center space-x-4">
            {/* 导航链接 - 可选 */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link
                href="/"
                className="text-sm font-medium transition-colors duration-200"
                style={{ 
                  color: 'var(--color-foreground-muted)',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--color-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--color-foreground-muted)';
                }}
              >
                📝 文章
              </Link>
              <Link
                href="/about"
                className="text-sm font-medium transition-colors duration-200"
                style={{ 
                  color: 'var(--color-foreground-muted)',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--color-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--color-foreground-muted)';
                }}
              >
                👨‍💻 关于
              </Link>
            </nav>
            
            {/* 主题切换按钮 */}
            <ThemeToggle />
          </div>
        </div>
      </div>
      
      {/* 底部装饰线 */}
      <div 
        className="absolute bottom-0 left-0 h-px w-full"
        style={{
          background: 'linear-gradient(90deg, transparent, var(--color-primary), transparent)'
        }}
      />
    </header>
  );
} 