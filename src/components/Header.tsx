"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`sticky top-0 z-50 backdrop-blur-md transition-all duration-300 ${
        scrolled ? 'shadow-sm' : ''
      }`}
      style={{ 
        backgroundColor: scrolled 
          ? 'var(--color-background)' 
          : 'rgba(var(--color-background-rgb), 0.8)', 
        borderBottom: scrolled 
          ? '1px solid var(--color-border)' 
          : 'none'
      }}
    >
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-xl font-bold transition-colors hover:opacity-80" style={{ 
            color: 'var(--color-foreground)' 
          }}>
            <span className="text-primary">R</span>shan<span className="text-primary">.</span>
          </Link>
        </div>
        
        <nav className="hidden md:flex items-center gap-6">
          <Link 
            href="/" 
            className="text-sm font-medium transition-colors hover:text-primary"
            style={{ color: 'var(--color-muted)' }}
          >
            首页
          </Link>
          <Link 
            href="/about" 
            className="text-sm font-medium transition-colors hover:text-primary"
            style={{ color: 'var(--color-muted)' }}
          >
            关于
          </Link>
          <Link 
            href="/projects" 
            className="text-sm font-medium transition-colors hover:text-primary"
            style={{ color: 'var(--color-muted)' }}
          >
            项目
          </Link>
          <ThemeToggle />
        </nav>

        <div className="md:hidden flex items-center">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
} 