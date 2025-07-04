"use client";
import { useTheme } from '@/contexts/ThemeContext';
import { SunIcon, MoonIcon } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full transition-all duration-300 hover:bg-secondary"
      style={{ 
        color: 'var(--color-foreground)'
      }}
      aria-label={theme === 'light' ? '切换到暗夜模式' : '切换到亮色模式'}
    >
      {theme === 'light' ? (
        <MoonIcon className="w-[18px] h-[18px]" />
      ) : (
        <SunIcon className="w-[18px] h-[18px] text-yellow-400" />
      )}
    </button>
  );
} 