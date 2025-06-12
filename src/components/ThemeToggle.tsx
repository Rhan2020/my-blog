"use client";
import { useTheme } from '@/contexts/ThemeContext';
import { SunIcon, MoonIcon } from 'lucide-react';
import { useState } from 'react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = () => {
    setIsAnimating(true);
    toggleTheme();
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <button
      onClick={handleToggle}
      className="group relative overflow-hidden rounded-full p-2 transition-all duration-300 ease-out"
      style={{ 
        background: 'var(--gradient-card)',
        border: '2px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)'
      }}
      aria-label={theme === 'light' ? '🌙 切换到暗夜模式' : '☀️ 切换到亮色模式'}
    >
      {/* 背景动画圆圈 */}
      <div 
        className="absolute inset-0 rounded-full transition-all duration-500 ease-out"
        style={{
          background: theme === 'light' 
            ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
            : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
          transform: isAnimating ? 'scale(1.2)' : 'scale(0)',
          opacity: isAnimating ? 0.2 : 0
        }}
      />
      
      {/* 图标容器 */}
      <div className="relative z-10 flex h-8 w-8 items-center justify-center">
        {/* 太阳图标 */}
        <SunIcon 
          className={`absolute transition-all duration-500 ease-out ${
            theme === 'light' 
              ? 'rotate-0 scale-100 opacity-100' 
              : 'rotate-180 scale-75 opacity-0'
          }`}
          style={{ 
            color: theme === 'light' ? '#f59e0b' : 'var(--color-foreground-muted)',
            width: '20px',
            height: '20px'
          }}
        />
        
        {/* 月亮图标 */}
        <MoonIcon 
          className={`absolute transition-all duration-500 ease-out ${
            theme === 'dark' 
              ? 'rotate-0 scale-100 opacity-100' 
              : '-rotate-180 scale-75 opacity-0'
          }`}
          style={{ 
            color: theme === 'dark' ? '#8b5cf6' : 'var(--color-foreground-muted)',
            width: '20px',
            height: '20px'
          }}
        />
      </div>
      
      {/* 悬浮时的光晕效果 */}
      <div 
        className="absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: theme === 'light'
            ? 'radial-gradient(circle, rgba(251, 191, 36, 0.1) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
          transform: 'scale(1.5)'
        }}
      />
      
      {/* 点击波纹效果 */}
      {isAnimating && (
        <div 
          className="absolute inset-0 rounded-full animate-ping"
          style={{
            background: theme === 'light' ? '#fbbf24' : '#8b5cf6',
            opacity: 0.3
          }}
        />
      )}
    </button>
  );
} 