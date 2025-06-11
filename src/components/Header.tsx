"use client";
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-sm border-b" style={{ 
      backgroundColor: 'var(--color-background)', 
      borderColor: 'var(--color-border)',
      opacity: '0.95'
    }}>
      <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold transition-colors hover:opacity-80" style={{ 
          color: 'var(--color-foreground)' 
        }}>
          rshan&apos;s blog
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
} 