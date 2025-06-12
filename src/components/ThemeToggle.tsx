"use client";
import { useTheme } from '@/contexts/ThemeContext';
import { SunIcon, MoonIcon } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg border transition-colors hover:opacity-80"
      style={{ 
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-background)',
        color: 'var(--color-foreground)'
      }}
      aria-label={theme === 'light' ? '切换到暗夜模式' : '切换到亮色模式'}
    >
      {theme === 'light' ? (
        <MoonIcon className="w-5 h-5" />
      ) : (
        <SunIcon className="w-5 h-5 text-yellow-500" />
      )}
    </button>
  );
} 